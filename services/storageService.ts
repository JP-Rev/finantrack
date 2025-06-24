import { Account, Category, Subcategory, Movement, InstallmentPlan, MovementType, AccountType, Currency } from '../types';
import { LOCAL_STORAGE_KEYS } from '../constants';
import { generateId } from '../utils/idGenerator';
import { addMonthsToDate, getCurrentDateISO } from '../utils/dateUtils';

type StoreName = typeof LOCAL_STORAGE_KEYS[keyof typeof LOCAL_STORAGE_KEYS];

const getStore = <T,>(storeName: StoreName): T[] => {
  const data = localStorage.getItem(storeName);
  return data ? JSON.parse(data) : [];
};

const saveStore = <T,>(storeName: StoreName, data: T[]): void => {
  localStorage.setItem(storeName, JSON.stringify(data));
};

export const storageService = {
  getAll: <T,>(storeName: StoreName): Promise<T[]> => {
    return Promise.resolve(getStore<T>(storeName));
  },

  getById: <T extends { id: string },>(storeName: StoreName, id: string): Promise<T | undefined> => {
    const items = getStore<T>(storeName);
    return Promise.resolve(items.find(item => item.id === id));
  },

  add: <T extends { id: string; createdAt: string },>(storeName: StoreName, itemData: Omit<T, 'id' | 'createdAt'>): Promise<T> => {
    const items = getStore<T>(storeName);
    const newItem = {
      ...itemData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    } as T;
    items.push(newItem);
    saveStore(storeName, items);
    return Promise.resolve(newItem);
  },

  update: <T extends { id: string },>(storeName: StoreName, updatedItem: T): Promise<T> => {
    let items = getStore<T>(storeName);
    items = items.map(item => item.id === updatedItem.id ? updatedItem : item);
    saveStore(storeName, items);
    return Promise.resolve(updatedItem);
  },

  deleteById: (storeName: StoreName, id: string): Promise<void> => {
    let items = getStore<{ id: string }>(storeName);
    items = items.filter(item => item.id !== id);
    saveStore(storeName, items);
    return Promise.resolve();
  },

  addTransferMovement: async (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date: string,
    description: string
  ): Promise<{ expenseMovement: Movement, incomeMovement: Movement }> => {
    const accounts = getStore<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS);
    const fromAccount = accounts.find(acc => acc.id === fromAccountId);
    const toAccount = accounts.find(acc => acc.id === toAccountId);

    if (!fromAccount || !toAccount) {
      throw new Error("Una o ambas cuentas no fueron encontradas para la transferencia.");
    }
    if (fromAccount.id === toAccount.id) {
        throw new Error("No se puede transferir a la misma cuenta.");
    }

    const transferId = generateId(); // Common ID for both parts of the transfer

    const expenseMovementData: Omit<Movement, 'id' | 'createdAt'> = {
      type: MovementType.EXPENSE,
      date,
      amount,
      description: `Transferencia a ${toAccount.name}${description ? `: ${description}` : ''}`,
      accountId: fromAccountId,
      relatedTransferId: transferId,
    };
    const expenseMovement = await storageService.add<Movement>(LOCAL_STORAGE_KEYS.MOVEMENTS, expenseMovementData);

    const incomeMovementData: Omit<Movement, 'id' | 'createdAt'> = {
      type: MovementType.INCOME,
      date,
      amount,
      description: `Transferencia desde ${fromAccount.name}${description ? `: ${description}` : ''}`,
      accountId: toAccountId,
      relatedTransferId: transferId,
    };
    const incomeMovement = await storageService.add<Movement>(LOCAL_STORAGE_KEYS.MOVEMENTS, incomeMovementData);
    
    // Update balances
    const updatedFromAccount = { ...fromAccount, balance: fromAccount.balance - amount };
    const updatedToAccount = { ...toAccount, balance: toAccount.balance + amount };
    
    let allAccounts = getStore<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS);
    allAccounts = allAccounts.map(acc => {
        if (acc.id === fromAccountId) return updatedFromAccount;
        if (acc.id === toAccountId) return updatedToAccount;
        return acc;
    });
    saveStore(LOCAL_STORAGE_KEYS.ACCOUNTS, allAccounts);

    return { expenseMovement, incomeMovement };
  },

  // Specific logic for installments
  addMovementWithInstallments: async (
    movementBase: Omit<Movement, 'id' | 'createdAt' | 'installmentPlanId' | 'installmentNumber' | 'amount'>,
    totalAmount: number,
    numberOfInstallments: number,
    installmentStartDate: string, // This is crucial for the plan's start
    descriptionBase: string, // Base description for the plan
    cardAccount: Account
  ): Promise<{plan: InstallmentPlan, movements: Movement[]}> => {
    if (cardAccount.type !== AccountType.CARD || movementBase.type !== MovementType.EXPENSE) {
      throw new Error("Las cuotas son solo para movimientos de gasto en cuentas de tarjeta.");
    }
    if (numberOfInstallments <= 1) {
        const singleMovement = await storageService.add<Movement>(LOCAL_STORAGE_KEYS.MOVEMENTS, {
            ...movementBase, 
            date: movementBase.date, 
            amount: totalAmount,
            description: descriptionBase, // Use the provided description
        });
        return { plan: {} as InstallmentPlan, movements: [singleMovement] };
    }

    const installmentAmount = parseFloat((totalAmount / numberOfInstallments).toFixed(2));

    const planData: Omit<InstallmentPlan, 'id' | 'createdAt'> = {
      startDate: installmentStartDate,
      installmentAmount,
      numberOfInstallments,
      description: descriptionBase, // Store the base description in the plan
      accountId: movementBase.accountId,
    };
    const newPlan = await storageService.add<InstallmentPlan>(LOCAL_STORAGE_KEYS.INSTALLMENT_PLANS, planData);

    const createdMovements: Movement[] = [];
    for (let i = 0; i < numberOfInstallments; i++) {
      const movementDate = addMonthsToDate(installmentStartDate, i);
      const movementData: Omit<Movement, 'id' | 'createdAt'> = {
        ...movementBase, 
        date: movementDate, 
        amount: installmentAmount,
        description: `${descriptionBase} (Cuota ${i + 1}/${numberOfInstallments})`,
        installmentPlanId: newPlan.id,
        installmentNumber: i + 1,
      };
      const newMovement = await storageService.add<Movement>(LOCAL_STORAGE_KEYS.MOVEMENTS, movementData);
      createdMovements.push(newMovement);
    }
    return { plan: newPlan, movements: createdMovements };
  },
};

// Initialize with some seed data if stores are empty
const seedData = async () => {
    const accounts = await storageService.getAll<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS);
    if (accounts.length === 0) {
        await storageService.add<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS, { name: 'Efectivo ARS', type: AccountType.CASH, currency: Currency.ARS, balance: 10000 });
        await storageService.add<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS, { name: 'Tarjeta de Crédito XYZ', type: AccountType.CARD, currency: Currency.ARS, balance: 0 });
        await storageService.add<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS, { name: 'Ahorros USD', type: AccountType.USD, currency: Currency.USD, balance: 500 });
    }

    let foodCat: Category | undefined, transportCat: Category | undefined, salaryCat: Category | undefined;
    const categories = await storageService.getAll<Category>(LOCAL_STORAGE_KEYS.CATEGORIES);
    if (categories.length === 0) {
        foodCat = await storageService.add<Category>(LOCAL_STORAGE_KEYS.CATEGORIES, { name: 'Comida' });
        transportCat = await storageService.add<Category>(LOCAL_STORAGE_KEYS.CATEGORIES, { name: 'Transporte' });
        salaryCat = await storageService.add<Category>(LOCAL_STORAGE_KEYS.CATEGORIES, { name: 'Salario' });
        await storageService.add<Category>(LOCAL_STORAGE_KEYS.CATEGORIES, { name: 'Transferencias' }); // For self-reference, usually not selected by user
    } else {
        foodCat = categories.find(c => c.name === 'Comida');
        transportCat = categories.find(c => c.name === 'Transporte');
        salaryCat = categories.find(c => c.name === 'Salario');
    }

    const subcategories = await storageService.getAll<Subcategory>(LOCAL_STORAGE_KEYS.SUBCATEGORIES);
    if (subcategories.length === 0) {
        if (foodCat) {
            await storageService.add<Subcategory>(LOCAL_STORAGE_KEYS.SUBCATEGORIES, { name: 'Supermercado', categoryId: foodCat.id });
            await storageService.add<Subcategory>(LOCAL_STORAGE_KEYS.SUBCATEGORIES, { name: 'Restaurantes', categoryId: foodCat.id });
        }
        if (transportCat) {
            await storageService.add<Subcategory>(LOCAL_STORAGE_KEYS.SUBCATEGORIES, { name: 'Combustible', categoryId: transportCat.id });
        }
    }
     
    const movements = await storageService.getAll<Movement>(LOCAL_STORAGE_KEYS.MOVEMENTS);
    if (movements.length === 0) {
        const allAccounts = await storageService.getAll<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS);
        const allSubcategories = await storageService.getAll<Subcategory>(LOCAL_STORAGE_KEYS.SUBCATEGORIES);
        if (allAccounts.length > 0 && allSubcategories.length > 0) {
            const groceriesSubcat = allSubcategories.find(sc => sc.name === 'Supermercado');
            if (groceriesSubcat) {
                 await storageService.add<Movement>(LOCAL_STORAGE_KEYS.MOVEMENTS, {
                    type: MovementType.EXPENSE,
                    date: getCurrentDateISO(),
                    amount: 1500,
                    description: 'Compras semanales',
                    accountId: allAccounts[0].id, // Efectivo ARS
                    subcategoryId: groceriesSubcat.id, 
                });
            }
            if (salaryCat) {
                 await storageService.add<Movement>(LOCAL_STORAGE_KEYS.MOVEMENTS, {
                    type: MovementType.INCOME,
                    date: getCurrentDateISO(),
                    amount: 75000,
                    description: 'Salario mensual',
                    accountId: allAccounts[0].id, // Efectivo ARS
                    subcategoryId: salaryCat.id, // Directly using category ID for Salary Income
                });
            }
        }
    }
};

seedData();

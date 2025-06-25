import { supabaseService } from './supabaseService';
import { Account, Category, Subcategory, Movement, InstallmentPlan, MovementType, AccountType, Currency } from '../types';
import { getCurrentDateISO } from '../utils/dateUtils';

// Adaptador que mantiene la misma interfaz que el servicio original
// pero usa Supabase en lugar de localStorage
export const storageService = {
  async getAll<T>(storeName: string): Promise<T[]> {
    try {
      switch (storeName) {
        case 'finantrack_accounts':
          return supabaseService.getAccounts() as Promise<T[]>;
        case 'finantrack_categories':
          return supabaseService.getCategories() as Promise<T[]>;
        case 'finantrack_subcategories':
          return supabaseService.getSubcategories() as Promise<T[]>;
        case 'finantrack_movements':
          return supabaseService.getMovements() as Promise<T[]>;
        case 'finantrack_installment_plans':
          return supabaseService.getInstallmentPlans() as Promise<T[]>;
        default:
          throw new Error(`Store ${storeName} not supported`);
      }
    } catch (error) {
      console.error(`Error in getAll for ${storeName}:`, error);
      throw error;
    }
  },

  async getById<T extends { id: string }>(storeName: string, id: string): Promise<T | undefined> {
    try {
      switch (storeName) {
        case 'finantrack_accounts':
          const account = await supabaseService.getAccountById(id);
          return account as T | undefined;
        case 'finantrack_movements':
          const movement = await supabaseService.getMovementById(id);
          return movement as T | undefined;
        default:
          // Para otros tipos, buscar en la lista completa
          const items = await this.getAll<T>(storeName);
          return items.find(item => item.id === id);
      }
    } catch (error) {
      console.error(`Error in getById for ${storeName}:`, error);
      throw error;
    }
  },

  async add<T extends { id: string; createdAt: string }>(storeName: string, itemData: Omit<T, 'id' | 'createdAt'>): Promise<T> {
    try {
      switch (storeName) {
        case 'finantrack_accounts':
          return supabaseService.createAccount(itemData as any) as Promise<T>;
        case 'finantrack_categories':
          return supabaseService.createCategory(itemData as any) as Promise<T>;
        case 'finantrack_subcategories':
          return supabaseService.createSubcategory(itemData as any) as Promise<T>;
        case 'finantrack_movements':
          return supabaseService.createMovement(itemData as any) as Promise<T>;
        case 'finantrack_installment_plans':
          return supabaseService.createInstallmentPlan(itemData as any) as Promise<T>;
        default:
          throw new Error(`Store ${storeName} not supported`);
      }
    } catch (error) {
      console.error(`Error in add for ${storeName}:`, error);
      throw error;
    }
  },

  async update<T extends { id: string }>(storeName: string, updatedItem: T): Promise<T> {
    try {
      switch (storeName) {
        case 'finantrack_accounts':
          return supabaseService.updateAccount(updatedItem as any) as Promise<T>;
        case 'finantrack_categories':
          return supabaseService.updateCategory(updatedItem as any) as Promise<T>;
        case 'finantrack_subcategories':
          return supabaseService.updateSubcategory(updatedItem as any) as Promise<T>;
        case 'finantrack_movements':
          return supabaseService.updateMovement(updatedItem as any) as Promise<T>;
        default:
          throw new Error(`Store ${storeName} not supported`);
      }
    } catch (error) {
      console.error(`Error in update for ${storeName}:`, error);
      throw error;
    }
  },

  async deleteById(storeName: string, id: string): Promise<void> {
    try {
      switch (storeName) {
        case 'finantrack_accounts':
          return supabaseService.deleteAccount(id);
        case 'finantrack_categories':
          return supabaseService.deleteCategory(id);
        case 'finantrack_subcategories':
          return supabaseService.deleteSubcategory(id);
        case 'finantrack_movements':
          return supabaseService.deleteMovement(id);
        default:
          throw new Error(`Store ${storeName} not supported`);
      }
    } catch (error) {
      console.error(`Error in deleteById for ${storeName}:`, error);
      throw error;
    }
  },

  // Métodos específicos que delegan a supabaseService
  async addTransferMovement(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date: string,
    description: string
  ): Promise<{ expenseMovement: Movement, incomeMovement: Movement }> {
    try {
      return supabaseService.addTransferMovement(fromAccountId, toAccountId, amount, date, description);
    } catch (error) {
      console.error('Error in addTransferMovement:', error);
      throw error;
    }
  },

  async addMovementWithInstallments(
    movementBase: Omit<Movement, 'id' | 'createdAt' | 'installmentPlanId' | 'installmentNumber' | 'amount'>,
    totalAmount: number,
    numberOfInstallments: number,
    installmentStartDate: string,
    descriptionBase: string,
    cardAccount: Account
  ): Promise<{plan: InstallmentPlan, movements: Movement[]}> {
    try {
      return supabaseService.addMovementWithInstallments(
        movementBase,
        totalAmount,
        numberOfInstallments,
        installmentStartDate,
        descriptionBase,
        cardAccount
      );
    } catch (error) {
      console.error('Error in addMovementWithInstallments:', error);
      throw error;
    }
  },
};

// Función para inicializar datos de ejemplo (solo si no existen)
export const initializeData = async () => {
  try {
    // Verificar si ya existen datos
    const accounts = await supabaseService.getAccounts();
    if (accounts.length > 0) {
      return; // Ya hay datos, no inicializar
    }

    console.log('Inicializando datos de ejemplo...');

    // Crear cuentas de ejemplo
    const cashAccount = await supabaseService.createAccount({
      name: 'Efectivo ARS',
      type: AccountType.CASH,
      currency: Currency.ARS,
      balance: 10000,
    });

    await supabaseService.createAccount({
      name: 'Tarjeta de Crédito XYZ',
      type: AccountType.CARD,
      currency: Currency.ARS,
      balance: 0,
    });

    await supabaseService.createAccount({
      name: 'Ahorros USD',
      type: AccountType.USD,
      currency: Currency.USD,
      balance: 500,
    });

    // Crear algunos movimientos de ejemplo
    const categories = await supabaseService.getCategories();
    const subcategories = await supabaseService.getSubcategories();
    
    const salaryCategory = categories.find(c => c.name === 'Salario');
    const groceriesSubcategory = subcategories.find(s => s.name === 'Supermercado');

    if (salaryCategory) {
      await supabaseService.createMovement({
        type: MovementType.INCOME,
        date: getCurrentDateISO(),
        amount: 75000,
        description: 'Salario mensual',
        accountId: cashAccount.id,
        subcategoryId: salaryCategory.id,
      });
    }

    if (groceriesSubcategory) {
      await supabaseService.createMovement({
        type: MovementType.EXPENSE,
        date: getCurrentDateISO(),
        amount: 1500,
        description: 'Compras semanales',
        accountId: cashAccount.id,
        subcategoryId: groceriesSubcategory.id,
      });
    }

    console.log('Datos de ejemplo inicializados correctamente');

  } catch (error) {
    console.error('Error initializing data:', error);
    // No lanzar el error para que la app pueda continuar funcionando
  }
};
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { Account, Category, Subcategory, Movement, InstallmentPlan, MovementType, AccountType } from '../types';
import { addMonthsToDate, getCurrentDateISO } from '../utils/dateUtils';
import { generateId } from '../utils/idGenerator';

type Tables = Database['public']['Tables'];

// Mapeo de tipos de la aplicación a tipos de base de datos
const mapAccountTypeToDb = (type: AccountType): Tables['accounts']['Row']['type'] => {
  switch (type) {
    case AccountType.CASH: return 'efectivo';
    case AccountType.CARD: return 'tarjeta';
    case AccountType.USD: return 'usd';
    case AccountType.OTHER: return 'otro';
    default: return 'efectivo';
  }
};

const mapAccountTypeFromDb = (type: Tables['accounts']['Row']['type']): AccountType => {
  switch (type) {
    case 'efectivo': return AccountType.CASH;
    case 'tarjeta': return AccountType.CARD;
    case 'usd': return AccountType.USD;
    case 'otro': return AccountType.OTHER;
    default: return AccountType.CASH;
  }
};

const mapMovementTypeToDb = (type: MovementType): Tables['movements']['Row']['type'] => {
  return type === MovementType.INCOME ? 'ingreso' : 'gasto';
};

const mapMovementTypeFromDb = (type: Tables['movements']['Row']['type']): MovementType => {
  return type === 'ingreso' ? MovementType.INCOME : MovementType.EXPENSE;
};

// Convertir datos de Supabase a tipos de la aplicación
const mapAccountFromDb = (dbAccount: Tables['accounts']['Row']): Account => ({
  id: dbAccount.id,
  name: dbAccount.name,
  type: mapAccountTypeFromDb(dbAccount.type),
  currency: dbAccount.currency as any,
  balance: Number(dbAccount.balance),
  createdAt: dbAccount.created_at,
});

const mapCategoryFromDb = (dbCategory: Tables['categories']['Row']): Category => ({
  id: dbCategory.id,
  name: dbCategory.name,
  createdAt: dbCategory.created_at,
});

const mapSubcategoryFromDb = (dbSubcategory: Tables['subcategories']['Row']): Subcategory => ({
  id: dbSubcategory.id,
  name: dbSubcategory.name,
  categoryId: dbSubcategory.category_id,
  createdAt: dbSubcategory.created_at,
});

const mapMovementFromDb = (dbMovement: Tables['movements']['Row']): Movement => ({
  id: dbMovement.id,
  type: mapMovementTypeFromDb(dbMovement.type),
  date: dbMovement.date,
  amount: Number(dbMovement.amount),
  description: dbMovement.description,
  accountId: dbMovement.account_id,
  subcategoryId: dbMovement.subcategory_id || undefined,
  installmentPlanId: dbMovement.installment_plan_id || undefined,
  installmentNumber: dbMovement.installment_number || undefined,
  relatedTransferId: dbMovement.related_transfer_id || undefined,
  createdAt: dbMovement.created_at,
});

const mapInstallmentPlanFromDb = (dbPlan: Tables['installment_plans']['Row']): InstallmentPlan => ({
  id: dbPlan.id,
  startDate: dbPlan.start_date,
  installmentAmount: Number(dbPlan.installment_amount),
  numberOfInstallments: dbPlan.number_of_installments,
  description: dbPlan.description,
  accountId: dbPlan.account_id,
  createdAt: dbPlan.created_at,
});

export const supabaseService = {
  // Cuentas
  async getAccounts(): Promise<Account[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data.map(mapAccountFromDb);
  },

  async getAccountById(id: string): Promise<Account | null> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return mapAccountFromDb(data);
  },

  async createAccount(account: Omit<Account, 'id' | 'createdAt'>): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        name: account.name,
        type: mapAccountTypeToDb(account.type),
        currency: account.currency,
        balance: account.balance,
      })
      .select()
      .single();
    
    if (error) throw error;
    return mapAccountFromDb(data);
  },

  async updateAccount(account: Account): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .update({
        name: account.name,
        type: mapAccountTypeToDb(account.type),
        currency: account.currency,
        balance: account.balance,
      })
      .eq('id', account.id)
      .select()
      .single();
    
    if (error) throw error;
    return mapAccountFromDb(data);
  },

  async deleteAccount(id: string): Promise<void> {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Categorías
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data.map(mapCategoryFromDb);
  },

  async createCategory(category: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: category.name })
      .select()
      .single();
    
    if (error) throw error;
    return mapCategoryFromDb(data);
  },

  async updateCategory(category: Category): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update({ name: category.name })
      .eq('id', category.id)
      .select()
      .single();
    
    if (error) throw error;
    return mapCategoryFromDb(data);
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Subcategorías
  async getSubcategories(): Promise<Subcategory[]> {
    const { data, error } = await supabase
      .from('subcategories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data.map(mapSubcategoryFromDb);
  },

  async createSubcategory(subcategory: Omit<Subcategory, 'id' | 'createdAt'>): Promise<Subcategory> {
    const { data, error } = await supabase
      .from('subcategories')
      .insert({
        name: subcategory.name,
        category_id: subcategory.categoryId,
      })
      .select()
      .single();
    
    if (error) throw error;
    return mapSubcategoryFromDb(data);
  },

  async updateSubcategory(subcategory: Subcategory): Promise<Subcategory> {
    const { data, error } = await supabase
      .from('subcategories')
      .update({
        name: subcategory.name,
        category_id: subcategory.categoryId,
      })
      .eq('id', subcategory.id)
      .select()
      .single();
    
    if (error) throw error;
    return mapSubcategoryFromDb(data);
  },

  async deleteSubcategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('subcategories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Movimientos
  async getMovements(): Promise<Movement[]> {
    const { data, error } = await supabase
      .from('movements')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data.map(mapMovementFromDb);
  },

  async getMovementById(id: string): Promise<Movement | null> {
    const { data, error } = await supabase
      .from('movements')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return mapMovementFromDb(data);
  },

  async createMovement(movement: Omit<Movement, 'id' | 'createdAt'>): Promise<Movement> {
    const { data, error } = await supabase
      .from('movements')
      .insert({
        type: mapMovementTypeToDb(movement.type),
        date: movement.date,
        amount: movement.amount,
        description: movement.description,
        account_id: movement.accountId,
        subcategory_id: movement.subcategoryId || null,
        installment_plan_id: movement.installmentPlanId || null,
        installment_number: movement.installmentNumber || null,
        related_transfer_id: movement.relatedTransferId || null,
      })
      .select()
      .single();
    
    if (error) throw error;
    return mapMovementFromDb(data);
  },

  async updateMovement(movement: Movement): Promise<Movement> {
    const { data, error } = await supabase
      .from('movements')
      .update({
        type: mapMovementTypeToDb(movement.type),
        date: movement.date,
        amount: movement.amount,
        description: movement.description,
        account_id: movement.accountId,
        subcategory_id: movement.subcategoryId || null,
        installment_plan_id: movement.installmentPlanId || null,
        installment_number: movement.installmentNumber || null,
        related_transfer_id: movement.relatedTransferId || null,
      })
      .eq('id', movement.id)
      .select()
      .single();
    
    if (error) throw error;
    return mapMovementFromDb(data);
  },

  async deleteMovement(id: string): Promise<void> {
    const { error } = await supabase
      .from('movements')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Planes de cuotas
  async getInstallmentPlans(): Promise<InstallmentPlan[]> {
    const { data, error } = await supabase
      .from('installment_plans')
      .select('*')
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    return data.map(mapInstallmentPlanFromDb);
  },

  async createInstallmentPlan(plan: Omit<InstallmentPlan, 'id' | 'createdAt'>): Promise<InstallmentPlan> {
    const { data, error } = await supabase
      .from('installment_plans')
      .insert({
        start_date: plan.startDate,
        installment_amount: plan.installmentAmount,
        number_of_installments: plan.numberOfInstallments,
        description: plan.description,
        account_id: plan.accountId,
      })
      .select()
      .single();
    
    if (error) throw error;
    return mapInstallmentPlanFromDb(data);
  },

  // Transferencias
  async addTransferMovement(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date: string,
    description: string
  ): Promise<{ expenseMovement: Movement, incomeMovement: Movement }> {
    const fromAccount = await this.getAccountById(fromAccountId);
    const toAccount = await this.getAccountById(toAccountId);

    if (!fromAccount || !toAccount) {
      throw new Error("Una o ambas cuentas no fueron encontradas para la transferencia.");
    }
    if (fromAccount.id === toAccount.id) {
      throw new Error("No se puede transferir a la misma cuenta.");
    }

    const transferId = generateId();

    // Crear movimiento de gasto
    const expenseMovement = await this.createMovement({
      type: MovementType.EXPENSE,
      date,
      amount,
      description: `Transferencia a ${toAccount.name}${description ? `: ${description}` : ''}`,
      accountId: fromAccountId,
      relatedTransferId: transferId,
    });

    // Crear movimiento de ingreso
    const incomeMovement = await this.createMovement({
      type: MovementType.INCOME,
      date,
      amount,
      description: `Transferencia desde ${fromAccount.name}${description ? `: ${description}` : ''}`,
      accountId: toAccountId,
      relatedTransferId: transferId,
    });

    // Actualizar saldos
    await this.updateAccount({
      ...fromAccount,
      balance: fromAccount.balance - amount,
    });

    await this.updateAccount({
      ...toAccount,
      balance: toAccount.balance + amount,
    });

    return { expenseMovement, incomeMovement };
  },

  // Movimientos con cuotas
  async addMovementWithInstallments(
    movementBase: Omit<Movement, 'id' | 'createdAt' | 'installmentPlanId' | 'installmentNumber' | 'amount'>,
    totalAmount: number,
    numberOfInstallments: number,
    installmentStartDate: string,
    descriptionBase: string,
    cardAccount: Account
  ): Promise<{plan: InstallmentPlan, movements: Movement[]}> {
    if (cardAccount.type !== AccountType.CARD || movementBase.type !== MovementType.EXPENSE) {
      throw new Error("Las cuotas son solo para movimientos de gasto en cuentas de tarjeta.");
    }
    
    if (numberOfInstallments <= 1) {
      const singleMovement = await this.createMovement({
        ...movementBase,
        amount: totalAmount,
        description: descriptionBase,
      });
      return { plan: {} as InstallmentPlan, movements: [singleMovement] };
    }

    const installmentAmount = parseFloat((totalAmount / numberOfInstallments).toFixed(2));

    // Crear plan de cuotas
    const newPlan = await this.createInstallmentPlan({
      startDate: installmentStartDate,
      installmentAmount,
      numberOfInstallments,
      description: descriptionBase,
      accountId: movementBase.accountId,
    });

    // Crear movimientos individuales
    const createdMovements: Movement[] = [];
    for (let i = 0; i < numberOfInstallments; i++) {
      const movementDate = addMonthsToDate(installmentStartDate, i);
      const movement = await this.createMovement({
        ...movementBase,
        date: movementDate,
        amount: installmentAmount,
        description: `${descriptionBase} (Cuota ${i + 1}/${numberOfInstallments})`,
        installmentPlanId: newPlan.id,
        installmentNumber: i + 1,
      });
      createdMovements.push(movement);
    }

    return { plan: newPlan, movements: createdMovements };
  },
};
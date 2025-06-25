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
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching accounts:', error);
        throw new Error(`Error al obtener cuentas: ${error.message}`);
      }
      return data ? data.map(mapAccountFromDb) : [];
    } catch (error) {
      console.error('Error in getAccounts:', error);
      throw error;
    }
  },

  async getAccountById(id: string): Promise<Account | null> {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // No rows returned
        console.error('Error fetching account by id:', error);
        throw new Error(`Error al obtener cuenta: ${error.message}`);
      }
      return data ? mapAccountFromDb(data) : null;
    } catch (error) {
      console.error('Error in getAccountById:', error);
      throw error;
    }
  },

  async createAccount(account: Omit<Account, 'id' | 'createdAt'>): Promise<Account> {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          name: account.name,
          type: mapAccountTypeToDb(account.type),
          currency: account.currency,
          balance: account.balance || 0,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating account:', error);
        throw new Error(`Error al crear cuenta: ${error.message}`);
      }
      return mapAccountFromDb(data);
    } catch (error) {
      console.error('Error in createAccount:', error);
      throw error;
    }
  },

  async updateAccount(account: Account): Promise<Account> {
    try {
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
      
      if (error) {
        console.error('Error updating account:', error);
        throw new Error(`Error al actualizar cuenta: ${error.message}`);
      }
      return mapAccountFromDb(data);
    } catch (error) {
      console.error('Error in updateAccount:', error);
      throw error;
    }
  },

  async deleteAccount(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting account:', error);
        throw new Error(`Error al eliminar cuenta: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteAccount:', error);
      throw error;
    }
  },

  // Categorías
  async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching categories:', error);
        throw new Error(`Error al obtener categorías: ${error.message}`);
      }
      return data ? data.map(mapCategoryFromDb) : [];
    } catch (error) {
      console.error('Error in getCategories:', error);
      throw error;
    }
  },

  async createCategory(category: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({ name: category.name })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating category:', error);
        throw new Error(`Error al crear categoría: ${error.message}`);
      }
      return mapCategoryFromDb(data);
    } catch (error) {
      console.error('Error in createCategory:', error);
      throw error;
    }
  },

  async updateCategory(category: Category): Promise<Category> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update({ name: category.name })
        .eq('id', category.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating category:', error);
        throw new Error(`Error al actualizar categoría: ${error.message}`);
      }
      return mapCategoryFromDb(data);
    } catch (error) {
      console.error('Error in updateCategory:', error);
      throw error;
    }
  },

  async deleteCategory(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting category:', error);
        throw new Error(`Error al eliminar categoría: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteCategory:', error);
      throw error;
    }
  },

  // Subcategorías
  async getSubcategories(): Promise<Subcategory[]> {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching subcategories:', error);
        throw new Error(`Error al obtener subcategorías: ${error.message}`);
      }
      return data ? data.map(mapSubcategoryFromDb) : [];
    } catch (error) {
      console.error('Error in getSubcategories:', error);
      throw error;
    }
  },

  async createSubcategory(subcategory: Omit<Subcategory, 'id' | 'createdAt'>): Promise<Subcategory> {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .insert({
          name: subcategory.name,
          category_id: subcategory.categoryId,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating subcategory:', error);
        throw new Error(`Error al crear subcategoría: ${error.message}`);
      }
      return mapSubcategoryFromDb(data);
    } catch (error) {
      console.error('Error in createSubcategory:', error);
      throw error;
    }
  },

  async updateSubcategory(subcategory: Subcategory): Promise<Subcategory> {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .update({
          name: subcategory.name,
          category_id: subcategory.categoryId,
        })
        .eq('id', subcategory.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating subcategory:', error);
        throw new Error(`Error al actualizar subcategoría: ${error.message}`);
      }
      return mapSubcategoryFromDb(data);
    } catch (error) {
      console.error('Error in updateSubcategory:', error);
      throw error;
    }
  },

  async deleteSubcategory(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting subcategory:', error);
        throw new Error(`Error al eliminar subcategoría: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteSubcategory:', error);
      throw error;
    }
  },

  // Movimientos
  async getMovements(): Promise<Movement[]> {
    try {
      const { data, error } = await supabase
        .from('movements')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching movements:', error);
        throw new Error(`Error al obtener movimientos: ${error.message}`);
      }
      return data ? data.map(mapMovementFromDb) : [];
    } catch (error) {
      console.error('Error in getMovements:', error);
      throw error;
    }
  },

  async getMovementById(id: string): Promise<Movement | null> {
    try {
      const { data, error } = await supabase
        .from('movements')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching movement by id:', error);
        throw new Error(`Error al obtener movimiento: ${error.message}`);
      }
      return data ? mapMovementFromDb(data) : null;
    } catch (error) {
      console.error('Error in getMovementById:', error);
      throw error;
    }
  },

  async createMovement(movement: Omit<Movement, 'id' | 'createdAt'>): Promise<Movement> {
    try {
      const { data, error } = await supabase
        .from('movements')
        .insert({
          type: mapMovementTypeToDb(movement.type),
          date: movement.date,
          amount: movement.amount,
          description: movement.description || '',
          account_id: movement.accountId,
          subcategory_id: movement.subcategoryId || null,
          installment_plan_id: movement.installmentPlanId || null,
          installment_number: movement.installmentNumber || null,
          related_transfer_id: movement.relatedTransferId || null,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating movement:', error);
        throw new Error(`Error al crear movimiento: ${error.message}`);
      }
      return mapMovementFromDb(data);
    } catch (error) {
      console.error('Error in createMovement:', error);
      throw error;
    }
  },

  async updateMovement(movement: Movement): Promise<Movement> {
    try {
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
      
      if (error) {
        console.error('Error updating movement:', error);
        throw new Error(`Error al actualizar movimiento: ${error.message}`);
      }
      return mapMovementFromDb(data);
    } catch (error) {
      console.error('Error in updateMovement:', error);
      throw error;
    }
  },

  async deleteMovement(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('movements')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting movement:', error);
        throw new Error(`Error al eliminar movimiento: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteMovement:', error);
      throw error;
    }
  },

  // Planes de cuotas
  async getInstallmentPlans(): Promise<InstallmentPlan[]> {
    try {
      const { data, error } = await supabase
        .from('installment_plans')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching installment plans:', error);
        throw new Error(`Error al obtener planes de cuotas: ${error.message}`);
      }
      return data ? data.map(mapInstallmentPlanFromDb) : [];
    } catch (error) {
      console.error('Error in getInstallmentPlans:', error);
      throw error;
    }
  },

  async createInstallmentPlan(plan: Omit<InstallmentPlan, 'id' | 'createdAt'>): Promise<InstallmentPlan> {
    try {
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
      
      if (error) {
        console.error('Error creating installment plan:', error);
        throw new Error(`Error al crear plan de cuotas: ${error.message}`);
      }
      return mapInstallmentPlanFromDb(data);
    } catch (error) {
      console.error('Error in createInstallmentPlan:', error);
      throw error;
    }
  },

  // Transferencias
  async addTransferMovement(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date: string,
    description: string
  ): Promise<{ expenseMovement: Movement, incomeMovement: Movement }> {
    try {
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
    } catch (error) {
      console.error('Error in addTransferMovement:', error);
      throw error;
    }
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
    try {
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
    } catch (error) {
      console.error('Error in addMovementWithInstallments:', error);
      throw error;
    }
  },
};
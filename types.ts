export enum AccountType {
  CASH = 'efectivo',
  CARD = 'tarjeta',
  USD = 'usd',
  OTHER = 'otro',
}

export enum MovementType {
  INCOME = 'ingreso',
  EXPENSE = 'gasto',
  // TRANSFER = 'transferencia', // conceptually a transfer, results in an INCOMCE and EXPENSE
}

export enum Currency {
  ARS = 'ARS',
  USD = 'USD',
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balance: number; // Calculated or stored, for simplicity can be manually managed
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
  createdAt: string;
}

export interface Movement {
  id: string;
  type: MovementType;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  accountId: string;
  subcategoryId?: string; // Optional for simplicity, or make it mandatory
  installmentPlanId?: string;
  installmentNumber?: number;
  relatedTransferId?: string; // To link the two parts of a transfer
  createdAt: string;
}

export interface InstallmentPlan {
  id: string;
  startDate: string; // YYYY-MM-DD
  installmentAmount: number;
  numberOfInstallments: number;
  description: string;
  accountId: string; // The card account used for this plan
  originalMovementId?: string; // Optional: link to an initial movement if needed
  createdAt: string;
}

// Props for form inputs, etc.
export interface Option {
  value: string;
  label: string;
}
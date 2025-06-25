import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../../services/storageService';
import { Account, Category, Subcategory, MovementType, AccountType, Option, Movement } from '../../types';
import { LOCAL_STORAGE_KEYS } from '../../constants';
import { getCurrentDateISO } from '../../utils/dateUtils';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';

type TransactionOperationType = MovementType | 'transfer';

const AddTransactionPage: React.FC = () => {
  const navigate = useNavigate();
  const [operationType, setOperationType] = useState<TransactionOperationType>(MovementType.EXPENSE);
  const [date, setDate] = useState<string>(getCurrentDateISO());
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  
  const [accountId, setAccountId] = useState<string>('');
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');

  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);

  const [isInstallment, setIsInstallment] = useState<boolean>(false);
  const [numberOfInstallments, setNumberOfInstallments] = useState<string>('2'); 
  const [installmentStartDate, setInstallmentStartDate] = useState<string>(getCurrentDateISO());

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const selectedAccountForInstallmentCheck = accounts.find(acc => acc.id === accountId);
  const showInstallmentOption = selectedAccountForInstallmentCheck?.type === AccountType.CARD && operationType === MovementType.EXPENSE;

  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        setIsLoading(true);
        const [accs, cats, subcats] = await Promise.all([
          storageService.getAll<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS),
          storageService.getAll<Category>(LOCAL_STORAGE_KEYS.CATEGORIES),
          storageService.getAll<Subcategory>(LOCAL_STORAGE_KEYS.SUBCATEGORIES),
        ]);
        
        setAccounts(accs);
        setCategories(cats);
        setSubcategories(subcats);
        
        if (accs.length > 0) {
            setAccountId(accs[0].id);
            setFromAccountId(accs[0].id);
            if (accs.length > 1) {
              setToAccountId(accs[1].id);
            } else if (accs.length === 1) {
               // If only one account, set toAccountId also to it, validation will prevent transfer.
              setToAccountId(accs[0].id);
            }
        }
        if (cats.length > 0) {
            const defaultCategory = cats.find(c => c.name !== 'Transferencias') || cats[0];
             if (defaultCategory) setCategoryId(defaultCategory.id);
        }
      } catch (err) {
        console.error('Error loading prerequisites:', err);
        setError('Error al cargar cuentas o categorías.');
      } finally {
        setIsLoading(false);
      }
    };
    loadPrerequisites();
  }, []);

  useEffect(() => {
    if (categoryId) {
      setFilteredSubcategories(subcategories.filter(sc => sc.categoryId === categoryId));
      setSubcategoryId(''); 
    } else {
      setFilteredSubcategories([]);
      setSubcategoryId('');
    }
  }, [categoryId, subcategories]);

  useEffect(() => {
    if (!showInstallmentOption) {
      setIsInstallment(false);
    }
  }, [showInstallmentOption, operationType]);
  
  useEffect(() => {
    if (operationType !== MovementType.EXPENSE) {
      setCategoryId('');
      setSubcategoryId('');
    } else {
        if (!categoryId && categories.length > 0) {
            const defaultExpenseCategory = categories.find(c => c.name !== 'Transferencias' && c.name !== 'Salario') || categories.find(c => c.name !== 'Transferencias') || categories[0];
            if (defaultExpenseCategory) setCategoryId(defaultExpenseCategory.id);
        }
    }
  }, [operationType, categories, categoryId]);

  const accountOptions: Option[] = accounts.map(acc => ({ value: acc.id, label: `${acc.name} (${acc.currency})` }));
  const categoryOptions: Option[] = categories.filter(c => c.name !== 'Transferencias').map(cat => ({ value: cat.id, label: cat.name }));
  const subcategoryOptions: Option[] = filteredSubcategories.map(subcat => ({ value: subcat.id, label: subcat.name }));

  const handleSelectChange = (name: string, value: string) => {
    switch(name) {
        case 'accountId': setAccountId(value); break;
        case 'fromAccountId': setFromAccountId(value); break;
        case 'toAccountId': setToAccountId(value); break;
        case 'categoryId': setCategoryId(value); break;
        case 'subcategoryId': setSubcategoryId(value); break;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('El monto debe ser un número positivo.');
      setIsLoading(false);
      return;
    }
     if (description.trim().length > 100) {
        setError('La descripción no puede exceder los 100 caracteres.');
        setIsLoading(false);
        return;
    }

    try {
      const finalDescription = description.trim();
      if (operationType === 'transfer') {
        if (!fromAccountId || !toAccountId) {
            setError("Se deben seleccionar 'Desde Cuenta' y 'Hacia Cuenta' para una transferencia.");
            setIsLoading(false);
            return;
        }
        if (fromAccountId === toAccountId) {
            setError('No se puede transferir a la misma cuenta. Por favor seleccione cuentas diferentes.');
            setIsLoading(false);
            return;
        }
        await storageService.addTransferMovement(fromAccountId, toAccountId, numericAmount, date, finalDescription);
      } else { 
        if (!accountId) {
            setError('Por favor, seleccione una cuenta.');
            setIsLoading(false);
            return;
        }
        const selectedAcc = accounts.find(a => a.id === accountId);
        if (!selectedAcc) {
            setError('Cuenta seleccionada no encontrada.');
            setIsLoading(false);
            return;
        }

        const isActualInstallmentPlan = isInstallment && showInstallmentOption && parseInt(numberOfInstallments, 10) > 1;
        const baseMovementDate = isActualInstallmentPlan ? installmentStartDate : date;
        const descriptionForPayload = finalDescription || (operationType === MovementType.EXPENSE ? "Gasto" : "Ingreso");
        
        const movementBasePayload: Omit<Movement, 'id' | 'createdAt' | 'installmentPlanId' | 'installmentNumber' | 'amount'> = {
            type: operationType as MovementType, 
            date: baseMovementDate, 
            description: descriptionForPayload,
            accountId,
            subcategoryId: (categoryId && operationType === MovementType.EXPENSE) || (categoryId && operationType === MovementType.INCOME && categories.find(c => c.id === categoryId)?.name === 'Salario') ? (subcategoryId || categoryId) : undefined,
        };

        if (isActualInstallmentPlan) {
            const planDescription = finalDescription || (operationType === MovementType.EXPENSE ? "Gasto en cuotas" : "Ingreso en cuotas");
            await storageService.addMovementWithInstallments(
              movementBasePayload,
              numericAmount,
              parseInt(numberOfInstallments, 10),
              installmentStartDate, 
              planDescription,
              selectedAcc
            );
        } else {
            const singleMovementData: Omit<Movement, 'id' | 'createdAt'> = {
              type: operationType as MovementType,
              date: date, 
              amount: numericAmount,
              description: descriptionForPayload,
              accountId,
              subcategoryId: (categoryId && operationType === MovementType.EXPENSE) || (categoryId && operationType === MovementType.INCOME && categories.find(c => c.id === categoryId)?.name === 'Salario') ? (subcategoryId || categoryId) : undefined,
            };
            await storageService.add<Movement>(LOCAL_STORAGE_KEYS.MOVEMENTS, singleMovementData);
            
            // Actualizar saldo de la cuenta
            const currentAccount = accounts.find(a => a.id === accountId);
            if (currentAccount) {
                const newBalance = operationType === MovementType.INCOME 
                ? currentAccount.balance + numericAmount 
                : currentAccount.balance - numericAmount;
                await storageService.update<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS, {...currentAccount, balance: newBalance});
            }
        }
      }
      navigate('/transactions');
    } catch (err: any) {
      console.error('Error adding transaction:', err);
      setError(`Error al agregar transacción: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const numInstallmentsVal = parseInt(numberOfInstallments, 10);
  const totalAmountVal = parseFloat(amount || '0');
  const installmentValueDisplay = (numInstallmentsVal > 0 && totalAmountVal > 0) ? (totalAmountVal / numInstallmentsVal).toFixed(2) : '0.00';

  return (
    <div className="max-w-2xl mx-auto bg-card-bg p-6 md:p-8 rounded-lg shadow-xl text-text-principal">
      <h1 className="text-2xl font-bold text-primary mb-6">Agregar Nueva Transacción</h1>
      {error && <div className="mb-4 p-3 bg-danger/10 text-danger rounded-md">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Tipo</label>
          <div className="grid grid-cols-3 gap-2">
            <Button type="button" variant={operationType === MovementType.INCOME ? 'success' : 'secondary'} onClick={() => setOperationType(MovementType.INCOME)} className="w-full">Ingreso</Button>
            <Button type="button" variant={operationType === MovementType.EXPENSE ? 'danger' : 'secondary'} onClick={() => setOperationType(MovementType.EXPENSE)} className="w-full">Gasto</Button>
            <Button type="button" variant={operationType === 'transfer' ? 'primary' : 'secondary'} onClick={() => setOperationType('transfer')} className="w-full">Transferencia</Button>
          </div>
        </div>

        <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <Input label="Monto" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" step="0.01" required />
        
        {operationType === 'transfer' ? (
            <>
                <Select label="Desde Cuenta" name="fromAccountId" value={fromAccountId} onChange={handleSelectChange} options={accountOptions} required />
                <Select label="Hacia Cuenta" name="toAccountId" value={toAccountId} onChange={handleSelectChange} options={accountOptions.filter(opt => opt.value !== fromAccountId)} required placeholder="Seleccionar cuenta destino" />
                {accounts.length < 2 && <p className="text-xs text-danger">Necesitas al menos dos cuentas para realizar una transferencia.</p>}
                 {fromAccountId === toAccountId && accounts.length >=2 && <p className="text-xs text-danger">La cuenta de origen y destino no pueden ser la misma.</p>}
            </>
        ) : (
            <>
                <Select label="Cuenta" name="accountId" value={accountId} onChange={handleSelectChange} options={accountOptions} required />
                {operationType === MovementType.EXPENSE && (
                  <>
                    <Select label="Categoría" name="categoryId" value={categoryId} onChange={handleSelectChange} options={categoryOptions} placeholder="Seleccionar categoría" required/>
                    {categoryId && filteredSubcategories.length > 0 && (
                      <Select label="Subcategoría (Opcional)" name="subcategoryId" value={subcategoryId} onChange={handleSelectChange} options={subcategoryOptions} placeholder="Seleccionar subcategoría"/>
                    )}
                  </>
                )}
                 {operationType === MovementType.INCOME && ( 
                    <Select 
                        label="Categoría (Ej: Salario)"
                        name="categoryId" value={categoryId}
                        onChange={handleSelectChange}
                        options={categoryOptions.filter(c => c.label === "Salario")} // Assuming "Salario" is a main category for income
                        placeholder="Seleccionar categoría (Salario)"
                        // required // Make it optional or specific as needed for income
                        disabled={isLoading}
                    />
                )}
            </>
        )}

        {/* Conditional rendering for installments */}
        {showInstallmentOption && operationType === MovementType.EXPENSE && (
          <div className="space-y-4 p-4 border border-border-color rounded-md bg-secondary/30">
            <div className="flex items-center">
              <input 
                id="isInstallment" 
                type="checkbox" 
                checked={isInstallment} 
                onChange={(e) => setIsInstallment(e.target.checked)}
                className="h-4 w-4 text-primary border-input-border rounded focus:ring-primary"
              />
              <label htmlFor="isInstallment" className="ml-2 block text-sm font-medium text-text-secondary">¿Es en cuotas?</label>
            </div>
            {isInstallment && (
              <>
                <Input 
                  label="Número de Cuotas" 
                  type="number" 
                  value={numberOfInstallments} 
                  onChange={(e) => setNumberOfInstallments(e.target.value)} 
                  min="2" 
                  step="1" 
                  required 
                />
                <Input 
                  label="Fecha de Inicio de Cuotas" 
                  type="date" 
                  value={installmentStartDate} 
                  onChange={(e) => setInstallmentStartDate(e.target.value)} 
                  required 
                />
                <p className="text-sm text-text-secondary">
                    Valor por cuota: ${installmentValueDisplay}
                </p>
              </>
            )}
          </div>
        )}

        <Input 
          label="Descripción (Opcional)" 
          type="text" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          placeholder={operationType === 'transfer' ? 'Ej: Ahorros mensuales' : (operationType === MovementType.EXPENSE ? 'Ej: Compras supermercado' : 'Ej: Salario mensual')}
          maxLength={100}
        />

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/transactions')} disabled={isLoading}>Cancelar</Button>
          <Button type="submit" variant="primary" isLoading={isLoading} disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Transacción'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddTransactionPage;
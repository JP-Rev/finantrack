
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { storageService } from '../../services/storageService';
import { Account, Category, Subcategory, MovementType, Option, Movement } from '../../types';
import { LOCAL_STORAGE_KEYS } from '../../constants';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import LoadingSpinner from '../common/LoadingSpinner';

const EditTransactionPage: React.FC = () => {
  const navigate = useNavigate();
  const { transactionId } = useParams<{ transactionId: string }>();

  const [originalMovement, setOriginalMovement] = useState<Movement | null>(null);
  const [operationType, setOperationType] = useState<MovementType>(MovementType.EXPENSE); // Cannot be changed for existing
  const [date, setDate] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  
  const [accountId, setAccountId] = useState<string>(''); // Cannot be changed for existing
  const [accountName, setAccountName] = useState<string>(''); // For display

  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');

  const [accounts, setAccounts] = useState<Account[]>([]); // Only for display of selected account name
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Installment and transfer fields are not editable here for simplicity
  const isPartOfInstallmentPlan = originalMovement?.installmentPlanId;
  const isPartOfTransfer = originalMovement?.relatedTransferId;

  useEffect(() => {
    const loadTransactionAndPrerequisites = async () => {
      setIsLoading(true);
      setError('');
      if (!transactionId) {
        setError('ID de transacción no encontrado.');
        setIsLoading(false);
        return;
      }

      try {
        const [mov, accs, cats, subcats] = await Promise.all([
          storageService.getById<Movement>(LOCAL_STORAGE_KEYS.MOVEMENTS, transactionId),
          storageService.getAll<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS),
          storageService.getAll<Category>(LOCAL_STORAGE_KEYS.CATEGORIES),
          storageService.getAll<Subcategory>(LOCAL_STORAGE_KEYS.SUBCATEGORIES),
        ]);

        if (!mov) {
          setError('Transacción no encontrada.');
          setIsLoading(false);
          return;
        }

        setOriginalMovement(mov);
        setOperationType(mov.type);
        setDate(mov.date);
        setAmount(String(mov.amount));
        setDescription(mov.description);
        setAccountId(mov.accountId);
        
        const currentAccount = accs.find(a => a.id === mov.accountId);
        setAccountName(currentAccount ? `${currentAccount.name} (${currentAccount.currency})` : 'Cuenta no encontrada');

        setAccounts(accs); // Store all accounts for context, but accountId is not changeable
        setCategories(cats);
        setSubcategories(subcats);

        // Set category and subcategory from loaded movement
        if (mov.subcategoryId) {
            const foundSubcat = subcats.find(s => s.id === mov.subcategoryId);
            if (foundSubcat) {
                setCategoryId(foundSubcat.categoryId);
                setSubcategoryId(foundSubcat.id);
            } else { // It might be a direct category ID (e.g., for Salary)
                const foundCat = cats.find(c => c.id === mov.subcategoryId);
                if (foundCat) setCategoryId(foundCat.id);
            }
        }
        
      } catch (err) {
        setError('Error al cargar datos de la transacción.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadTransactionAndPrerequisites();
  }, [transactionId]);

  useEffect(() => {
    if (categoryId) {
      setFilteredSubcategories(subcategories.filter(sc => sc.categoryId === categoryId));
      // If the original subcategory doesn't belong to the new category, clear it.
      if (originalMovement && originalMovement.subcategoryId) {
        const originalSub = subcategories.find(s => s.id === originalMovement.subcategoryId);
        if (originalSub && originalSub.categoryId !== categoryId) {
            setSubcategoryId('');
        }
      } else if (!subcategories.some(s => s.id === subcategoryId && s.categoryId === categoryId)) {
         setSubcategoryId('');
      }
    } else {
      setFilteredSubcategories([]);
      setSubcategoryId('');
    }
  }, [categoryId, subcategories, originalMovement]);


  const categoryOptions: Option[] = categories.filter(c => c.name !== 'Transferencias').map(cat => ({ value: cat.id, label: cat.name }));
  const subcategoryOptions: Option[] = filteredSubcategories.map(subcat => ({ value: subcat.id, label: subcat.name }));

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'categoryId') {
        setCategoryId(value);
        // Do not automatically clear subcategory if it's already set from load unless category changes
        // This is handled in the useEffect above.
    } else if (name === 'subcategoryId') {
        setSubcategoryId(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!originalMovement || !transactionId) {
      setError('Error: Datos originales de la transacción no disponibles.');
      setIsLoading(false);
      return;
    }

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
    // Prevent editing type or account for simplicity, or if part of complex transaction
    if (isPartOfInstallmentPlan || isPartOfTransfer) {
        setError('No se pueden editar detalles fundamentales de transacciones en cuotas o transferencias desde aquí.');
        setIsLoading(false);
        return;
    }


    try {
      const updatedMovementData: Movement = {
        ...originalMovement,
        date,
        amount: numericAmount,
        description: description.trim(),
        subcategoryId: (categoryId && (operationType === MovementType.EXPENSE || (operationType === MovementType.INCOME && categories.find(c => c.id === categoryId)?.name === 'Salario'))) ? (subcategoryId || categoryId) : undefined,
        // Ensure accountId and type are from originalMovement, not from state if they were ever changeable
        accountId: originalMovement.accountId,
        type: originalMovement.type,
      };

      await storageService.update<Movement>(LOCAL_STORAGE_KEYS.MOVEMENTS, updatedMovementData);
      
      // Update account balance
      const accountToUpdate = await storageService.getById<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS, originalMovement.accountId);
      if (accountToUpdate) {
        let balanceAdjustment = 0;
        if (originalMovement.type === MovementType.INCOME) {
          balanceAdjustment = -originalMovement.amount + numericAmount; // (new - old) for income
        } else { // EXPENSE
          balanceAdjustment = originalMovement.amount - numericAmount; // (old - new) for expense
        }
        const newBalance = accountToUpdate.balance + balanceAdjustment;
        await storageService.update<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS, { ...accountToUpdate, balance: newBalance });
      }
      
      navigate('/transactions');
    } catch (err: any) {
      setError(`Error al actualizar transacción: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading && !originalMovement) {
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="lg" /></div>;
  }

  if (!originalMovement && !isLoading) {
     return <div className="max-w-2xl mx-auto bg-card-bg p-6 md:p-8 rounded-lg shadow-xl text-center text-danger">{error || 'No se pudo cargar la transacción para editar.'}</div>;
  }
  
  const readOnlyReason = isPartOfInstallmentPlan ? "(Parte de un plan de cuotas)" : isPartOfTransfer ? "(Parte de una transferencia)" : "";


  return (
    <div className="max-w-2xl mx-auto bg-card-bg p-6 md:p-8 rounded-lg shadow-xl text-text-principal">
      <h1 className="text-2xl font-bold text-primary mb-6">Editar Transacción</h1>
      {error && <div className="mb-4 p-3 bg-danger/10 text-danger rounded-md">{error}</div>}
      {originalMovement && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <p className="block text-sm font-medium text-text-secondary mb-1">Tipo de Operación: <span className="font-semibold text-text-principal">{originalMovement.type === MovementType.INCOME ? 'Ingreso' : 'Gasto'} {readOnlyReason}</span></p>
            <p className="block text-sm font-medium text-text-secondary mb-1">Cuenta: <span className="font-semibold text-text-principal">{accountName} {readOnlyReason}</span></p>
          </div>

          <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} required disabled={isLoading || !!readOnlyReason} />
          <Input label="Monto" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" step="0.01" required disabled={isLoading || !!readOnlyReason}/>
          
          {(originalMovement.type === MovementType.EXPENSE || (originalMovement.type === MovementType.INCOME && categories.find(c => c.id === categoryId)?.name === 'Salario')) && !readOnlyReason && (
            <>
              <Select 
                label={originalMovement.type === MovementType.EXPENSE ? "Categoría" : "Categoría (Ej: Salario)"}
                name="categoryId" value={categoryId} 
                onChange={handleSelectChange} 
                options={originalMovement.type === MovementType.INCOME ? categoryOptions.filter(c => c.label === "Salario") : categoryOptions} 
                placeholder="Seleccionar categoría" 
                required={originalMovement.type === MovementType.EXPENSE}
                disabled={isLoading || !!readOnlyReason}
              />
              {categoryId && filteredSubcategories.length > 0 && (
                <Select 
                    label="Subcategoría (Opcional)" 
                    name="subcategoryId" 
                    value={subcategoryId} 
                    onChange={handleSelectChange} 
                    options={subcategoryOptions} 
                    placeholder="Seleccionar subcategoría"
                    disabled={isLoading || !!readOnlyReason}
                />
              )}
            </>
          )}

          <Input 
              label="Descripción (Opcional)"
              type="text" value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Ej: Supermercado, Salario"
              maxLength={100}
              disabled={isLoading || !!readOnlyReason}
          />

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/transactions')} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" variant="primary" isLoading={isLoading} disabled={isLoading || !!readOnlyReason}>
              Guardar Cambios
            </Button>
          </div>
          {readOnlyReason && <p className="text-xs text-center text-text-secondary mt-2">Los campos principales de esta transacción no son editables porque está vinculada a {isPartOfInstallmentPlan ? 'un plan de cuotas' : 'una transferencia'}.</p>}
        </form>
      )}
    </div>
  );
};

export default EditTransactionPage;

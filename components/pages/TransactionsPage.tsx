
import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { storageService } from '../../services/storageService';
import { Movement, Account, Category, Subcategory, MovementType, Option } from '../../types';
import { LOCAL_STORAGE_KEYS } from '../../constants';
import Button from '../common/Button';
import { PlusCircleIcon, PencilSquareIcon, TrashIcon, ArrowPathIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { formatDate, formatMonthYearForDisplay, getCurrentMonthYear } from '../../utils/dateUtils';
import Select from '../common/Select';
import LoadingSpinner from '../common/LoadingSpinner';

const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);

  // Filters
  const [filterAccount, setFilterAccount] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>(''); // YYYY-MM
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    try {
      const [movs, accs, cats, subcats] = await Promise.all([
        storageService.getAll<Movement>(LOCAL_STORAGE_KEYS.MOVEMENTS),
        storageService.getAll<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS),
        storageService.getAll<Category>(LOCAL_STORAGE_KEYS.CATEGORIES),
        storageService.getAll<Subcategory>(LOCAL_STORAGE_KEYS.SUBCATEGORIES),
      ]);
      setMovements(movs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setAccounts(accs);
      setCategories(cats);
      setSubcategories(subcats);

      if (!filterMonth) { // Set initial month filter only if not already set by user
        const currentMonthYYYYMM = getCurrentMonthYear();
        if (movs.some(m => m.date.startsWith(currentMonthYYYYMM))) {
          setFilterMonth(currentMonthYYYYMM);
        } else {
          const uniqueMonthsFromMovs = Array.from(new Set(movs.map(m => m.date.substring(0, 7)))).sort().reverse();
          if (uniqueMonthsFromMovs.length > 0) {
            setFilterMonth(uniqueMonthsFromMovs[0]);
          } else {
            setFilterMonth(''); // No movements, no specific month
          }
        }
      }
    } catch (err) {
      console.error("Error al cargar datos de transacciones:", err);
      setError("No se pudieron cargar los datos. Por favor, intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []); // filterMonth removed from dependencies to avoid re-fetch loops on initial set

  const toggleFilters = () => {
    setShowFilters(prev => !prev);
  };
  
  const handleSelectMovement = (id: string) => {
    setSelectedMovementId(prevId => (prevId === id ? null : id));
  };

  const handleDelete = async () => {
    if (!selectedMovementId) return;
    const movementToDelete = movements.find(m => m.id === selectedMovementId);
    if (!movementToDelete) return;

    if (window.confirm(`¿Está seguro de que desea eliminar la transacción: "${movementToDelete.description}"? Esta acción es irreversible.`)) {
      setLoading(true);
      try {
        await storageService.deleteById(LOCAL_STORAGE_KEYS.MOVEMENTS, selectedMovementId);
        
        const account = await storageService.getById<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS, movementToDelete.accountId);
        if (account) {
            let newBalance = account.balance;
            // Only adjust balance if it's not part of an installment plan (handled differently)
            // or a transfer (which should ideally be deleted as a pair or re-evaluated)
            // For simplicity, directly reversing the amount. Complex scenarios may need more logic.
            if (!movementToDelete.installmentPlanId) { 
              newBalance = movementToDelete.type === MovementType.INCOME 
                  ? account.balance - movementToDelete.amount
                  : account.balance + movementToDelete.amount;
            }
            // For installment payments, deleting one might require recalculating plan or notifying user.
            // For transfers, deleting one part leaves an orphaned transaction.
            // Current approach is a simple deletion and balance adjustment for non-installment movements.
            await storageService.update<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS, {...account, balance: newBalance});
        }
        setMovements(prev => prev.filter(m => m.id !== selectedMovementId));
        setSelectedMovementId(null); // Deselect after deletion
        await fetchAllData(); // Refresh all data, including accounts for balance updates elsewhere
      } catch (err) {
        setError('Error al eliminar la transacción.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEdit = () => {
    if (selectedMovementId) {
      navigate(`/transactions/edit/${selectedMovementId}`);
    }
  };
  
  const getAccountName = (accountId: string) => accounts.find(a => a.id === accountId)?.name || 'N/A';
  const getSubcategoryName = (subcategoryId?: string) => {
    if (!subcategoryId) return '-';
    const subcat = subcategories.find(s => s.id === subcategoryId);
    if (!subcat) {
        const cat = categories.find(c => c.id === subcategoryId); // Check if it's a direct category ID (e.g., for Salary)
        return cat?.name || 'N/A';
    }
    const cat = categories.find(c => c.id === subcat.categoryId);
    return `${cat?.name || 'Cat N/A'} > ${subcat.name}`;
  };

  const monthOptions = useMemo(() => {
    const allKnownMovements = movements; // Use all movements for generating month options, not just filtered ones
    const uniqueMonths = Array.from(new Set(allKnownMovements.map(m => m.date.substring(0, 7)))).sort().reverse();
    const options: Option[] = uniqueMonths.map(month => ({
        value: month,
        label: formatMonthYearForDisplay(month)
    }));
    return [{ value: '', label: 'Todos los Meses' }, ...options];
  }, [movements]);

  const filteredMovements = useMemo(() => {
    return movements.filter(mov => {
      const accountMatch = filterAccount ? mov.accountId === filterAccount : true;
      const typeMatch = filterType ? mov.type === filterType : true;
      const monthMatch = filterMonth ? mov.date.startsWith(filterMonth) : true;
      
      let categoryMatch = true;
      if (filterCategory) {
        if (mov.subcategoryId) {
          const subcatEntry = subcategories.find(s => s.id === mov.subcategoryId);
          if (subcatEntry) { 
            categoryMatch = subcatEntry.categoryId === filterCategory;
          } else { 
            categoryMatch = mov.subcategoryId === filterCategory; // Direct category match (e.g., "Salary")
          }
        } else { 
           categoryMatch = false; 
        }
      }
      return accountMatch && typeMatch && categoryMatch && monthMatch;
    });
  }, [movements, filterAccount, filterCategory, filterType, filterMonth, subcategories, categories]);

  const groupedMovements = useMemo(() => {
    const groups: { [date: string]: Movement[] } = {};
    filteredMovements.forEach(mov => {
      if (!groups[mov.date]) {
        groups[mov.date] = [];
      }
      groups[mov.date].push(mov);
    });
    // The dates are already sorted because `movements` (and thus `filteredMovements`) are sorted.
    return groups;
  }, [filteredMovements]);


  const accountOptions: Option[] = [{value: '', label: 'Todas las Cuentas'}, ...accounts.map(a => ({ value: a.id, label: a.name }))];
  const categoryOptions: Option[] = [{value: '', label: 'Todas las Categorías'}, ...categories.filter(c => c.name !== 'Transferencias').map(c => ({ value: c.id, label: c.name }))];
  const typeOptions: Option[] = [
    { value: '', label: 'Todos los Tipos' },
    { value: MovementType.INCOME, label: 'Ingreso' },
    { value: MovementType.EXPENSE, label: 'Gasto' },
  ];
  
  const handleFilterChange = (name: string, value: string) => {
    setSelectedMovementId(null); // Deselect any selected movement when filters change
    if (name === 'filterAccount') setFilterAccount(value);
    else if (name === 'filterCategory') setFilterCategory(value);
    else if (name === 'filterType') setFilterType(value);
    else if (name === 'filterMonth') setFilterMonth(value);
  };

  if (loading && movements.length === 0) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }
  if (error) {
    return <div className="text-center p-4 bg-danger/20 text-danger rounded">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-primary">Transacciones</h1>
        <div className="flex items-center gap-2">
            {selectedMovementId && (
                <>
                    <Button variant="secondary" onClick={handleEdit} size="md">
                        <PencilSquareIcon className="h-5 w-5 mr-1 inline"/> Editar
                    </Button>
                    <Button variant="danger" onClick={handleDelete} size="md">
                        <TrashIcon className="h-5 w-5 mr-1 inline"/> Eliminar
                    </Button>
                </>
            )}
            <Link to="/transactions/new">
              <Button variant="primary">
                <PlusCircleIcon className="h-5 w-5 mr-2 inline" />
                Agregar
              </Button>
            </Link>
        </div>
      </div>

      <div className="flex justify-start">
        <Button 
          variant="secondary" 
          onClick={toggleFilters} 
          aria-controls="filters-section" 
          aria-expanded={showFilters}
        >
          {showFilters ? (
            <>
              <XMarkIcon className="h-5 w-5 mr-2 inline" />
              Ocultar Filtros
            </>
          ) : (
            <>
              <FunnelIcon className="h-5 w-5 mr-2 inline" />
              Mostrar Filtros
            </>
          )}
        </Button>
      </div>

      {showFilters && (
        <div id="filters-section" className="bg-card-bg p-4 rounded-lg shadow-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select name="filterMonth" options={monthOptions} value={filterMonth} onChange={handleFilterChange} label="Filtrar por Mes" placeholder="Todos los Meses"/>
          <Select name="filterAccount" options={accountOptions} value={filterAccount} onChange={handleFilterChange} label="Filtrar por Cuenta" placeholder="Todas las Cuentas" />
          <Select name="filterCategory" options={categoryOptions} value={filterCategory} onChange={handleFilterChange} label="Filtrar por Categoría" placeholder="Todas las Categorías"/>
          <Select name="filterType" options={typeOptions} value={filterType} onChange={handleFilterChange} label="Filtrar por Tipo" placeholder="Todos los Tipos"/>
        </div>
      )}

      {loading && <div className="py-4"><LoadingSpinner /></div>}
      
      {!loading && Object.keys(groupedMovements).length === 0 ? (
         <p className="text-center text-text-secondary py-8">No se encontraron transacciones para los filtros seleccionados.</p>
      ) : (
      <div className="space-y-6">
        {Object.entries(groupedMovements)
          // Sort dates explicitly here if needed, though they should come sorted from groupedMovements
          .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
          .map(([date, dateMovements]) => (
            <div key={date} className="bg-card-bg shadow-md rounded-lg">
              <h3 className="text-md font-semibold px-4 py-3 bg-card-bg text-text-principal border-b border-border-color rounded-t-lg">
                {formatDate(date)}
              </h3>
              <div className="divide-y divide-border-color">
                {dateMovements.map((mov) => (
                  <div
                    key={mov.id}
                    className={`
                      p-4 cursor-pointer transition-colors duration-150 ease-in-out
                      ${mov.installmentPlanId ? 'bg-blue-500/10 hover:bg-blue-500/20 dark:bg-blue-300/10 dark:hover:bg-blue-300/20' : (mov.relatedTransferId ? 'bg-green-500/10 hover:bg-green-500/20 dark:bg-green-300/10 dark:hover:bg-green-300/20' : 'hover:bg-border-color/30')}
                      ${selectedMovementId === mov.id ? '!bg-primary/10 border-l-4 border-primary' : ''}
                    `}
                    onClick={() => handleSelectMovement(mov.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectMovement(mov.id);}}
                    tabIndex={0}
                    role="button"
                    aria-pressed={selectedMovementId === mov.id}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-principal truncate" title={mov.description}>
                          {mov.description || (mov.type === MovementType.INCOME ? "Ingreso" : "Gasto")}
                          {mov.installmentNumber && mov.installmentPlanId && (
                            <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Cuota {mov.installmentNumber})</span>
                          )}
                          {mov.relatedTransferId && (
                            <ArrowPathIcon className="h-4 w-4 inline ml-1 text-green-700 dark:text-green-400" title="Parte de una transferencia" />
                          )}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {getAccountName(mov.accountId)}
                          <span className="mx-1.5 text-border-color">|</span>
                          {getSubcategoryName(mov.subcategoryId) || 'Sin categoría'}
                        </p>
                      </div>
                      <div className={`text-sm font-semibold ml-4 whitespace-nowrap ${mov.type === MovementType.INCOME ? 'text-success' : 'text-danger'}`}>
                        {mov.type === MovementType.INCOME ? '+' : '-'} ${mov.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
        ))}
      </div>
      )}
    </div>
  );
};

export default TransactionsPage;

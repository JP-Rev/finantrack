
import React, { useEffect, useState, useMemo } from 'react';
import { storageService } from '../../services/storageService';
import { Movement, Category, Subcategory, MovementType, Account, Option } from '../../types';
import { LOCAL_STORAGE_KEYS } from '../../constants';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LoadingSpinner from '../common/LoadingSpinner';
import Select from '../common/Select';
import { formatMonthYearForDisplay, getCurrentMonthYear, formatDate } from '../../utils/dateUtils';
import { ArrowPathIcon } from '@heroicons/react/24/outline';


const StatisticsPage: React.FC = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Filters
  const [filterMonthYear, setFilterMonthYear] = useState<string>(''); // YYYY-MM, or "" for all
  const [filterMovementType, setFilterMovementType] = useState<string>(''); // MovementType or "" for all
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
     // Function to update isDarkMode state
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    // Initial check
    checkDarkMode();

    // Observe changes to the class attribute of the html element
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [movs, cats, subcats, accsData] = await Promise.all([
          storageService.getAll<Movement>(LOCAL_STORAGE_KEYS.MOVEMENTS),
          storageService.getAll<Category>(LOCAL_STORAGE_KEYS.CATEGORIES),
          storageService.getAll<Subcategory>(LOCAL_STORAGE_KEYS.SUBCATEGORIES),
          storageService.getAll<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS),
        ]);
        setMovements(movs);
        setCategories(cats);
        setSubcategories(subcats);
        setAccounts(accsData);

        // Set initial month filter
        if (!filterMonthYear) {
            const currentMonthYYYYMM = getCurrentMonthYear();
            if (movs.some(m => m.date.startsWith(currentMonthYYYYMM))) {
              setFilterMonthYear(currentMonthYYYYMM);
            } else {
              const uniqueMonthsFromMovs = Array.from(new Set(movs.map(m => m.date.substring(0, 7)))).sort().reverse();
              if (uniqueMonthsFromMovs.length > 0) {
                setFilterMonthYear(uniqueMonthsFromMovs[0]);
              } else {
                setFilterMonthYear(''); // No movements, no specific month
              }
            }
          }

      } catch (err) {
        console.error("Error al cargar datos para estadísticas:", err);
        setError("No se pudieron cargar los datos para las estadísticas.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []); // Initial fetch only

  const monthYearOptions = useMemo(() => {
    const uniqueMonths = Array.from(new Set(movements.map(m => m.date.substring(0, 7)))).sort().reverse();
    const options: Option[] = uniqueMonths.map(month => ({
        value: month,
        label: formatMonthYearForDisplay(month)
    }));
    return [{ value: '', label: 'Todos los Períodos' }, ...options];
  }, [movements]);

  const movementTypeOptions: Option[] = [
    { value: '', label: 'Ambos Tipos' },
    { value: MovementType.INCOME, label: 'Solo Ingresos' },
    { value: MovementType.EXPENSE, label: 'Solo Egresos' },
  ];
  
  const handleFilterChange = (name: string, value: string) => {
    if (name === 'filterMonthYear') setFilterMonthYear(value);
    else if (name === 'filterMovementType') setFilterMovementType(value);
  };

  const filteredMovementsForCharts = useMemo(() => {
    return movements
        .filter(m => {
            const monthMatch = filterMonthYear ? m.date.startsWith(filterMonthYear) : true;
            const typeMatch = filterMovementType ? m.type === filterMovementType : true;
            return monthMatch && typeMatch;
        })
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort for display list
  }, [movements, filterMonthYear, filterMovementType]);


  const getCategoryNameForDisplay = (subcategoryId?: string): string => {
    if (!subcategoryId) return "Sin Categoría";
    const subcat = subcategories.find(s => s.id === subcategoryId);
    if (subcat) {
      const cat = categories.find(c => c.id === subcat.categoryId);
      return cat ? `${cat.name} > ${subcat.name}` : `Categoría Desconocida > ${subcat.name}`;
    }
    const directCat = categories.find(c => c.id === subcategoryId); // For direct category links like "Salario"
    return directCat?.name || "Categoría Desconocida";
  };

   const getAccountName = (accountId: string) => accounts.find(a => a.id === accountId)?.name || 'N/A';
  
  const expensesByCategory = useMemo(() => {
    if (filterMovementType === MovementType.INCOME) return []; 

    const data: { [key: string]: number } = {};
    filteredMovementsForCharts 
      .filter(m => m.type === MovementType.EXPENSE)
      .forEach(m => {
        const categoryName = getCategoryNameForDisplay(m.subcategoryId).split(' > ')[0]; // Main category for pie chart
        data[categoryName] = (data[categoryName] || 0) + m.amount;
      });
    return Object.entries(data).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [filteredMovementsForCharts, categories, subcategories, filterMovementType]);
  
  const totalsForPeriod = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;

    filteredMovementsForCharts.forEach(m => {
        if (m.type === MovementType.INCOME) {
        totalIncome += m.amount;
        } else if (m.type === MovementType.EXPENSE) {
        totalExpenses += m.amount;
        }
    });
    return { totalIncome, totalExpenses };
  }, [filteredMovementsForCharts]);


  const PIE_COLORS = ['#1B7985', '#2E8B57', '#FF8C00', '#D2691E', '#6A5ACD', '#4682B4', '#DC143C', '#FFD700'];
  const PIE_COLORS_DARK = ['#D79953', '#81C784', '#FFB74D', '#FF8A65', '#9575CD', '#64B5F6', '#E57373', '#FFF176'];


  const tooltipStyle = {
    backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    padding: '8px 12px',
    border: `1px solid ${isDarkMode ? 'var(--color-border)' : 'rgba(200,200,200,0.5)'}`,
    color: isDarkMode ? 'var(--color-text-principal)' : 'var(--color-text-principal)'
  };


  if (loading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }
  
  if (error) {
    return <div className="text-center p-4 bg-danger/20 text-danger rounded">{error}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center">
         <h1 className="text-3xl font-bold text-primary">Estadísticas Financieras</h1>
      </div>

      <div className="bg-card-bg p-4 rounded-lg shadow-md grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select 
            name="filterMonthYear" 
            options={monthYearOptions} 
            value={filterMonthYear} 
            onChange={handleFilterChange} 
            label="Filtrar por Período" 
            placeholder="Todos los Períodos"
        />
        <Select 
            name="filterMovementType" 
            options={movementTypeOptions} 
            value={filterMovementType} 
            onChange={handleFilterChange} 
            label="Filtrar por Tipo" 
            placeholder="Ambos Tipos"
        />
      </div>

      {movements.length === 0 && !loading && (
         <p className="text-center text-text-secondary py-8 text-xl">No hay suficientes datos para estadísticas. ¡Agregue algunas transacciones primero!</p>
      )}
      
      {/* Resumen de Ingresos y Egresos */}
      {movements.length > 0 && (
        <div className="bg-card-bg p-6 rounded-lg shadow-xl">
          <h2 className="text-xl font-semibold text-text-principal mb-4 text-center">
            Resumen del Período {filterMonthYear ? `(${formatMonthYearForDisplay(filterMonthYear)})` : ''}
          </h2>
          { (filterMovementType === '' || filterMovementType === MovementType.INCOME) && (
            <p className="text-lg text-center text-text-principal">
              Total Ingresos: <span className="font-bold text-success">${totalsForPeriod.totalIncome.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
          )}
          { (filterMovementType === '' || filterMovementType === MovementType.EXPENSE) && (
            <p className="text-lg text-center mt-2 text-text-principal">
              Total Egresos: <span className="font-bold text-danger">${totalsForPeriod.totalExpenses.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
          )}
          {totalsForPeriod.totalIncome === 0 && totalsForPeriod.totalExpenses === 0 && filteredMovementsForCharts.length === 0 && (
             <p className="text-text-secondary text-center py-4">No hay datos de ingresos o gastos disponibles para los filtros seleccionados.</p>
          )}
           {(totalsForPeriod.totalIncome > 0 || totalsForPeriod.totalExpenses > 0) && filterMovementType === MovementType.INCOME && totalsForPeriod.totalIncome === 0 && (
            <p className="text-text-secondary text-center py-4">No hay ingresos para los filtros seleccionados.</p>
          )}
          {(totalsForPeriod.totalIncome > 0 || totalsForPeriod.totalExpenses > 0) && filterMovementType === MovementType.EXPENSE && totalsForPeriod.totalExpenses === 0 && (
            <p className="text-text-secondary text-center py-4">No hay egresos para los filtros seleccionados.</p>
          )}
        </div>
      )}


      {filterMovementType !== MovementType.INCOME && movements.length > 0 && (
        <div className="bg-card-bg p-6 rounded-lg shadow-xl">
          <h2 className="text-xl font-semibold text-text-principal mb-6 text-center">Gastos por Categoría</h2>
          {expensesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  stroke={isDarkMode ? 'var(--color-card-background)' : 'var(--color-card-background)'}
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={(isDarkMode ? PIE_COLORS_DARK : PIE_COLORS)[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string, entry: any) => [`$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, entry.payload.name]}
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'transparent' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ color: 'var(--color-text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-text-secondary text-center py-4">No hay datos de gastos disponibles para los filtros seleccionados o el tipo de movimiento es "Solo Ingresos".</p> }
        </div>
      )}

      {/* Transacciones Filtradas */}
      {movements.length > 0 && filteredMovementsForCharts.length > 0 && (
        <div className="bg-card-bg p-6 rounded-lg shadow-xl mt-8">
            <h2 className="text-xl font-semibold text-text-principal mb-4 text-center">Transacciones Filtradas</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border-color">
                    <thead className="bg-border-color/10">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Fecha</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Descripción</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Cuenta</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Categoría</th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="bg-card-bg divide-y divide-border-color">
                        {filteredMovementsForCharts.map(mov => (
                            <tr key={mov.id} className={`${mov.installmentPlanId ? 'bg-blue-500/10 dark:bg-blue-300/10' : (mov.relatedTransferId ? 'bg-green-500/10 dark:bg-green-300/10' : '')}`}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{formatDate(mov.date)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-principal truncate max-w-xs" title={mov.description}>
                                    {mov.description || (mov.type === MovementType.INCOME ? "Ingreso" : "Gasto")}
                                    {mov.installmentNumber && <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">(Cuota {mov.installmentNumber})</span>}
                                    {mov.relatedTransferId && <ArrowPathIcon className="h-3 w-3 inline ml-1 text-green-700 dark:text-green-400" title="Transferencia" />}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{getAccountName(mov.accountId)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">{getCategoryNameForDisplay(mov.subcategoryId)}</td>
                                <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold ${mov.type === MovementType.INCOME ? 'text-success' : 'text-danger'}`}>
                                    {mov.type === MovementType.INCOME ? '+' : '-'} ${mov.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
       {movements.length > 0 && filteredMovementsForCharts.length === 0 && (
         <p className="text-center text-text-secondary py-8">No hay transacciones para mostrar con los filtros seleccionados.</p>
       )}

    </div>
  );
};

export default StatisticsPage;

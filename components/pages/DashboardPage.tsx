import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { storageService } from '../../services/storageService';
import { Movement, Account, MovementType, Currency } from '../../types';
import { LOCAL_STORAGE_KEYS } from '../../constants';
import Button from '../common/Button';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../../utils/dateUtils';
import LoadingSpinner from '../common/LoadingSpinner';

const DashboardPage: React.FC = () => {
  const [recentMovements, setRecentMovements] = useState<Movement[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalBalanceARS, setTotalBalanceARS] = useState<number>(0);
  const [totalBalanceUSD, setTotalBalanceUSD] = useState<number>(0);
  const [hasUSDAccounts, setHasUSDAccounts] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [movementsData, accountsData] = await Promise.all([
            storageService.getAll<Movement>(LOCAL_STORAGE_KEYS.MOVEMENTS),
            storageService.getAll<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS)
        ]);
        
        setAccounts(accountsData.sort((a,b) => a.name.localeCompare(b.name)));
        
        const sortedMovements = [...movementsData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentMovements(sortedMovements.slice(0, 5));

        let arsSum = 0;
        let usdSum = 0;
        let usdAccountsExist = false;
        accountsData.forEach(acc => {
          if (acc.currency === Currency.ARS) {
            arsSum += acc.balance;
          } else if (acc.currency === Currency.USD) {
            usdSum += acc.balance;
            usdAccountsExist = true;
          }
        });
        setTotalBalanceARS(arsSum);
        setTotalBalanceUSD(usdSum);
        setHasUSDAccounts(usdAccountsExist);

      } catch (error) {
        console.error("Error al cargar datos del panel:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Panel</h1>
        <Link to="/transactions/new">
          <Button variant="primary">
            <PlusCircleIcon className="h-5 w-5 mr-2 inline" />
            Agregar
          </Button>
        </Link>
      </div>

      {/* Saldos Totales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card-bg p-6 rounded-lg shadow-md text-text-principal">
          <h2 className="text-lg font-semibold text-text-secondary mb-2">Saldo Total (ARS)</h2>
          <p className="text-xl font-bold text-primary">
            ${totalBalanceARS.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        {hasUSDAccounts && (
          <div className="bg-card-bg p-6 rounded-lg shadow-md text-text-principal">
            <h2 className="text-lg font-semibold text-text-secondary mb-2">Saldo Total (USD)</h2>
            <p className="text-xl font-bold text-primary">
              U$D {totalBalanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>

      {/* Saldos por Cuenta */}
      <div>
        <h2 className="text-lg font-semibold text-text-secondary mb-3">Saldos por Cuenta</h2>
        {accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <div key={account.id} className="bg-card-bg p-4 rounded-lg shadow-md">
                <h3 className="text-base font-medium text-text-secondary mb-1 truncate" title={account.name}>{account.name}</h3>
                <p className={`text-lg font-bold ${account.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                  {account.currency === Currency.USD ? 'U$D ' : '$'}
                  {account.balance.toLocaleString(account.currency === Currency.USD ? 'en-US' : 'es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary">No hay cuentas para mostrar.</p>
        )}
      </div>
      

      {/* Transacciones Recientes */}
      <div>
        <h2 className="text-lg font-semibold text-text-secondary mb-3">Transacciones Recientes</h2>
        {recentMovements.length > 0 ? (
          <div className="bg-card-bg shadow-md rounded-lg overflow-hidden">
            <ul className="divide-y divide-border-color">
              {recentMovements.map((mov) => (
                <li key={mov.id} className="p-4 hover:bg-border-color/30 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-primary truncate" title={mov.description}>{mov.description || (mov.type === MovementType.INCOME ? "Ingreso" : "Gasto")}</p>
                    <p className="text-xs text-text-secondary">{formatDate(mov.date)}</p>
                  </div>
                  <div className={`text-sm font-semibold ${mov.type === MovementType.INCOME ? 'text-success' : 'text-danger'}`}>
                    {mov.type === MovementType.INCOME ? '+' : '-'} ${mov.amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-text-secondary">No hay transacciones recientes.</p>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
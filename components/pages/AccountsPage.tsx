
import React, { useEffect, useState } from 'react';
import { storageService } from '../../services/storageService';
import { Account, AccountType, Currency, Option, Movement } from '../../types';
import { LOCAL_STORAGE_KEYS } from '../../constants';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import { PlusCircleIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../common/LoadingSpinner';

// AccountCard component is removed as its rendering logic is now inlined in the main component.

const AccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [currentAccount, setCurrentAccount] = useState<Partial<Account> | null>(null);
  const [formError, setFormError] = useState<string>(''); 
  const [pageError, setPageError] = useState<string>(''); 
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const accountTypeOptions: Option[] = Object.values(AccountType).map(at => ({ value: at, label: at.charAt(0).toUpperCase() + at.slice(1) }));
  const currencyOptions: Option[] = Object.values(Currency).map(c => ({ value: c, label: c }));

  const fetchAccounts = async () => {
    setLoading(true);
    setPageError('');
    try {
      const accs = await storageService.getAll<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS);
      setAccounts(accs.sort((a,b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setPageError("Error al cargar cuentas.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSelectAccount = (accountId: string) => {
    setSelectedAccountId(prevId => (prevId === accountId ? null : accountId));
  };

  const openModalForNew = () => {
    setCurrentAccount({ name: '', type: AccountType.CASH, currency: Currency.ARS, balance: 0 });
    setIsModalOpen(true);
    setFormError('');
    setSelectedAccountId(null); // Deselect if any
  };

  const openModalForEdit = () => {
    if (!selectedAccountId) return;
    const accountToEdit = accounts.find(acc => acc.id === selectedAccountId);
    if (accountToEdit) {
        setCurrentAccount(accountToEdit);
        setIsModalOpen(true);
        setFormError('');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setCurrentAccount(null);
    setFormError('');
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentAccount) return;
    const { name, value } = e.target;
    setCurrentAccount(prev => ({ ...prev, [name]: name === 'balance' ? parseFloat(value) || 0 : value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    if (!currentAccount) return;
    setCurrentAccount(prev => ({ ...prev, [name]: value }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount || !currentAccount.name || !currentAccount.name.trim() || !currentAccount.type || !currentAccount.currency) {
      setFormError("El nombre, tipo y moneda son obligatorios. El nombre no puede estar vacío.");
      return;
    }
    setLoading(true); 
    setFormError('');
    try {
      if (currentAccount.id) { 
        await storageService.update<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS, currentAccount as Account);
      } else { 
        await storageService.add<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS, {
            name: currentAccount.name.trim(),
            type: currentAccount.type as AccountType, 
            currency: currentAccount.currency as Currency, 
            balance: currentAccount.balance || 0,
        });
      }
      await fetchAccounts(); 
      handleModalClose();
      setSelectedAccountId(null); 
    } catch (err: any) {
      setFormError(`Error al guardar la cuenta: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false); 
    }
  };

  const handleDelete = async () => {
    if (!selectedAccountId) return;
    const accountToDelete = accounts.find(acc => acc.id === selectedAccountId);
    if (!accountToDelete) return;

    if (window.confirm(`¿Está seguro de que desea eliminar la cuenta "${accountToDelete.name}"? Esto podría afectar transacciones existentes.`)) {
      setLoading(true);
      setPageError('');
      try {
        const movements = await storageService.getAll<Movement>(LOCAL_STORAGE_KEYS.MOVEMENTS);
        if (movements.some(m => m.accountId === selectedAccountId)) {
            setPageError("No se puede eliminar la cuenta: está siendo utilizada en transacciones existentes. Reasigne o elimine esas transacciones primero.");
            setLoading(false);
            return;
        }
        await storageService.deleteById(LOCAL_STORAGE_KEYS.ACCOUNTS, selectedAccountId);
        await fetchAccounts();
        setSelectedAccountId(null); 
      } catch (err: any) {
        setPageError(`Error al eliminar la cuenta: ${err.message}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };
  
  if (loading && accounts.length === 0 && !pageError) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-primary">Gestión de Cuentas</h1>
        <div className="flex items-center gap-2">
            {selectedAccountId && (
                <>
                    <Button variant="secondary" onClick={openModalForEdit} size="md">
                        <PencilSquareIcon className="h-5 w-5 mr-1 inline"/> Editar
                    </Button>
                    <Button variant="danger" onClick={handleDelete} size="md">
                        <TrashIcon className="h-5 w-5 mr-1 inline"/> Eliminar
                    </Button>
                </>
            )}
            <Button variant="primary" onClick={openModalForNew}>
              <span className="flex items-center">
                <PlusCircleIcon className="h-5 w-5 mr-2" />
                Agregar
              </span>
            </Button>
        </div>
      </div>

      {pageError && <p className="text-danger bg-danger/10 p-3 rounded-md">{pageError}</p>}
      {loading && accounts.length === 0 && pageError && <div className="py-4"><LoadingSpinner /></div>} 


      {accounts.length > 0 ? (
        <div className="bg-card-bg shadow-md rounded-lg">
           <div className="divide-y divide-border-color">
            {accounts.map(acc => (
              <div 
                  key={acc.id} 
                  className={`
                    p-4 cursor-pointer transition-colors duration-150 ease-in-out
                    hover:bg-border-color/30
                    ${selectedAccountId === acc.id ? '!bg-primary/10 border-l-4 border-primary' : 'border-l-4 border-transparent'}
                  `}
                  onClick={() => handleSelectAccount(acc.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectAccount(acc.id);}}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selectedAccountId === acc.id}
                  aria-label={`Cuenta ${acc.name}`}
              >
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-md font-semibold text-primary truncate" title={acc.name}>{acc.name}</h3>
                        {/* Optionally, add type or other details here if needed later, e.g.,
                        <p className="text-xs text-text-secondary">{acc.type} - {acc.currency}</p> 
                        */}
                    </div>
                    <div className={`text-lg font-bold ${acc.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                        {acc.currency === Currency.USD ? 'U$D ' : '$'}
                        {acc.balance.toLocaleString(acc.currency === Currency.USD ? 'en-US' : 'es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !loading && !pageError && <p className="text-text-secondary text-center py-8">Aún no hay cuentas. ¡Agregue su primera cuenta para comenzar!</p>
      )}

      {isModalOpen && currentAccount && (
        <Modal isOpen={isModalOpen} onClose={handleModalClose} title={currentAccount.id ? 'Editar Cuenta' : 'Agregar Nueva Cuenta'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && <p className="text-danger bg-danger/10 p-2 rounded-md text-sm">{formError}</p>}
            <Input label="Nombre de Cuenta" name="name" value={currentAccount.name || ''} onChange={handleFormChange} required placeholder="Ej: Mis Ahorros Banco"/>
            <Select label="Tipo de Cuenta" name="type" value={currentAccount.type || AccountType.CASH} onChange={handleSelectChange} options={accountTypeOptions} required />
            <Select label="Moneda" name="currency" value={currentAccount.currency || Currency.ARS} onChange={handleSelectChange} options={currencyOptions} required />
            <Input label="Saldo Inicial / Actual" name="balance" type="number" value={currentAccount.balance === undefined ? '' : String(currentAccount.balance)} onChange={handleFormChange} step="0.01" placeholder="0.00"/>
            <div className="flex justify-end space-x-3 pt-2">
              <Button type="button" variant="secondary" onClick={handleModalClose} disabled={loading && !!currentAccount}>Cancelar</Button>
              <Button type="submit" variant="primary" isLoading={loading && !!currentAccount} disabled={loading && !!currentAccount}>Guardar Cuenta</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AccountsPage;
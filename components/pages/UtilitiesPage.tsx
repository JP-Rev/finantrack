import React, { useState, useEffect } from 'react';
import { storageService } from '../../services/storageService';
import { Movement, Account, Category, Subcategory, MovementType } from '../../types';
import { LOCAL_STORAGE_KEYS } from '../../constants';
import Button from '../common/Button';
import { DocumentArrowDownIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../../utils/dateUtils';
import LoadingSpinner from '../common/LoadingSpinner';
import { applyTheme, loadAndApplyInitialTheme, AvailableThemes } from '../../utils/themeUtils';

const UtilitiesPage: React.FC = () => {
  const [isExportLoading, setIsExportLoading] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string>('');
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string>('');
  const [currentTheme, setCurrentTheme] = useState<AvailableThemes>(() => loadAndApplyInitialTheme());

  useEffect(() => {
    // Ensure component re-renders if theme is changed by another source (e.g. system preference change handled by loadAndApplyInitialTheme)
    // This is a simple way; a more robust solution might use a global state or context for theme.
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'finantrack_theme') {
            setCurrentTheme(loadAndApplyInitialTheme());
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
}, []);


  const escapeCsvField = (field: any): string => {
    if (field === null || field === undefined) {
      return '';
    }
    let stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n') || stringField.includes('\r')) {
      stringField = stringField.replace(/"/g, '""');
      return `"${stringField}"`;
    }
    return stringField;
  };

  const handleExportCSV = async () => {
    setIsExportLoading(true);
    setExportError('');
    setExportSuccessMessage('');
    try {
      const [movements, accounts, categories, subcategories] = await Promise.all([
        storageService.getAll<Movement>(LOCAL_STORAGE_KEYS.MOVEMENTS),
        storageService.getAll<Account>(LOCAL_STORAGE_KEYS.ACCOUNTS),
        storageService.getAll<Category>(LOCAL_STORAGE_KEYS.CATEGORIES),
        storageService.getAll<Subcategory>(LOCAL_STORAGE_KEYS.SUBCATEGORIES),
      ]);

      if (movements.length === 0) {
        setExportError('No hay transacciones para exportar.');
        setIsExportLoading(false);
        return;
      }

      const getAccountInfo = (accountId: string) => accounts.find(a => a.id === accountId);
      const getCategoryInfo = (subcategoryId?: string) => {
        if (!subcategoryId) return { categoryName: '', subcategoryName: '' };
        const subcat = subcategories.find(s => s.id === subcategoryId);
        if (subcat) {
          const cat = categories.find(c => c.id === subcat.categoryId);
          return { categoryName: cat?.name || '', subcategoryName: subcat.name };
        }
        const directCat = categories.find(c => c.id === subcategoryId);
        return { categoryName: directCat?.name || '', subcategoryName: '' };
      };

      const headers = [
        'ID Transacción', 'Fecha', 'Tipo', 'Descripción', 'Monto',
        'Moneda Cuenta', 'Nombre Cuenta', 'Categoría Principal', 'Subcategoría',
        'Es Cuota?', 'Número Cuota', 'ID Plan Cuotas',
        'Es Transferencia?', 'ID Transferencia Relacionada'
      ];
      const csvRows = [headers.map(escapeCsvField).join(',')];
      const sortedMovements = [...movements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      for (const mov of sortedMovements) {
        const account = getAccountInfo(mov.accountId);
        const { categoryName, subcategoryName } = getCategoryInfo(mov.subcategoryId);
        const row = [
          mov.id, formatDate(mov.date), mov.type === MovementType.INCOME ? 'Ingreso' : 'Gasto', mov.description,
          mov.amount, account?.currency || '', account?.name || '', categoryName, subcategoryName,
          mov.installmentPlanId ? 'Sí' : 'No', mov.installmentNumber || '', mov.installmentPlanId || '',
          mov.relatedTransferId ? 'Sí' : 'No', mov.relatedTransferId || '',
        ];
        csvRows.push(row.map(escapeCsvField).join(','));
      }

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'finantrack_transacciones.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportSuccessMessage(`Se exportaron ${movements.length} transacciones exitosamente.`);

    } catch (err) {
      console.error("Error al exportar CSV:", err);
      setExportError('Ocurrió un error al generar el archivo CSV.');
    } finally {
      setIsExportLoading(false);
    }
  };

  const handleChangeTheme = (theme: AvailableThemes) => {
    applyTheme(theme);
    setCurrentTheme(theme);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-primary">Utilidades</h1>

      <div className="bg-card-bg p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-text-principal mb-4">Apariencia de la Aplicación</h2>
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => handleChangeTheme(AvailableThemes.LIGHT)} 
            variant={currentTheme === AvailableThemes.LIGHT ? 'primary' : 'secondary'}
            className={currentTheme === AvailableThemes.LIGHT ? '' : 'bg-input-bg border border-input-border text-text-principal hover:bg-border-color'}
          >
            <SunIcon className="h-5 w-5 mr-2 inline" />
            Modo Claro
          </Button>
          <Button 
            onClick={() => handleChangeTheme(AvailableThemes.DARK)} 
            variant={currentTheme === AvailableThemes.DARK ? 'primary' : 'secondary'}
            className={currentTheme === AvailableThemes.DARK ? '' : 'bg-input-bg border border-input-border text-text-principal hover:bg-border-color'}
          >
            <MoonIcon className="h-5 w-5 mr-2 inline" />
            Modo Oscuro
          </Button>
        </div>
        <p className="mt-3 text-sm text-text-secondary">
          Tema actual: {currentTheme === AvailableThemes.LIGHT ? 'Claro' : 'Oscuro'}
        </p>
      </div>

      <div className="bg-card-bg p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-text-principal mb-4">Exportar Datos</h2>
        <p className="text-text-secondary mb-4">
          Exporte todas sus transacciones a un archivo CSV.
        </p>
        
        {isExportLoading ? (
          <div className="flex justify-center my-4">
            <LoadingSpinner />
            <p className="ml-3 text-text-secondary">Generando archivo CSV...</p>
          </div>
        ) : (
          <Button onClick={handleExportCSV} variant="primary" size="lg" disabled={isExportLoading}>
            <DocumentArrowDownIcon className="h-5 w-5 mr-2 inline" />
            Exportar Transacciones a CSV
          </Button>
        )}
        
        {exportError && <p className="mt-4 text-sm text-danger bg-danger/10 p-3 rounded-md">{exportError}</p>}
        {exportSuccessMessage && <p className="mt-4 text-sm text-success bg-success/10 p-3 rounded-md">{exportSuccessMessage}</p>}
      </div>
    </div>
  );
};

export default UtilitiesPage;
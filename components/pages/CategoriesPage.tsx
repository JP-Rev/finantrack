
import React, { useEffect, useState } from 'react';
import { storageService } from '../../services/storageService';
import { Category, Subcategory, Movement } from '../../types';
import { LOCAL_STORAGE_KEYS } from '../../constants';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Input from '../common/Input';
import { PlusCircleIcon, PencilSquareIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../common/LoadingSpinner';

interface CategoryFormData {
  id?: string;
  name: string;
}
interface SubcategoryFormData {
  id?: string;
  name: string;
  categoryId: string;
}

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [formError, setFormError] = useState<string>('');
  const [pageError, setPageError] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());


  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [currentCategory, setCurrentCategory] = useState<CategoryFormData | null>(null);

  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState<boolean>(false);
  const [currentSubcategory, setCurrentSubcategory] = useState<SubcategoryFormData | null>(null);
  

  const fetchData = async () => {
    setLoading(true);
    setPageError('');
    try {
      const [cats, subcats] = await Promise.all([
        storageService.getAll<Category>(LOCAL_STORAGE_KEYS.CATEGORIES),
        storageService.getAll<Subcategory>(LOCAL_STORAGE_KEYS.SUBCATEGORIES),
      ]);
      setCategories(cats.sort((a,b)=> a.name.localeCompare(b.name)));
      setSubcategories(subcats.sort((a,b)=> a.name.localeCompare(b.name)));
    } catch (err) {
      setPageError("Error al cargar categorías.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const openNewCategoryModal = () => {
    setCurrentCategory({ name: '' });
    setIsCategoryModalOpen(true);
    setFormError('');
  };
  const openEditCategoryModal = (category: Category) => {
    setCurrentCategory(category);
    setIsCategoryModalOpen(true);
    setFormError('');
  };
  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setCurrentCategory(null);
  };

  const openNewSubcategoryModal = (categoryId: string) => {
    setCurrentSubcategory({ name: '', categoryId });
    setIsSubcategoryModalOpen(true);
    setFormError('');
  };
  const openEditSubcategoryModal = (subcategory: Subcategory) => {
    setCurrentSubcategory(subcategory);
    setIsSubcategoryModalOpen(true);
    setFormError('');
  };
  const closeSubcategoryModal = () => {
    setIsSubcategoryModalOpen(false);
    setCurrentSubcategory(null);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCategory || !currentCategory.name.trim()) {
        setFormError("El nombre de la categoría no puede estar vacío.");
        return;
    }
    setLoading(true);
    setFormError('');
    try {
      if (currentCategory.id) {
        await storageService.update<Category>(LOCAL_STORAGE_KEYS.CATEGORIES, currentCategory as Category);
      } else {
        await storageService.add<Category>(LOCAL_STORAGE_KEYS.CATEGORIES, { name: currentCategory.name.trim() });
      }
      await fetchData();
      closeCategoryModal();
    } catch (err: any) {
      setFormError(`Error al guardar categoría: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubcategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSubcategory || !currentSubcategory.name.trim() || !currentSubcategory.categoryId) {
        setFormError("El nombre de la subcategoría y la categoría padre son obligatorios.");
        return;
    }
    setLoading(true);
    setFormError('');
    try {
      if (currentSubcategory.id) {
        await storageService.update<Subcategory>(LOCAL_STORAGE_KEYS.SUBCATEGORIES, currentSubcategory as Subcategory);
      } else {
        await storageService.add<Subcategory>(LOCAL_STORAGE_KEYS.SUBCATEGORIES, { name: currentSubcategory.name.trim(), categoryId: currentSubcategory.categoryId });
      }
      await fetchData();
      closeSubcategoryModal();
    } catch (err: any) {
      setFormError(`Error al guardar subcategoría: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: string) => {
     if (window.confirm('¿Está seguro de que desea eliminar esta categoría? Todas sus subcategorías también se eliminarán. Esto podría afectar transacciones existentes.')) {
        setLoading(true);
        setPageError('');
        try {
            const movements = await storageService.getAll<Movement>(LOCAL_STORAGE_KEYS.MOVEMENTS);
            const subcatsOfThisCat = subcategories.filter(sc => sc.categoryId === id);
            const subcatIds = subcatsOfThisCat.map(sc => sc.id);
            
            if (movements.some(m => m.subcategoryId === id || (m.subcategoryId && subcatIds.includes(m.subcategoryId)))) {
                 setPageError("No se puede eliminar la categoría: ella o sus subcategorías se utilizan en transacciones existentes. Reasigne o elimine esas transacciones primero.");
                 setLoading(false);
                 return;
            }

            for (const subcat of subcatsOfThisCat) {
                await storageService.deleteById(LOCAL_STORAGE_KEYS.SUBCATEGORIES, subcat.id);
            }
            await storageService.deleteById(LOCAL_STORAGE_KEYS.CATEGORIES, id);
            await fetchData();
        } catch (err: any) { 
            setPageError(`Error al eliminar categoría: ${err.message}`);
            console.error(err);
        } finally { 
            setLoading(false); 
        }
     }
  };

  const deleteSubcategory = async (id: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta subcategoría? Esto podría afectar transacciones existentes.')) {
        setLoading(true);
        setPageError('');
        try {
            const movements = await storageService.getAll<Movement>(LOCAL_STORAGE_KEYS.MOVEMENTS);
            if (movements.some(m => m.subcategoryId === id)) {
                 setPageError("No se puede eliminar la subcategoría: se utiliza en transacciones existentes. Reasigne o elimine esas transacciones primero.");
                 setLoading(false);
                 return;
            }
            await storageService.deleteById(LOCAL_STORAGE_KEYS.SUBCATEGORIES, id);
            await fetchData();
        } catch (err: any) { 
            setPageError(`Error al eliminar subcategoría: ${err.message}`);
            console.error(err);
        } finally { 
            setLoading(false); 
        }
    }
  };

  if (loading && categories.length === 0) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">Categorías y Subcategorías</h1>
        <Button variant="primary" onClick={openNewCategoryModal}>
          <span className="flex items-center">
            <PlusCircleIcon className="h-5 w-5 mr-2" /> 
            Agregar
          </span>
        </Button>
      </div>

      {pageError && <p className="text-danger bg-danger/10 p-3 rounded-md">{pageError}</p>}
      {loading && categories.length > 0 && <div className="py-4"><LoadingSpinner /></div>}

      {categories.length > 0 ? (
        <div className="space-y-3">
          {categories.map(cat => {
            const catSubcategories = subcategories.filter(sc => sc.categoryId === cat.id);
            const isExpanded = expandedCategories.has(cat.id);
            return (
            <div key={cat.id} className="bg-card-bg rounded-lg shadow-md transition-all duration-200">
              <div 
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-border-color/20 rounded-t-lg"
                onClick={() => toggleCategoryExpansion(cat.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleCategoryExpansion(cat.id); }}
                tabIndex={0}
                role="button"
                aria-expanded={isExpanded}
                aria-controls={`subcategories-${cat.id}`}
              >
                <div className="flex items-center">
                    {isExpanded ? <ChevronDownIcon className="h-5 w-5 mr-2 text-primary" /> : <ChevronRightIcon className="h-5 w-5 mr-2 text-text-secondary" />}
                    <h2 className="text-xl font-semibold text-text-principal">{cat.name}</h2>
                </div>
                <div className="space-x-2 flex items-center" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10" onClick={() => openEditCategoryModal(cat)} aria-label={`Editar categoría ${cat.name}`}><PencilSquareIcon className="h-4 w-4"/></Button>
                  <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => deleteCategory(cat.id)} aria-label={`Eliminar categoría ${cat.name}`}><TrashIcon className="h-4 w-4"/></Button>
                  <Button size="sm" variant="primary" onClick={() => openNewSubcategoryModal(cat.id)}>
                    <PlusCircleIcon className="h-4 w-4 mr-1 inline"/> Subs
                  </Button>
                </div>
              </div>
              {isExpanded && (
                <div id={`subcategories-${cat.id}`} className="p-4 border-t border-border-color">
                  {catSubcategories.length > 0 ? (
                    <ul className="pl-4 space-y-2">
                      {catSubcategories.map(subcat => (
                        <li key={subcat.id} className="flex justify-between items-center p-2 rounded hover:bg-border-color/20 transition-colors duration-150">
                          <span className="text-text-secondary">{subcat.name}</span>
                          <div className="space-x-1" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10" onClick={() => openEditSubcategoryModal(subcat)} aria-label={`Editar subcategoría ${subcat.name}`}><PencilSquareIcon className="h-4 w-4"/></Button>
                            <Button size="sm" variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => deleteSubcategory(subcat.id)} aria-label={`Eliminar subcategoría ${subcat.name}`}><TrashIcon className="h-4 w-4"/></Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-text-secondary italic px-4 py-2">Aún no hay subcategorías para {cat.name}.</p>
                  )}
                </div>
              )}
            </div>
          )})}
        </div>
      ) : (
        !loading && !pageError && <p className="text-text-secondary text-center py-8">No hay categorías definidas. Agregue categorías para organizar sus transacciones.</p>
      )}

      {/* Category Modal */}
      {currentCategory && (
        <Modal isOpen={isCategoryModalOpen} onClose={closeCategoryModal} title={currentCategory.id ? 'Editar Categoría' : 'Agregar Nueva Categoría'}>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            {formError && <p className="text-danger bg-danger/10 p-2 rounded-md text-sm">{formError}</p>}
            <Input label="Nombre de Categoría" name="name" value={currentCategory.name} onChange={e => setCurrentCategory(p => p ? {...p, name: e.target.value} : null)} required placeholder="Ej: Comida, Transporte" />
            <div className="flex justify-end space-x-2 pt-2"><Button type="button" variant="secondary" onClick={closeCategoryModal} disabled={loading}>Cancelar</Button><Button type="submit" variant="primary" isLoading={loading} disabled={loading}>Guardar Categoría</Button></div>
          </form>
        </Modal>
      )}

      {/* Subcategory Modal */}
      {currentSubcategory && (
        <Modal isOpen={isSubcategoryModalOpen} onClose={closeSubcategoryModal} title={currentSubcategory.id ? 'Editar Subcategoría' : 'Agregar Nueva Subcategoría'}>
          <form onSubmit={handleSubcategorySubmit} className="space-y-4">
             {formError && <p className="text-danger bg-danger/10 p-2 rounded-md text-sm">{formError}</p>}
            <Input label="Nombre de Subcategoría" name="name" value={currentSubcategory.name} onChange={e => setCurrentSubcategory(p => p ? {...p, name: e.target.value} : null)} required placeholder="Ej: Supermercado, Boleto de colectivo"/>
            <p className="text-sm text-text-secondary">
                Categoría Padre: <span className="font-semibold">{categories.find(c=>c.id === currentSubcategory.categoryId)?.name || 'Desconocida'}</span>
            </p>
            <div className="flex justify-end space-x-2 pt-2"><Button type="button" variant="secondary" onClick={closeSubcategoryModal} disabled={loading}>Cancelar</Button><Button type="submit" variant="primary" isLoading={loading} disabled={loading}>Guardar Subcategoría</Button></div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default CategoriesPage;
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './components/pages/DashboardPage';
import TransactionsPage from './components/pages/TransactionsPage';
import AddTransactionPage from './components/pages/AddTransactionPage';
import EditTransactionPage from './components/pages/EditTransactionPage';
import AccountsPage from './components/pages/AccountsPage';
import CategoriesPage from './components/pages/CategoriesPage';
import StatisticsPage from './components/pages/StatisticsPage';
import UtilitiesPage from './components/pages/UtilitiesPage';
import AuthPage from './components/pages/AuthPage';
import ResetPasswordPage from './components/pages/ResetPasswordPage';
import LoadingSpinner from './components/common/LoadingSpinner';

import { loadAndApplyInitialTheme } from './utils/themeUtils';
import { supabase } from './lib/supabase';
import { initializeData } from './services/storageService';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadAndApplyInitialTheme();
    
    // Verificar sesión actual
    const checkSession = async () => {
      try {
        console.log('Checking session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          setError(`Error de conexión: ${error.message}`);
          setIsAuthenticated(false);
        } else {
          console.log('Session:', session ? 'Found' : 'Not found');
          setIsAuthenticated(!!session);
          
          if (session) {
            // Inicializar datos de ejemplo si es necesario
            try {
              await initializeData();
            } catch (initError) {
              console.error('Error initializing data:', initError);
              // No bloquear la app por errores de inicialización
            }
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setError('Error de conexión con la base de datos');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
      setIsAuthenticated(!!session);
      
      if (session && event === 'SIGNED_IN') {
        // Inicializar datos cuando el usuario se autentica
        try {
          await initializeData();
        } catch (initError) {
          console.error('Error initializing data on sign in:', initError);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-text-secondary">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center bg-card-bg p-8 rounded-lg shadow-xl max-w-md">
          <h1 className="text-2xl font-bold text-danger mb-4">Error de Conexión</h1>
          <p className="text-text-secondary mb-4">{error}</p>
          <p className="text-sm text-text-secondary">
            Verifica que las variables de entorno de Supabase estén configuradas correctamente.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-primary text-text-on-primary rounded-md hover:bg-primary-hover"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<AuthPage />} />
        </Routes>
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/transactions/new" element={<AddTransactionPage />} />
          <Route path="/transactions/edit/:transactionId" element={<EditTransactionPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/utilities" element={<UtilitiesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
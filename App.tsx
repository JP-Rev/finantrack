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
import LoadingSpinner from './components/common/LoadingSpinner';

import { loadAndApplyInitialTheme } from './utils/themeUtils';
import { supabase } from './lib/supabase';
import { initializeData } from './services/storageService';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAndApplyInitialTheme();
    
    // Verificar sesión actual
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        
        if (session) {
          // Inicializar datos de ejemplo si es necesario
          await initializeData();
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsAuthenticated(!!session);
      
      if (session && event === 'SIGNED_IN') {
        // Inicializar datos cuando el usuario se autentica
        await initializeData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated === false) {
    return <AuthPage />;
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
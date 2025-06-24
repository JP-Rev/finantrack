import React, { useEffect } from 'react';
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

// Initialize storage service which might include seeding data
import './services/storageService';
import { loadAndApplyInitialTheme } from './utils/themeUtils';


const App: React.FC = () => {
  useEffect(() => {
    loadAndApplyInitialTheme();
  }, []);

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
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
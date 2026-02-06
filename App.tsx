
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { ComingSoon } from './components/ComingSoon';
import { ThemeProvider, I18nProvider, AuthProvider, ToastProvider, useAuth } from './contexts';
import { LoginPage } from './pages/LoginPage';

// Domain Modules
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { AppManagerPage } from './pages/apps/AppManagerPage';
import { ProductCenterPage } from './pages/products/ProductCenterPage';
import { OrderCenterPage } from './pages/orders/OrderCenterPage';
import { DataCenterPage } from './pages/data/DataCenterPage';
import { UserCenterPage } from './pages/users/UserCenterPage';
import { SystemLogsPage } from './pages/sys/SystemLogsPage';

const AuthenticatedApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardPage />;
      case 'apps':
        return <AppManagerPage />;
      case 'products':
        return <ProductCenterPage />;
      case 'orders':
        return <OrderCenterPage />;
      case 'data':           // Keep if parent clicked, or default to traffic
      case 'data_traffic':
        return <DataCenterPage />;
      case 'data_users':
        return <ComingSoon />;
      case 'users':
        return <UserCenterPage />;
      
      // Placeholders for modules currently in development
      case 'partners': // Partner List
      case 'partnerRebates': // Partner Rebates
      case 'feedback':
      case 'dict':
      case 'integration':
      case 'apiMgmt':
      case 'rules':
      case 'audit':
        return <ComingSoon />;
      case 'sysLogs':
        return <SystemLogsPage />;
      case 'roles':
        return <ComingSoon />;
        
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

const MainSwitch: React.FC = () => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <AuthenticatedApp /> : <LoginPage />;
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
            <ToastProvider>
                <MainSwitch />
            </ToastProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
};

export default App;

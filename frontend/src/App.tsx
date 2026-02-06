import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth, ThemeProvider, ToastProvider, I18nProvider, PageHeaderProvider } from './contexts';
import { LoginPage } from './pages/LoginPage';
import DashboardPage from './pages/dashboard/page';
import AppsPage from './pages/apps/page';
import AIAssistantPage from './pages/apps/ai-assistant/page';
import DebateListPage from './pages/apps/ai-assistant/debates/page';
import DebateDetailPage from './pages/apps/ai-assistant/debates/detail/page';
import AILabPage from './pages/apps/ai-lab/page';
import AILabDetailPage from './pages/apps/ai-lab/detail/page';
import ProductListPage from './pages/products/list/page';
import ProductCategoriesPage from './pages/products/categories/page';
import CouponPage from './pages/marketing/coupons/page';
import UsersPage from './pages/users/page';
import OrdersPage from './pages/orders/page';
import OrderRefundsPage from './pages/orders/refunds/page';
import SubscriptionsPage from './pages/orders/subscriptions/page';
import WebhookPage from './pages/sys/webhooks/page';
import SysIntegrationPage from './pages/sys/integration/page';
import SysDatabasePage from './pages/sys/database/page';
import SysLogsPage from './pages/sys/logs/page';
import AuditLogsPage from './pages/sys/audit/page';
import SysApiMgmtPage from './pages/sys/api/page';
import SysAIAgentPage from './pages/sys/ai-agent/page';
import SkillsPage from './pages/sys/skills/page';
import PromptsPage from './pages/sys/prompts/page';
import SysIdentityPage from './pages/sys/identity/page';
import SysAIGatewayPage from './pages/sys/ai-gateway/page';
import ChangePasswordPage from './pages/sys/account/change-password/page';
import AboutPage from './pages/about/page';
import PublicApiDocsPage from './pages/public/api-docs/page';
import { Loader2 } from 'lucide-react';

import { InputContextMenu } from './components/InputContextMenu';

// Guard Component
const AuthGuard = () => {
  const { session, loading } = useAuth();
  if (loading) return <div className="h-screen w-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  return session ? <Outlet /> : <Navigate to="/auth/login" replace />;
};

// Layout Component (Placeholder for now, should migrate Layout.tsx)
import { Layout } from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <PageHeaderProvider>
                <InputContextMenu />
                <Routes>
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/docs" element={<PublicApiDocsPage />} />
                
                <Route element={<AuthGuard />}>
                    <Route element={<Layout><Outlet /></Layout>}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/apps" element={<AppsPage />} />
                        <Route path="/ai-assistant" element={<AIAssistantPage />} />
                        <Route path="/ai-debates" element={<DebateListPage />} />
                        <Route path="/ai-debates/:id" element={<DebateDetailPage />} />
                        <Route path="/ai-lab" element={<AILabPage />} />
                        <Route path="/ai-lab/:id" element={<AILabDetailPage />} />
                        <Route path="/products" element={<Navigate to="/products/list" replace />} />
                        <Route path="/products/list" element={<ProductListPage />} />
                        <Route path="/products/categories" element={<ProductCategoriesPage />} />
                        <Route path="/marketing/coupons" element={<CouponPage />} />
                        <Route path="/users" element={<UsersPage />} />
                        <Route path="/orders" element={<Navigate to="/orders/list" replace />} />
                        <Route path="/orders/list" element={<OrdersPage />} />
                        <Route path="/orders/refunds" element={<OrderRefundsPage />} />
                        <Route path="/orders/subscriptions" element={<SubscriptionsPage />} />
                        {/* System Routes */}
                        <Route path="/sys/webhooks" element={<WebhookPage />} />
                        <Route path="/sys/integration" element={<SysIntegrationPage />} />
                        <Route path="/sys/database" element={<SysDatabasePage />} />
                        <Route path="/sys/logs" element={<SysLogsPage />} />
                        <Route path="/sys/audit" element={<AuditLogsPage />} />
                        <Route path="/sys/api" element={<SysApiMgmtPage />} />
                        <Route path="/sys/ai-agent" element={<SysAIAgentPage />} />
                        <Route path="/sys/skills" element={<SkillsPage />} />
                        <Route path="/sys/prompts" element={<PromptsPage />} />
                        <Route path="/sys/identity" element={<SysIdentityPage />} />
                        <Route path="/sys/ai-gateway" element={<SysAIGatewayPage />} />
                        <Route path="/sys/account/change-password" element={<ChangePasswordPage />} />
                        <Route path="/about" element={<AboutPage />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Route>
                </Route>
                </Routes>
              </PageHeaderProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </I18nProvider>
    </BrowserRouter>
  )
}

export default App

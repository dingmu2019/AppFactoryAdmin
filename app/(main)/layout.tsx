import { Layout } from '../../components/Layout';
import { AuthGuard } from '../../components/AuthGuard';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Layout>
        {children}
      </Layout>
    </AuthGuard>
  );
}

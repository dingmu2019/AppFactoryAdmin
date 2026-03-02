
'use client';

import { AuthProvider, I18nProvider, PageHeaderProvider, ThemeProvider, ToastProvider } from '@/contexts';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <PageHeaderProvider>
              {children}
            </PageHeaderProvider>
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

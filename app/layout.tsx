import { Providers } from '../components/providers/Providers';
import '../index.css';

export const metadata = {
  title: 'Super Indie Console',
  description: 'Super Indie Admin Console',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

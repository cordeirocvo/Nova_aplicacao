import './globals.css';
import { Montserrat } from 'next/font/google';
import { Providers } from '@/components/Providers';
import MainLayout from '@/components/MainLayout';

const montserrat = Montserrat({ 
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['100', '300', '400', '700', '900'],
  display: 'swap',
});

export const metadata = {
  title: 'Cordeiro Energia | Dashboard',
  description: 'Sistema de Gestão e Monitoramento de Ativos',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={montserrat.variable}>
      <body className={`${montserrat.className} antialiased min-h-screen bg-slate-50 text-slate-900`} suppressHydrationWarning>
        <Providers>
          <MainLayout>
            {children}
          </MainLayout>
        </Providers>
      </body>
    </html>
  );
}

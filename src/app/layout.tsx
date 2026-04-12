import React from 'react';
import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import MainLayout from '@/components/MainLayout';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cordeiro Energia | Dashboard',
  description: 'Plataforma de gestão Cordeiro Energia',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        <Providers>
          <MainLayout>
            {children}
          </MainLayout>
        </Providers>
      </body>
    </html>
  );
}

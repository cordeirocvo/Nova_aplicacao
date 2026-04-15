"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  LayoutDashboard, ListTodo, PlusCircle, Settings, LogOut,
  Menu, X, Zap, Users, Sun, Battery, BarChart3, Package,
  BatteryCharging, ChevronDown, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

interface NavItem { name: string; href: string; icon: React.ElementType; adminOnly?: boolean; badge?: string; }
interface NavSection { title: string; items: NavItem[]; }

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Acompanhamento',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, adminOnly: true },
      { name: 'Atividades', href: '/atividades', icon: ListTodo },
      { name: 'Nova Atividade', href: '/atividades/nova', icon: PlusCircle },
      { name: 'Gestão de Usuários', href: '/admin/usuarios', icon: Users, adminOnly: true },
      { name: 'Config. de Status', href: '/admin/status', icon: Settings, adminOnly: true },
    ],
  },
  {
    title: 'Engenharia & Cálculos',
    items: [
      { name: 'Projetos', href: '/engenharia', icon: BarChart3 },
      { name: 'Análise de Consumo', href: '/engenharia/analise-consumo', icon: Sun },
      { name: 'Dimensionamento BESS', href: '/engenharia/bess', icon: Battery, badge: 'Em breve' },
      { name: 'Sistema Fotovoltaico', href: '/engenharia/solar', icon: Sun, badge: 'Em breve' },
      { name: 'Equipamentos', href: '/engenharia/equipamentos', icon: Package, badge: 'Em breve' },
      { name: 'Carregadores VE', href: '/carregamento', icon: BatteryCharging },
    ],
  },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (session?.user) {
      const role = (session.user as any)?.role;
      if (role === 'TV' && pathname !== '/atividades') router.replace('/atividades');
    }
  }, [session, pathname, router]);

  if (!session) return <>{children}</>;

  const role = (session.user as any)?.role || 'USER';
  const isTV = role === 'TV';

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  };

  const visibleSections = NAV_SECTIONS.map(s => ({
    ...s,
    items: s.items.filter(item => !item.adminOnly || role === 'ADMIN'),
  })).filter(s => s.items.length > 0 && !isTV);

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden text-slate-800">

      {/* TV Header */}
      {isTV && (
        <div className="fixed top-0 w-full h-14 bg-[#0A192F] text-white flex items-center justify-between px-6 z-50 shadow-lg">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-7 object-contain" />
            <span className="font-bold">Cordeiro Energia | Monitoramento TV</span>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      )}

      {/* Mobile Header */}
      {!isTV && (
        <div className="md:hidden fixed top-0 w-full h-16 bg-[#0A192F] text-white flex items-center justify-between px-4 z-40 shadow-md">
          <div className="flex items-center gap-2 font-bold text-lg">
            <img src="/logo.png" alt="Logo" className="h-8 object-contain" />
            <span>Cordeiro Energia</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      )}

      {/* Sidebar */}
      {!isTV && (
        <aside className={clsx(
          "fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#0A192F] text-slate-300 transition-transform duration-300 ease-in-out flex flex-col",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
          <div className="h-16 hidden md:flex items-center gap-3 px-6 bg-[#081324] border-b border-slate-800">
            <img src="/logo.png" alt="Logo" className="h-8 object-contain" />
            <span className="text-white font-bold text-xl tracking-tight">Cordeiro</span>
          </div>

          <div className="flex-1 overflow-y-auto py-4 px-3">
            {visibleSections.map((section) => {
              const isCollapsed = collapsedSections.has(section.title);
              const isEng = section.title === 'Engenharia & Cálculos';
              return (
                <div key={section.title} className="mb-4">
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between px-2 py-1.5 mb-1 rounded-lg hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isEng && <Zap className="w-3 h-3 text-[#00BFA5]" />}
                      <span className={clsx("text-[10px] font-black uppercase tracking-widest", isEng ? "text-[#00BFA5]" : "text-slate-500")}>
                        {section.title}
                      </span>
                    </div>
                    {isCollapsed ? <ChevronRight className="w-3 h-3 text-slate-600" /> : <ChevronDown className="w-3 h-3 text-slate-600" />}
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href + '/'));
                        const disabled = !!item.badge;
                        return (
                          <Link
                            key={item.name}
                            href={disabled ? '#' : item.href}
                            onClick={() => { if (!disabled) setIsMobileMenuOpen(false); }}
                            className={clsx(
                              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                              isActive ? "bg-[#1E3A8A] text-white font-medium shadow-md shadow-blue-900/20"
                                : disabled ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-slate-800/50 hover:text-white"
                            )}
                          >
                            <item.icon className={clsx("w-4 h-4 shrink-0", isActive ? "text-[#00BFA5]" : "text-slate-400 group-hover:text-[#00BFA5]")} />
                            <span className="text-sm flex-1">{item.name}</span>
                            {item.badge && (
                              <span className="text-[9px] font-black bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full uppercase">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-4 border-t border-slate-800/50" />
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-[#081324] border-t border-slate-800">
            <div className="flex items-center gap-3 px-3 py-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#00BFA5] flex items-center justify-center text-white font-bold text-sm">
                {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-sm font-medium text-white truncate">{session?.user?.name || session?.user?.email}</span>
                <span className="text-xs text-slate-500">{role}</span>
              </div>
            </div>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </aside>
      )}

      <main className={clsx("flex-1 flex flex-col min-w-0 overflow-y-auto", isTV ? "pt-14" : "pt-16 md:pt-0")}>
        <div className={clsx("flex-1", isTV ? "p-0" : "p-4 md:p-8")}>
          {children}
        </div>
      </main>

      {isMobileMenuOpen && !isTV && (
        <div className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}
    </div>
  );
}

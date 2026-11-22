/**
 * PainelLayout.tsx
 * Layout do painel interno (ADMIN e OPERADOR):
 * - Desktop (lg+): sidebar fixa escura com ícones e seções.
 * - Celular/tablet: header com botão hambúrguer que abre a sidebar como drawer.
 * - Header com avatar, nome, papel e botão de sair.
 * Os itens do menu são filtrados pelo papel do usuário logado.
 */
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Grid3x3,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  SquareParking,
  Tag,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Logo } from '../components/Logo';
import { useAssistenteStore } from '../stores/assistenteStore';
import { useAuthStore } from '../stores/authStore';
import type { Role } from '../types';
import { ROLE_LABEL } from '../utils/format';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

const BOTH: Role[] = ['ADMIN', 'OPERADOR'];
const ADMIN: Role[] = ['ADMIN'];

const sections: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Visão geral',
    items: [
      { to: '/painel/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ADMIN },
      { to: '/painel/assistente', label: 'Assistente IA', icon: Sparkles, roles: ADMIN },
    ],
  },
  {
    title: 'Operação',
    items: [
      { to: '/painel/mapa', label: 'Mapa de vagas', icon: SquareParking, roles: BOTH },
      { to: '/painel/entrada', label: 'Registrar entrada', icon: ArrowRight, roles: BOTH },
      { to: '/painel/saida', label: 'Registrar saída', icon: ArrowLeft, roles: BOTH },
      { to: '/painel/historico', label: 'Histórico', icon: History, roles: BOTH },
      { to: '/painel/clientes', label: 'Clientes e mensalistas', icon: Users, roles: BOTH },
    ],
  },
  {
    title: 'Administração',
    items: [
      { to: '/painel/vagas', label: 'Vagas', icon: Grid3x3, roles: ADMIN },
      { to: '/painel/precos', label: 'Tabela de preços', icon: Tag, roles: ADMIN },
      { to: '/painel/funcionarios', label: 'Funcionários', icon: UserCog, roles: ADMIN },
    ],
  },
];

/** Conteúdo da sidebar (reaproveitado no desktop e no drawer do celular). */
function SidebarContent({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {sections.map((section) => {
        const items = section.items.filter((item) => item.roles.includes(role));
        if (!items.length) return null;
        return (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-500">{section.title}</p>
            <ul className="space-y-1">
              {items.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                        isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/30' : 'text-ink-300 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function PainelLayout() {
  const { user, logout } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const clearAssistente = useAssistenteStore((state) => state.clearMessages);

  // Fecha o drawer ao trocar de página.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Sidebar fixa (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ink-950 lg:flex">
        <div className="px-6 py-5">
          <Logo variant="light" subtitle="Painel interno" />
        </div>
        <SidebarContent role={user.role} />
      </aside>

      {/* Drawer (celular/tablet) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-ink-950/60" onClick={() => setDrawerOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85%] animate-slide-in flex-col bg-ink-950">
            <div className="flex items-center justify-between px-5 py-5">
              <Logo variant="light" subtitle="Painel interno" />
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 text-ink-400 hover:bg-white/10 hover:text-white" aria-label="Fechar menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent role={user.role} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-ink-100 bg-white/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setDrawerOpen(true)} className="-ml-1 rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden" aria-label="Abrir menu">
              <Menu className="h-6 w-6" />
            </button>
            <div className="lg:hidden">
              <Logo />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-ink-900">{user.nome}</p>
              <p className="text-xs text-ink-500">{ROLE_LABEL[user.role]}</p>
            </div>
            <Avatar name={user.nome} url={user.avatarUrl} />
            <button
              onClick={() => {
                clearAssistente();
                logout();
              }}
              className="ml-1 inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-ink-500 transition-colors hover:bg-occupied-50 hover:text-occupied-600"
              title="Sair"
            >
              <LogOut className="h-[18px] w-[18px]" />
              <span className="hidden md:inline">Sair</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

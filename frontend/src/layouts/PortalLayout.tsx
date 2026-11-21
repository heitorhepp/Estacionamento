/**
 * PortalLayout.tsx
 * Layout do portal do cliente — mais leve e amigável que o painel:
 * header claro com navegação no desktop e barra de abas inferior no celular
 * (padrão de app, fácil de alcançar com o polegar).
 */
import { NavLink, Outlet } from 'react-router-dom';
import { Car, Home, LogOut, ReceiptText, User, Wallet, type LucideIcon } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Logo } from '../components/Logo';
import { useAuthStore } from '../stores/authStore';

const navItems: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }> = [
  { to: '/portal', label: 'Início', icon: Home, end: true },
  { to: '/portal/veiculos', label: 'Veículos', icon: Car },
  { to: '/portal/estadias', label: 'Estadias', icon: ReceiptText },
  { to: '/portal/mensalidade', label: 'Mensalidade', icon: Wallet },
  { to: '/portal/perfil', label: 'Perfil', icon: User },
];

export function PortalLayout() {
  const { user, logout } = useAuthStore();
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-ink-50 to-ink-50">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-600 hover:bg-white hover:text-ink-900'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Avatar name={user.nome} url={user.avatarUrl} size="sm" />
            <button
              onClick={logout}
              className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-ink-500 transition-colors hover:bg-occupied-50 hover:text-occupied-600"
              title="Sair"
            >
              <LogOut className="h-[18px] w-[18px]" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 md:pb-12 md:pt-8">
        <Outlet />
      </main>

      {/* Abas inferiores (celular) */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-ink-100 bg-white/95 backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${isActive ? 'text-brand-600' : 'text-ink-400'}`
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

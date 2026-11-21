/**
 * AuthLayout.tsx
 * Layout das telas de login e cadastro: painel da marca à esquerda (desktop) com as
 * vagas livres em tempo real, e o formulário à direita.
 */
import type { ReactNode } from 'react';
import { ShieldCheck, Sparkles, Timer } from 'lucide-react';
import { AvailableSpots } from '../components/AvailableSpots';
import { Logo } from '../components/Logo';

const highlights = [
  { icon: Sparkles, text: 'Leitura de placa por IA na entrada' },
  { icon: Timer, text: 'Cobrança automática e transparente' },
  { icon: ShieldCheck, text: 'Mensalistas reconhecidos na hora' },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white">
      <aside className="relative hidden w-[46%] max-w-2xl flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-ink-950 p-12 text-white lg:flex">
        {/* Grade decorativa lembrando as faixas de um estacionamento */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(90deg, #fff 2px, transparent 2px), linear-gradient(#fff 2px, transparent 2px)',
            backgroundSize: '72px 120px',
          }}
        />
        <div className="relative">
          <Logo variant="light" />
        </div>
        <div className="relative">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
            O pátio inteiro
            <br />
            na palma da mão.
          </h2>
          <ul className="mt-8 space-y-3">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-brand-100">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <AvailableSpots variant="glass" />
        </div>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>
        <div className="w-full max-w-md animate-fade-in">{children}</div>
      </main>
    </div>
  );
}

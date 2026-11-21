/**
 * AvailableSpots.tsx
 * Vagas livres por tipo, em "tempo real": consulta pública (sem login) atualizada
 * a cada 15 s. Usada na tela de login e no portal do cliente.
 */
import { Bike, Car } from 'lucide-react';
import { useAsync } from '../hooks/useAsync';
import { spotService } from '../services/spot.service';
import { Skeleton } from './Skeleton';

const REFRESH_MS = 15_000;

export function AvailableSpots({ variant = 'light' }: { variant?: 'light' | 'glass' }) {
  const { data, loading } = useAsync(spotService.available, [], REFRESH_MS);
  const glass = variant === 'glass';

  return (
    <div>
      <div className={`mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${glass ? 'text-brand-100' : 'text-ink-500'}`}>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-free-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-free-500" />
        </span>
        Vagas livres agora
      </div>
      <div className="grid grid-cols-2 gap-3">
        {loading && !data
          ? [0, 1].map((i) => <Skeleton key={i} className="h-24" />)
          : data?.map((item) => {
              const Icon = item.tipo === 'CARRO' ? Car : Bike;
              return (
                <div
                  key={item.tipo}
                  className={`rounded-2xl p-4 transition-transform duration-200 hover:-translate-y-0.5 ${
                    glass ? 'bg-white/10 text-white ring-1 ring-white/15 backdrop-blur' : 'border border-ink-100 bg-white shadow-soft'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`h-5 w-5 ${glass ? 'text-brand-100' : 'text-brand-600'}`} />
                    <span className={`text-xs font-medium ${glass ? 'text-brand-100' : 'text-ink-400'}`}>de {item.total}</span>
                  </div>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight">{item.livres}</p>
                  <p className={`text-sm ${glass ? 'text-brand-100' : 'text-ink-500'}`}>{item.tipo === 'CARRO' ? 'para carros' : 'para motos'}</p>
                </div>
              );
            })}
      </div>
    </div>
  );
}

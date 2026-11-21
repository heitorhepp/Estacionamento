/**
 * NotFound.tsx
 * Página 404 para rotas inexistentes.
 */
import { Link } from 'react-router-dom';
import { SquareParking } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
        <SquareParking className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-3xl font-extrabold text-ink-900">Vaga não encontrada</h1>
      <p className="mt-2 text-ink-500">A página que você procura não existe ou foi movida.</p>
      <Link to="/" className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">
        Voltar ao início
      </Link>
    </div>
  );
}

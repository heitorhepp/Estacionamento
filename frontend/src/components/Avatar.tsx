/**
 * Avatar.tsx
 * Foto do usuário (ex.: vinda do Google) ou iniciais do nome sobre a cor da marca.
 */
import { initials } from '../utils/format';

export function Avatar({ name, url, size = 'md' }: { name: string; url?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-xl' };
  if (url) return <img src={url} alt={name} referrerPolicy="no-referrer" className={`${sizes[size]} rounded-full object-cover ring-2 ring-white`} />;
  return (
    <span className={`${sizes[size]} inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white ring-2 ring-white`}>
      {initials(name)}
    </span>
  );
}

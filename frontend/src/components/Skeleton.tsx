/**
 * Skeleton.tsx
 * Blocos cinza animados exibidos enquanto os dados carregam.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-ink-200/70 ${className}`} />;
}

/** Skeleton de lista: várias linhas. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

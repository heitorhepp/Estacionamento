/**
 * Table.tsx
 * Tabela responsiva: no desktop é uma tabela; no celular (< md) vira uma lista de cards,
 * com o rótulo de cada coluna ao lado do valor. Inclui skeleton e estado vazio.
 */
import type { ReactNode } from 'react';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { SkeletonList } from './Skeleton';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Esconde a coluna no card do celular (ex.: ações, que vão no rodapé do card). */
  hideOnMobile?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[] | null | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  /** Título do card no celular (ex.: placa ou nome). */
  mobileTitle?: (row: T) => ReactNode;
  /** Ações mostradas no rodapé do card no celular. */
  mobileActions?: (row: T) => ReactNode;
  empty?: { title: string; description?: string; icon?: ReactNode; action?: ReactNode };
}

export function Table<T>({ columns, rows, rowKey, loading, onRowClick, mobileTitle, mobileActions, empty }: TableProps<T>) {
  if (loading) {
    return (
      <Card className="p-4">
        <SkeletonList rows={6} />
      </Card>
    );
  }

  if (!rows?.length) {
    return (
      <Card>
        <EmptyState title={empty?.title ?? 'Nada por aqui ainda'} description={empty?.description} icon={empty?.icon} action={empty?.action} />
      </Card>
    );
  }

  return (
    <>
      {/* Desktop/tablet: tabela */}
      <Card className="hidden overflow-hidden md:block">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/70">
                {columns.map((column) => (
                  <th key={column.header} className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500 ${column.className ?? ''}`}>
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-brand-50/40' : 'hover:bg-ink-50/60'}`}
                >
                  {columns.map((column) => (
                    <td key={column.header} className={`px-4 py-3.5 text-ink-700 ${column.className ?? ''}`}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Celular: lista de cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <Card key={rowKey(row)} className="overflow-hidden">
            <div
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`p-4 ${onRowClick ? 'cursor-pointer active:bg-ink-50' : ''}`}
            >
              {mobileTitle && <div className="mb-3 font-semibold text-ink-900">{mobileTitle(row)}</div>}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                {columns
                  .filter((column) => !column.hideOnMobile)
                  .map((column) => (
                    <div key={column.header} className="min-w-0">
                      <dt className="text-xs text-ink-400">{column.header}</dt>
                      <dd className="mt-0.5 truncate text-ink-700">{column.cell(row)}</dd>
                    </div>
                  ))}
              </dl>
            </div>
            {mobileActions && <div className="flex justify-end gap-2 border-t border-ink-100 bg-ink-50/50 px-3 py-2">{mobileActions(row)}</div>}
          </Card>
        ))}
      </div>
    </>
  );
}

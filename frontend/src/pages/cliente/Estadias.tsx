/**
 * Estadias.tsx
 * Histórico de estadias do cliente: data, veículo, vaga, tempo e valor pago.
 */
import { useState } from 'react';
import { ReceiptText } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { PlateBadge } from '../../components/PlateBadge';
import { Table, type Column } from '../../components/Table';
import { useAsync } from '../../hooks/useAsync';
import { portalService } from '../../services/portal.service';
import type { Stay } from '../../types';
import { PAYMENT_LABEL, formatCurrency, formatDateTime, formatDuration } from '../../utils/format';

const PAGE_SIZE = 10;

export function Estadias() {
  const [page, setPage] = useState(1);
  const { data, loading } = useAsync(() => portalService.listStays(page, PAGE_SIZE), [page]);

  const columns: Column<Stay>[] = [
    { header: 'Veículo', cell: (s) => <PlateBadge plate={s.placa} size="sm" />, hideOnMobile: true },
    { header: 'Entrada', cell: (s) => formatDateTime(s.dataHoraEntrada) },
    { header: 'Saída', cell: (s) => (s.dataHoraSaida ? formatDateTime(s.dataHoraSaida) : <Badge tone="brand" dot>No pátio</Badge>) },
    { header: 'Vaga', cell: (s) => s.vaga.codigo },
    { header: 'Tempo', cell: (s) => formatDuration(s.minutosPermanencia) },
    {
      header: 'Valor',
      cell: (s) =>
        s.formaPagamento === 'MENSALISTA' ? (
          <Badge tone="free">Mensalidade</Badge>
        ) : (
          <span className="font-semibold text-ink-900">{s.status === 'ABERTA' ? '—' : formatCurrency(s.valorCobrado)}</span>
        ),
    },
    { header: 'Pagamento', cell: (s) => (s.formaPagamento ? PAYMENT_LABEL[s.formaPagamento] : '—') },
  ];

  return (
    <>
      <PageHeader title="Minhas estadias" subtitle="Histórico de uso do estacionamento pelos seus veículos." />
      <Table
        columns={columns}
        rows={data?.data}
        rowKey={(s) => s.id}
        loading={loading}
        mobileTitle={(s) => (
          <div className="flex items-center justify-between">
            <PlateBadge plate={s.placa} />
            <span className="text-sm font-normal text-ink-500">{s.modelo}</span>
          </div>
        )}
        empty={{ icon: <ReceiptText className="h-7 w-7" />, title: 'Nenhuma estadia ainda', description: 'Quando seu veículo cadastrado usar o estacionamento, a estadia aparece aqui.' }}
      />
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
    </>
  );
}

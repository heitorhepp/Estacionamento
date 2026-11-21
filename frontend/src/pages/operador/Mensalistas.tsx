/**
 * Mensalistas.tsx
 * Clientes e mensalistas (ADMIN e OPERADOR): busca, filtro por situação, CRUD em modal,
 * detalhes com veículos e histórico de pagamentos, e registro de pagamento da mensalidade.
 */
import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, Receipt, Search, Trash2, Users, Wallet } from 'lucide-react';
import { MembershipBadge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Input, Toggle } from '../../components/FormFields';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { PlateBadge } from '../../components/PlateBadge';
import { Skeleton } from '../../components/Skeleton';
import { Table, type Column } from '../../components/Table';
import { useAsync } from '../../hooks/useAsync';
import { useForm } from '../../hooks/useForm';
import { customerService } from '../../services/customer.service';
import type { Customer, MembershipStatus } from '../../types';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';
import { formatCurrency, formatDateKey, formatDateTime, formatMonthRef, maskCpf, maskPhone, todayKey } from '../../utils/format';

const PAGE_SIZE = 15;

const filterChips: Array<{ value: MembershipStatus | ''; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'EM_DIA', label: 'Mensalistas em dia' },
  { value: 'VENCIDA', label: 'Vencidos' },
  { value: 'NAO_MENSALISTA', label: 'Avulsos' },
];

const emptyForm = { nome: '', email: '', telefone: '', cpf: '', senha: '', mensalista: false, valorMensal: '', dataVencimento: '' };

export function Mensalistas() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<MembershipStatus | ''>('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Customer | 'new' | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Customer | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm(emptyForm);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [search]);

  const { data, loading, reload } = useAsync(
    () => customerService.list({ busca: debounced || undefined, situacao: status || undefined, page, pageSize: PAGE_SIZE }),
    [debounced, status, page],
  );

  function openForm(customer: Customer | 'new') {
    setEditing(customer);
    form.reset(
      customer === 'new'
        ? emptyForm
        : {
            nome: customer.usuario.nome,
            email: customer.usuario.email,
            telefone: customer.telefone ? maskPhone(customer.telefone) : '',
            cpf: customer.cpf ? maskCpf(customer.cpf) : '',
            senha: '',
            mensalista: customer.mensalista,
            valorMensal: customer.valorMensal ?? '',
            dataVencimento: customer.dataVencimento ?? '',
          },
    );
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    const v = form.values;
    const e: Record<string, string> = {};
    if (v.nome.trim().length < 2) e.nome = 'Informe o nome.';
    if (!/^\S+@\S+\.\S+$/.test(v.email)) e.email = 'Email inválido.';
    if (v.cpf && v.cpf.replace(/\D/g, '').length !== 11) e.cpf = 'O CPF deve ter 11 dígitos.';
    if (v.senha && v.senha.length < 8) e.senha = 'Mínimo de 8 caracteres.';
    if (v.mensalista && !(Number(v.valorMensal) > 0)) e.valorMensal = 'Informe o valor da mensalidade.';
    if (Object.keys(e).length) return form.setErrors(e);

    const payload = {
      nome: v.nome.trim(),
      email: v.email.trim(),
      telefone: v.telefone || null,
      cpf: v.cpf || null,
      mensalista: v.mensalista,
      valorMensal: v.mensalista ? Number(v.valorMensal) : null,
      dataVencimento: v.mensalista ? v.dataVencimento || null : null,
    };

    setBusy(true);
    try {
      if (editing === 'new') await customerService.create({ ...payload, senha: v.senha || undefined });
      else if (editing) await customerService.update(editing.id, payload);
      toast.success(editing === 'new' ? 'Cliente cadastrado.' : 'Cliente atualizado.');
      setEditing(null);
      reload(true);
    } catch (err) {
      form.setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setBusy(true);
    try {
      await customerService.remove(toDelete.id);
      toast.success('Cliente excluído.');
      setToDelete(null);
      reload(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const actions = (c: Customer) => (
    <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
      <Button size="sm" variant="ghost" onClick={() => openForm(c)} aria-label="Editar" icon={<Pencil className="h-4 w-4" />} />
      <Button size="sm" variant="ghost" onClick={() => setToDelete(c)} aria-label="Excluir" icon={<Trash2 className="h-4 w-4 text-occupied-600" />} />
    </div>
  );

  const columns: Column<Customer>[] = [
    {
      header: 'Cliente',
      hideOnMobile: true,
      cell: (c) => (
        <div>
          <p className="font-semibold text-ink-900">{c.usuario.nome}</p>
          <p className="text-xs text-ink-500">{c.usuario.email}</p>
        </div>
      ),
    },
    { header: 'Telefone', cell: (c) => (c.telefone ? maskPhone(c.telefone) : '—') },
    { header: 'Situação', cell: (c) => <MembershipBadge status={c.situacaoMensalidade} /> },
    { header: 'Mensalidade', cell: (c) => (c.mensalista ? formatCurrency(c.valorMensal) : '—') },
    { header: 'Vencimento', cell: (c) => (c.mensalista ? formatDateKey(c.dataVencimento) : '—') },
    { header: 'Veículos', cell: (c) => c._count?.veiculos ?? 0 },
    { header: '', cell: actions, hideOnMobile: true, className: 'w-24' },
  ];

  return (
    <>
      <PageHeader
        title="Clientes e mensalistas"
        subtitle="Cadastre clientes, acompanhe vencimentos e registre pagamentos."
        actions={
          <Button onClick={() => openForm('new')} icon={<Plus className="h-4 w-4" />}>
            Novo cliente
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-sm">
          <Input placeholder="Buscar por nome, email ou CPF" icon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="scrollbar-thin -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
          {filterChips.map((chip) => (
            <button
              key={chip.value}
              onClick={() => {
                setStatus(chip.value);
                setPage(1);
              }}
              className={`h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-colors ${
                status === chip.value ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-50'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <Table
        columns={columns}
        rows={data?.data}
        rowKey={(c) => c.id}
        loading={loading}
        onRowClick={(c) => setDetailsId(c.id)}
        mobileTitle={(c) => (
          <div>
            {c.usuario.nome}
            <p className="text-xs font-normal text-ink-500">{c.usuario.email}</p>
          </div>
        )}
        mobileActions={actions}
        empty={{
          icon: <Users className="h-7 w-7" />,
          title: 'Nenhum cliente encontrado',
          description: debounced || status ? 'Tente outra busca ou filtro.' : 'Cadastre o primeiro cliente.',
        }}
      />
      {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}

      {/* Criar/editar */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Novo cliente' : 'Editar cliente'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" form="customer-form" loading={busy}>
              Salvar
            </Button>
          </>
        }
      >
        <form id="customer-form" onSubmit={handleSave} noValidate className="space-y-4">
          <Input label="Nome" value={form.values.nome} onChange={(e) => form.setField('nome', e.target.value)} error={form.errors.nome} />
          <Input label="Email" type="email" value={form.values.email} onChange={(e) => form.setField('email', e.target.value)} error={form.errors.email} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Telefone" inputMode="tel" value={form.values.telefone} onChange={(e) => form.setField('telefone', maskPhone(e.target.value))} error={form.errors.telefone} />
            <Input label="CPF" inputMode="numeric" value={form.values.cpf} onChange={(e) => form.setField('cpf', maskCpf(e.target.value))} error={form.errors.cpf} />
          </div>
          {editing === 'new' && (
            <Input
              label="Senha de acesso ao portal (opcional)"
              type="password"
              hint="Sem senha, o cliente pode entrar com o Google usando o mesmo email."
              value={form.values.senha}
              onChange={(e) => form.setField('senha', e.target.value)}
              error={form.errors.senha}
            />
          )}
          <Toggle
            label="Mensalista"
            description="Mensalistas em dia não pagam pelas estadias (um veículo por vez)."
            checked={form.values.mensalista}
            onChange={(v) => form.setField('mensalista', v)}
          />
          {form.values.mensalista && (
            <div className="grid animate-fade-in gap-4 sm:grid-cols-2">
              <Input
                label="Valor mensal (R$)"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.values.valorMensal}
                onChange={(e) => form.setField('valorMensal', e.target.value)}
                error={form.errors.valorMensal}
              />
              <Input
                label="Vencimento"
                type="date"
                hint="Deixe vazio até o primeiro pagamento."
                value={form.values.dataVencimento}
                onChange={(e) => form.setField('dataVencimento', e.target.value)}
                error={form.errors.dataVencimento}
              />
            </div>
          )}
        </form>
      </Modal>

      <CustomerDetailsModal customerId={detailsId} onClose={() => setDetailsId(null)} onChanged={() => reload(true)} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Excluir cliente"
        message={
          <>
            Excluir <strong>{toDelete?.usuario.nome}</strong> e seus veículos? O histórico de estadias é mantido. Clientes com pagamentos de mensalidade não podem
            ser excluídos.
          </>
        }
        confirmLabel="Excluir"
        loading={busy}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}

/** Detalhes do cliente: veículos, histórico de pagamentos e registro de novo pagamento. */
function CustomerDetailsModal({ customerId, onClose, onChanged }: { customerId: string | null; onClose: () => void; onChanged: () => void }) {
  const { data: customer, loading, reload } = useAsync(() => (customerId ? customerService.get(customerId) : Promise.resolve(null)), [customerId]);
  const [reference, setReference] = useState(todayKey().slice(0, 7));
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAmount(customer?.valorMensal ?? '');
    setError('');
  }, [customer]);

  async function registerPayment() {
    if (!customer) return;
    if (!/^\d{4}-\d{2}$/.test(reference)) return setError('Informe o mês de referência.');
    setSaving(true);
    try {
      const result = await customerService.registerPayment(customer.id, { referenciaMes: reference, valor: amount ? Number(amount) : undefined });
      toast.success(`Pagamento registrado. Novo vencimento: ${formatDateKey(result.novoVencimento)}.`);
      reload(true);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={Boolean(customerId)} onClose={onClose} title={customer?.usuario.nome ?? 'Cliente'} description={customer?.usuario.email} size="lg">
      {loading || !customer ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs text-ink-500">Situação</p>
              <div className="mt-1.5">
                <MembershipBadge status={customer.situacaoMensalidade} />
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-ink-500">Mensalidade</p>
              <p className="mt-1 font-bold text-ink-900">{customer.mensalista ? formatCurrency(customer.valorMensal) : '—'}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-ink-500">Vencimento</p>
              <p className={`mt-1 font-bold ${customer.situacaoMensalidade === 'VENCIDA' ? 'text-overdue-600' : 'text-ink-900'}`}>{formatDateKey(customer.dataVencimento)}</p>
            </Card>
          </div>

          {customer.mensalista && (
            <section className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink-900">
                <Wallet className="h-4 w-4 text-brand-600" /> Registrar pagamento
              </h3>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Input label="Mês de referência" type="month" value={reference} onChange={(e) => (setReference(e.target.value), setError(''))} />
                <Input label="Valor (R$)" type="number" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <Button onClick={registerPayment} loading={saving}>
                  Registrar
                </Button>
              </div>
              {error && <p className="mt-2 text-xs font-medium text-occupied-600">{error}</p>}
              <p className="mt-2 text-xs text-ink-500">O vencimento avança 1 mês a cada pagamento.</p>
            </section>
          )}

          <section>
            <h3 className="mb-3 font-semibold text-ink-900">Veículos</h3>
            {customer.veiculos?.length ? (
              <div className="flex flex-wrap gap-3">
                {customer.veiculos.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 rounded-xl border border-ink-100 px-3 py-2">
                    <PlateBadge plate={v.placa} size="sm" />
                    <span className="text-sm text-ink-600">
                      {v.modelo} · {v.cor}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-500">Nenhum veículo cadastrado. O cliente cadastra pelo portal.</p>
            )}
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink-900">
              <Receipt className="h-4 w-4 text-ink-400" /> Histórico de pagamentos
            </h3>
            {customer.pagamentos?.length ? (
              <ul className="divide-y divide-ink-100 rounded-xl border border-ink-100">
                {customer.pagamentos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div>
                      <p className="font-semibold text-ink-800">Referência {formatMonthRef(p.referenciaMes)}</p>
                      <p className="text-xs text-ink-500">
                        {formatDateTime(p.dataPagamento)}
                        {p.operador && ` · ${p.operador.nome}`}
                      </p>
                    </div>
                    <span className="font-bold text-free-700">{formatCurrency(p.valor)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">Nenhum pagamento registrado.</p>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}

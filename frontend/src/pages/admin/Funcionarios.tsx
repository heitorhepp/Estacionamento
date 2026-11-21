/**
 * Funcionarios.tsx
 * CRUD de funcionários (ADMIN). É o único jeito de criar contas de ADMIN/OPERADOR:
 * funcionários não se cadastram pela tela pública nem entram com Google.
 */
import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Plus, Trash2, UserCog } from 'lucide-react';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Input, Segmented } from '../../components/FormFields';
import { Modal } from '../../components/Modal';
import { PageHeader } from '../../components/PageHeader';
import { Table, type Column } from '../../components/Table';
import { useAsync } from '../../hooks/useAsync';
import { useForm } from '../../hooks/useForm';
import { employeeService } from '../../services/employee.service';
import { useAuthStore } from '../../stores/authStore';
import type { Employee } from '../../types';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';
import { ROLE_LABEL, formatDateTime } from '../../utils/format';

type StaffRole = 'ADMIN' | 'OPERADOR';
const emptyForm = { nome: '', email: '', senha: '', role: 'OPERADOR' as StaffRole };

export function Funcionarios() {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { data, loading, reload } = useAsync(employeeService.list, []);
  const [editing, setEditing] = useState<Employee | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Employee | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm(emptyForm);

  function openForm(employee: Employee | 'new') {
    setEditing(employee);
    form.reset(employee === 'new' ? emptyForm : { nome: employee.nome, email: employee.email, senha: '', role: employee.role as StaffRole });
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    const v = form.values;
    const e: Record<string, string> = {};
    if (v.nome.trim().length < 2) e.nome = 'Informe o nome.';
    if (!/^\S+@\S+\.\S+$/.test(v.email)) e.email = 'Email inválido.';
    if (editing === 'new' && v.senha.length < 8) e.senha = 'A senha deve ter no mínimo 8 caracteres.';
    if (editing !== 'new' && v.senha && v.senha.length < 8) e.senha = 'A senha deve ter no mínimo 8 caracteres.';
    if (Object.keys(e).length) return form.setErrors(e);

    setBusy(true);
    try {
      const payload = { nome: v.nome.trim(), email: v.email.trim(), role: v.role, senha: v.senha || undefined };
      if (editing === 'new') await employeeService.create(payload);
      else if (editing) await employeeService.update(editing.id, payload);
      toast.success(editing === 'new' ? 'Funcionário criado.' : 'Funcionário atualizado.');
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
      await employeeService.remove(toDelete.id);
      toast.success('Funcionário excluído.');
      setToDelete(null);
      reload(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const actions = (emp: Employee) => (
    <div className="flex justify-end gap-1">
      <Button size="sm" variant="ghost" aria-label="Editar" onClick={() => openForm(emp)} icon={<Pencil className="h-4 w-4" />} />
      {emp.id !== currentUserId && (
        <Button size="sm" variant="ghost" aria-label="Excluir" onClick={() => setToDelete(emp)} icon={<Trash2 className="h-4 w-4 text-occupied-600" />} />
      )}
    </div>
  );

  const columns: Column<Employee>[] = [
    {
      header: 'Funcionário',
      hideOnMobile: true,
      cell: (emp) => (
        <div className="flex items-center gap-3">
          <Avatar name={emp.nome} url={emp.avatarUrl} size="sm" />
          <div>
            <p className="font-semibold text-ink-900">
              {emp.nome} {emp.id === currentUserId && <span className="text-xs font-normal text-ink-400">(você)</span>}
            </p>
            <p className="text-xs text-ink-500">{emp.email}</p>
          </div>
        </div>
      ),
    },
    { header: 'Perfil', cell: (emp) => <Badge tone={emp.role === 'ADMIN' ? 'brand' : 'ink'}>{ROLE_LABEL[emp.role]}</Badge> },
    { header: 'Criado em', cell: (emp) => formatDateTime(emp.createdAt) },
    { header: '', cell: actions, hideOnMobile: true, className: 'w-24' },
  ];

  return (
    <>
      <PageHeader
        title="Funcionários"
        subtitle="Contas de acesso ao painel interno."
        actions={
          <Button onClick={() => openForm('new')} icon={<Plus className="h-4 w-4" />}>
            Novo funcionário
          </Button>
        }
      />

      <Table
        columns={columns}
        rows={data}
        rowKey={(emp) => emp.id}
        loading={loading}
        mobileTitle={(emp) => (
          <div className="flex items-center gap-3">
            <Avatar name={emp.nome} url={emp.avatarUrl} size="sm" />
            <div>
              {emp.nome}
              <p className="text-xs font-normal text-ink-500">{emp.email}</p>
            </div>
          </div>
        )}
        mobileActions={actions}
        empty={{ icon: <UserCog className="h-7 w-7" />, title: 'Nenhum funcionário cadastrado' }}
      />

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Novo funcionário' : 'Editar funcionário'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" form="employee-form" loading={busy}>
              Salvar
            </Button>
          </>
        }
      >
        <form id="employee-form" onSubmit={handleSave} noValidate className="space-y-4">
          <Input label="Nome" value={form.values.nome} onChange={(e) => form.setField('nome', e.target.value)} error={form.errors.nome} />
          <Input label="Email" type="email" value={form.values.email} onChange={(e) => form.setField('email', e.target.value)} error={form.errors.email} />
          <Input
            label={editing === 'new' ? 'Senha' : 'Nova senha'}
            type="password"
            autoComplete="new-password"
            hint={editing === 'new' ? 'Mínimo de 8 caracteres.' : 'Deixe em branco para manter a senha atual.'}
            value={form.values.senha}
            onChange={(e) => form.setField('senha', e.target.value)}
            error={form.errors.senha}
          />
          <Segmented
            label="Perfil de acesso"
            value={form.values.role}
            onChange={(v) => form.setField('role', v)}
            options={[
              { value: 'OPERADOR', label: 'Operador' },
              { value: 'ADMIN', label: 'Administrador' },
            ]}
            hint="Administradores também acessam dashboard, IA, vagas, preços e funcionários."
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Excluir funcionário"
        message={
          <>
            Excluir <strong>{toDelete?.nome}</strong>? Funcionários com movimentações ou pagamentos registrados não podem ser excluídos, para preservar o histórico.
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

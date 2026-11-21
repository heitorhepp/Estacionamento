/**
 * Perfil.tsx
 * Perfil do cliente: editar nome, telefone e CPF, e definir/alterar a senha.
 * Quem criou a conta pelo Google define a primeira senha sem informar a atual.
 */
import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { BadgeCheck, KeyRound, Mail } from 'lucide-react';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/FormFields';
import { PageHeader } from '../../components/PageHeader';
import { Skeleton } from '../../components/Skeleton';
import { useAsync } from '../../hooks/useAsync';
import { useForm } from '../../hooks/useForm';
import { portalService } from '../../services/portal.service';
import { useAuthStore } from '../../stores/authStore';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';
import { maskCpf, maskPhone } from '../../utils/format';

export function Perfil() {
  const updateUser = useAuthStore((state) => state.updateUser);
  const { data: profile, loading, setData } = useAsync(portalService.getProfile, []);
  const profileForm = useForm({ nome: '', telefone: '', cpf: '' });
  const passwordForm = useForm({ senhaAtual: '', novaSenha: '', confirmacao: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profile) profileForm.reset({ nome: profile.nome, telefone: profile.telefone ? maskPhone(profile.telefone) : '', cpf: profile.cpf ? maskCpf(profile.cpf) : '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    const v = profileForm.values;
    const e: Record<string, string> = {};
    if (v.nome.trim().length < 2) e.nome = 'Informe seu nome.';
    if (v.cpf && v.cpf.replace(/\D/g, '').length !== 11) e.cpf = 'O CPF deve ter 11 dígitos.';
    if (Object.keys(e).length) return profileForm.setErrors(e);

    setSavingProfile(true);
    try {
      const updated = await portalService.updateProfile({ nome: v.nome.trim(), telefone: v.telefone || null, cpf: v.cpf || null });
      setData(updated);
      updateUser({ nome: updated.nome }); // atualiza o nome no header
      toast.success('Perfil atualizado.');
    } catch (err) {
      profileForm.setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    const v = passwordForm.values;
    const e: Record<string, string> = {};
    if (profile?.temSenha && !v.senhaAtual) e.senhaAtual = 'Informe a senha atual.';
    if (v.novaSenha.length < 8) e.novaSenha = 'A senha deve ter no mínimo 8 caracteres.';
    if (v.confirmacao !== v.novaSenha) e.confirmacao = 'As senhas não conferem.';
    if (Object.keys(e).length) return passwordForm.setErrors(e);

    setSavingPassword(true);
    try {
      await portalService.changePassword({ senhaAtual: v.senhaAtual || undefined, novaSenha: v.novaSenha });
      toast.success(profile?.temSenha ? 'Senha alterada.' : 'Senha definida! Agora você também pode entrar com email e senha.');
      passwordForm.reset({ senhaAtual: '', novaSenha: '', confirmacao: '' });
      if (profile) setData({ ...profile, temSenha: true });
      updateUser({ temSenha: true });
    } catch (err) {
      const message = getErrorMessage(err);
      passwordForm.setErrors({ ...getFieldErrors(err), ...(message.includes('atual') ? { senhaAtual: message } : {}) });
      toast.error(message);
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading || !profile) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Meu perfil" />

      <Card className="mb-6 flex items-center gap-4 p-5">
        <Avatar name={profile.nome} url={profile.avatarUrl} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-ink-900">{profile.nome}</p>
          <p className="flex items-center gap-1.5 truncate text-sm text-ink-500">
            <Mail className="h-4 w-4 shrink-0" /> {profile.email}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.temGoogle && (
              <Badge tone="brand">
                <BadgeCheck className="h-3.5 w-3.5" /> Conta Google vinculada
              </Badge>
            )}
            {profile.mensalista && <Badge tone="free">Mensalista</Badge>}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold text-ink-900">Dados pessoais</h2>
          <form onSubmit={saveProfile} noValidate className="space-y-4">
            <Input label="Nome" value={profileForm.values.nome} onChange={(e) => profileForm.setField('nome', e.target.value)} error={profileForm.errors.nome} />
            <Input label="Email" value={profile.email} disabled hint="O email não pode ser alterado." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Telefone" inputMode="tel" value={profileForm.values.telefone} onChange={(e) => profileForm.setField('telefone', maskPhone(e.target.value))} error={profileForm.errors.telefone} />
              <Input label="CPF" inputMode="numeric" value={profileForm.values.cpf} onChange={(e) => profileForm.setField('cpf', maskCpf(e.target.value))} error={profileForm.errors.cpf} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={savingProfile}>
                Salvar dados
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 flex items-center gap-2 font-semibold text-ink-900">
            <KeyRound className="h-5 w-5 text-ink-400" /> {profile.temSenha ? 'Alterar senha' : 'Definir senha'}
          </h2>
          {!profile.temSenha && <p className="mb-4 text-sm text-ink-500">Você entrou com o Google. Defina uma senha para também entrar com email e senha.</p>}
          <form onSubmit={savePassword} noValidate className="mt-4 space-y-4">
            {profile.temSenha && (
              <Input label="Senha atual" type="password" autoComplete="current-password" value={passwordForm.values.senhaAtual} onChange={(e) => passwordForm.setField('senhaAtual', e.target.value)} error={passwordForm.errors.senhaAtual} />
            )}
            <Input label="Nova senha" type="password" autoComplete="new-password" hint="Mínimo de 8 caracteres." value={passwordForm.values.novaSenha} onChange={(e) => passwordForm.setField('novaSenha', e.target.value)} error={passwordForm.errors.novaSenha} />
            <Input label="Confirmar nova senha" type="password" autoComplete="new-password" value={passwordForm.values.confirmacao} onChange={(e) => passwordForm.setField('confirmacao', e.target.value)} error={passwordForm.errors.confirmacao} />
            <div className="flex justify-end">
              <Button type="submit" loading={savingPassword}>
                {profile.temSenha ? 'Alterar senha' : 'Definir senha'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}

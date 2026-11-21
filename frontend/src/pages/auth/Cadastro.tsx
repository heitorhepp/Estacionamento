/**
 * Cadastro.tsx
 * Cadastro público do cliente (email e senha) ou atalho para cadastro com Google.
 * Validação no front (mesmas regras do back-end) com mensagem abaixo de cada campo;
 * erros do servidor (ex.: email já cadastrado) também aparecem no campo certo.
 */
import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { IdCard, Lock, Mail, Phone, UserRound } from 'lucide-react';
import { Button } from '../../components/Button';
import { Input } from '../../components/FormFields';
import { GoogleButton, isGoogleEnabled } from '../../components/GoogleButton';
import { useForm } from '../../hooks/useForm';
import { AuthLayout } from '../../layouts/AuthLayout';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/authStore';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';
import { maskCpf, maskPhone } from '../../utils/format';

export function Cadastro() {
  const { values, setField, errors, setErrors } = useForm({ nome: '', email: '', telefone: '', cpf: '', senha: '', confirmacao: '' });
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  /** @returns Erros encontrados (vazio = válido). */
  function validate() {
    const e: Record<string, string> = {};
    if (values.nome.trim().length < 2) e.nome = 'Informe seu nome.';
    if (!/^\S+@\S+\.\S+$/.test(values.email)) e.email = 'Informe um email válido.';
    if (values.cpf && values.cpf.replace(/\D/g, '').length !== 11) e.cpf = 'O CPF deve ter 11 dígitos.';
    if (values.senha.length < 8) e.senha = 'A senha deve ter no mínimo 8 caracteres.';
    if (values.confirmacao !== values.senha) e.confirmacao = 'As senhas não conferem.';
    return e;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate();
    if (Object.keys(found).length) return setErrors(found);

    setLoading(true);
    try {
      const auth = await authService.register({
        nome: values.nome.trim(),
        email: values.email.trim(),
        senha: values.senha,
        telefone: values.telefone || undefined,
        cpf: values.cpf || undefined,
      });
      login(auth);
      toast.success('Conta criada! Cadastre seu primeiro veículo.');
      navigate('/portal/veiculos', { replace: true });
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      // 409 de email duplicado vem sem "errors": colocamos a mensagem no campo email.
      if (!Object.keys(fieldErrors).length && getErrorMessage(err).toLowerCase().includes('email')) fieldErrors.email = getErrorMessage(err);
      setErrors(fieldErrors);
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Criar conta</h1>
      <p className="mt-2 text-ink-500">Cadastre-se para acompanhar suas estadias e sua mensalidade.</p>

      {isGoogleEnabled && (
        <div className="mt-8 space-y-5">
          <GoogleButton text="signup_with" />
          <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-ink-400">
            <span className="h-px flex-1 bg-ink-200" /> ou com email <span className="h-px flex-1 bg-ink-200" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <Input label="Nome completo" autoComplete="name" icon={<UserRound className="h-4 w-4" />} value={values.nome} onChange={(e) => setField('nome', e.target.value)} error={errors.nome} />
        <Input label="Email" type="email" autoComplete="email" icon={<Mail className="h-4 w-4" />} value={values.email} onChange={(e) => setField('email', e.target.value)} error={errors.email} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Telefone"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 91234-5678"
            icon={<Phone className="h-4 w-4" />}
            value={values.telefone}
            onChange={(e) => setField('telefone', maskPhone(e.target.value))}
            error={errors.telefone}
          />
          <Input
            label="CPF (opcional)"
            inputMode="numeric"
            placeholder="000.000.000-00"
            icon={<IdCard className="h-4 w-4" />}
            value={values.cpf}
            onChange={(e) => setField('cpf', maskCpf(e.target.value))}
            error={errors.cpf}
          />
        </div>
        <Input
          label="Senha"
          type="password"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres."
          icon={<Lock className="h-4 w-4" />}
          value={values.senha}
          onChange={(e) => setField('senha', e.target.value)}
          error={errors.senha}
        />
        <Input
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          icon={<Lock className="h-4 w-4" />}
          value={values.confirmacao}
          onChange={(e) => setField('confirmacao', e.target.value)}
          error={errors.confirmacao}
        />
        <Button type="submit" size="lg" fullWidth loading={loading}>
          Criar minha conta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Já tem conta?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}

/**
 * Login.tsx
 * Tela de login com abas:
 * - "Funcionário": email e senha (contas criadas pelo ADMIN).
 * - "Cliente": email e senha + "Entrar com Google" + link para criar conta.
 * Os dois caminhos terminam no mesmo JWT, guardado na store de autenticação.
 */
import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Lock, Mail, UserRound } from 'lucide-react';
import { AvailableSpots } from '../../components/AvailableSpots';
import { Button } from '../../components/Button';
import { Input } from '../../components/FormFields';
import { GoogleButton, isGoogleEnabled } from '../../components/GoogleButton';
import { useForm } from '../../hooks/useForm';
import { AuthLayout } from '../../layouts/AuthLayout';
import { homePath } from '../../routes/homePath';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/authStore';
import { getErrorMessage, getFieldErrors } from '../../utils/errors';

type Tab = 'funcionario' | 'cliente';

export function Login() {
  const [tab, setTab] = useState<Tab>('funcionario');
  const [loading, setLoading] = useState(false);
  const { values, setField, errors, setErrors } = useForm({ email: '', senha: '' });
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(values.email)) nextErrors.email = 'Informe um email válido.';
    if (!values.senha) nextErrors.senha = 'Informe a senha.';
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);

    setLoading(true);
    try {
      const auth = await authService.login(values.email, values.senha);
      login(auth);
      toast.success(`Bem-vindo(a), ${auth.usuario.nome.split(' ')[0]}!`);
      navigate(homePath(auth.usuario.role), { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof Briefcase }> = [
    { id: 'funcionario', label: 'Funcionário', icon: Briefcase },
    { id: 'cliente', label: 'Cliente', icon: UserRound },
  ];

  return (
    <AuthLayout>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Entrar</h1>
      <p className="mt-2 text-ink-500">{tab === 'funcionario' ? 'Acesse o painel de operação do estacionamento.' : 'Acompanhe seus veículos, estadias e mensalidade.'}</p>

      <div role="tablist" className="mt-8 grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              tab === id ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          icon={<Mail className="h-4 w-4" />}
          value={values.email}
          onChange={(e) => setField('email', e.target.value)}
          error={errors.email}
        />
        <Input
          label="Senha"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          icon={<Lock className="h-4 w-4" />}
          value={values.senha}
          onChange={(e) => setField('senha', e.target.value)}
          error={errors.senha}
        />
        <Button type="submit" size="lg" fullWidth loading={loading}>
          Entrar
        </Button>
      </form>

      {tab === 'cliente' && (
        <div className="mt-6 animate-fade-in space-y-5">
          {isGoogleEnabled && (
            <>
              <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-ink-400">
                <span className="h-px flex-1 bg-ink-200" /> ou <span className="h-px flex-1 bg-ink-200" />
              </div>
              <GoogleButton />
            </>
          )}
          <p className="text-center text-sm text-ink-500">
            Ainda não tem conta?{' '}
            <Link to="/cadastro" className="font-semibold text-brand-600 hover:text-brand-700">
              Criar conta grátis
            </Link>
          </p>
        </div>
      )}

      {/* No celular o painel da marca some; mostramos as vagas livres aqui. */}
      <div className="mt-10 lg:hidden">
        <AvailableSpots />
      </div>
    </AuthLayout>
  );
}

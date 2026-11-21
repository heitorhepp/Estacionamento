/**
 * GoogleButton.tsx
 * Botão "Entrar com Google" (@react-oauth/google).
 * O Google devolve um ID token ("credential"), que enviamos ao back-end; é o back-end
 * que valida o token e emite o JWT da aplicação. Se VITE_GOOGLE_CLIENT_ID não estiver
 * configurado, o botão não aparece (o login com email/senha continua funcionando).
 */
import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { homePath } from '../routes/homePath';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../stores/authStore';
import { getErrorMessage } from '../utils/errors';

export const isGoogleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export function GoogleButton({ text = 'signin_with' }: { text?: 'signin_with' | 'signup_with' }) {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (!isGoogleEnabled) return null;

  return (
    <div className={`flex justify-center transition-opacity ${loading ? 'pointer-events-none opacity-60' : ''}`}>
      <GoogleLogin
        text={text}
        shape="pill"
        size="large"
        width="360"
        onSuccess={async ({ credential }) => {
          if (!credential) return void toast.error('O Google não retornou as credenciais.');
          setLoading(true);
          try {
            const auth = await authService.google(credential);
            login(auth);
            toast.success(`Bem-vindo(a), ${auth.usuario.nome.split(' ')[0]}!`);
            navigate(homePath(auth.usuario.role), { replace: true });
          } catch (err) {
            toast.error(getErrorMessage(err));
          } finally {
            setLoading(false);
          }
        }}
        onError={() => {
          toast.error('Não foi possível entrar com o Google.');
        }}
      />
    </div>
  );
}

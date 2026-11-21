/**
 * main.tsx
 * Ponto de entrada do React: providers globais (rotas, Google OAuth, toasts) e rotas.
 */
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import { AppRoutes } from './routes/AppRoutes';
import './index.css';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/** O provider do Google só é montado se houver client id configurado. */
function GoogleProvider({ children }: { children: ReactNode }) {
  return googleClientId ? <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider> : <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '14px', padding: '12px 16px', fontSize: '14px', fontWeight: 500, color: '#262b36' },
            success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
            error: { iconTheme: { primary: '#e11d48', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </GoogleProvider>
  </StrictMode>,
);

/**
 * AppRoutes.tsx
 * Mapa de rotas da aplicação e proteção por papel.
 * - /login, /cadastro: públicas.
 * - /painel/*: ADMIN e OPERADOR (algumas só ADMIN).
 * - /portal/*: CLIENTE.
 */
import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Skeleton } from '../components/Skeleton';
import { PainelLayout } from '../layouts/PainelLayout';
import { PortalLayout } from '../layouts/PortalLayout';
import { Assistente } from '../pages/admin/Assistente';
import { Funcionarios } from '../pages/admin/Funcionarios';
import { Precos } from '../pages/admin/Precos';
import { Vagas } from '../pages/admin/Vagas';
import { Cadastro } from '../pages/auth/Cadastro';
import { Login } from '../pages/auth/Login';
import { Estadias } from '../pages/cliente/Estadias';
import { Inicio } from '../pages/cliente/Inicio';
import { Mensalidade } from '../pages/cliente/Mensalidade';
import { MeusVeiculos } from '../pages/cliente/MeusVeiculos';
import { Perfil } from '../pages/cliente/Perfil';
import { NotFound } from '../pages/NotFound';
import { Entrada } from '../pages/operador/Entrada';
import { Historico } from '../pages/operador/Historico';
import { MapaVagas } from '../pages/operador/MapaVagas';
import { Mensalistas } from '../pages/operador/Mensalistas';
import { Saida } from '../pages/operador/Saida';
import { GuestRoute, ProtectedRoute, RootRedirect } from './ProtectedRoute';

// O dashboard usa o recharts (biblioteca grande); carregando sob demanda,
// operadores e clientes não baixam esse código.
const Dashboard = lazy(() => import('../pages/admin/Dashboard').then((m) => ({ default: m.Dashboard })));

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
      </Route>

      <Route element={<ProtectedRoute roles={['ADMIN', 'OPERADOR']} />}>
        <Route path="/painel" element={<PainelLayout />}>
          <Route index element={<RootRedirect />} />
          <Route path="mapa" element={<MapaVagas />} />
          <Route path="entrada" element={<Entrada />} />
          <Route path="saida" element={<Saida />} />
          <Route path="historico" element={<Historico />} />
          <Route path="clientes" element={<Mensalistas />} />

          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route
              path="dashboard"
              element={
                <Suspense fallback={<Skeleton className="h-96" />}>
                  <Dashboard />
                </Suspense>
              }
            />
            <Route path="assistente" element={<Assistente />} />
            <Route path="vagas" element={<Vagas />} />
            <Route path="precos" element={<Precos />} />
            <Route path="funcionarios" element={<Funcionarios />} />
          </Route>
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['CLIENTE']} />}>
        <Route path="/portal" element={<PortalLayout />}>
          <Route index element={<Inicio />} />
          <Route path="veiculos" element={<MeusVeiculos />} />
          <Route path="estadias" element={<Estadias />} />
          <Route path="mensalidade" element={<Mensalidade />} />
          <Route path="perfil" element={<Perfil />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

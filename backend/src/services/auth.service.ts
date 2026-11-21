/**
 * auth.service.ts
 * Autenticação: login com email e senha, cadastro público do cliente e emissão do JWT.
 * O login com Google (loginWithGoogle) reaproveita buildAuthResponse, então os dois caminhos
 * terminam no MESMO token da aplicação.
 */
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { Role, Usuario } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { LoginInput, RegisterInput } from '../schemas/auth.schema';

/** Custo do bcrypt: 10 é o padrão de mercado (seguro e rápido o bastante). */
const SALT_ROUNDS = 10;

/**
 * Gera o hash bcrypt de uma senha. A senha em texto puro nunca é salva.
 * @param plain Senha digitada.
 * @returns Hash para gravar no banco.
 */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compara uma senha digitada com o hash salvo.
 * @returns true se a senha confere.
 */
export function checkPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Dados do usuário que podem ir para o front (sem hash de senha nem googleId).
 * @param user Registro do banco.
 * @returns Objeto público.
 */
export function toPublicUser(user: Usuario) {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    temSenha: user.senha !== null,
    temGoogle: user.googleId !== null,
    createdAt: user.createdAt,
  };
}

/**
 * Emite o JWT da aplicação e monta a resposta de login.
 * O token guarda só o id (sub) e o papel: o mínimo para autorizar as rotas.
 * @param user Usuário autenticado.
 * @returns { token, usuario }
 */
export function buildAuthResponse(user: Usuario) {
  const token = jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
  return { token, usuario: toPublicUser(user) };
}

/**
 * Login com email e senha (funcionários e clientes usam o mesmo endpoint).
 * @throws 401 se as credenciais forem inválidas.
 */
export async function login({ email, senha }: LoginInput) {
  const user = await prisma.usuario.findUnique({ where: { email } });
  const invalidCredentials = new AppError('Email ou senha inválidos.', 401);

  if (!user) throw invalidCredentials;
  if (!user.senha) {
    throw new AppError('Esta conta foi criada com o Google. Use "Entrar com Google" ou defina uma senha no seu perfil.', 401);
  }
  if (!(await checkPassword(senha, user.senha))) throw invalidCredentials;

  return buildAuthResponse(user);
}

/**
 * Cadastro público do cliente (regra 14).
 * Usuario (role CLIENTE) e Cliente são criados com um "nested create" do Prisma,
 * que roda numa única transação: ou cria os dois, ou nenhum.
 * @throws 409 se o email já estiver cadastrado.
 */
export async function registerCustomer(data: RegisterInput) {
  const existing = await prisma.usuario.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existing) throw new AppError('Este email já está cadastrado.', 409);

  const user = await prisma.usuario.create({
    data: {
      nome: data.nome,
      email: data.email,
      senha: await hashPassword(data.senha),
      // Fixo em CLIENTE: funcionário nunca é criado pela tela pública (regra 16).
      role: Role.CLIENTE,
      cliente: { create: { telefone: data.telefone, cpf: data.cpf } },
    },
  });

  return buildAuthResponse(user);
}

// Client do Google criado uma vez; ele guarda em cache as chaves públicas do Google.
const googleClient = new OAuth2Client();

/**
 * Valida o ID token do Google e devolve os dados confiáveis da conta.
 *
 * O front (botão "Entrar com Google") recebe um ID token assinado pelo Google.
 * NUNCA confiamos em nome/email mandados pelo front: verificamos a assinatura e o
 * "audience" (tem que ser o NOSSO GOOGLE_CLIENT_ID, senão um token emitido para outro
 * site seria aceito aqui).
 *
 * @param credential ID token recebido do front.
 * @throws 503 se não configurado; 401 se o token for inválido ou o email não verificado.
 */
async function verifyGoogleToken(credential: string) {
  if (!env.GOOGLE_CLIENT_ID) throw new AppError('O login com Google não está configurado no servidor.', 503);

  let payload: TokenPayload | undefined;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw new AppError('Não foi possível validar o login com o Google. Tente novamente.', 401);
  }

  if (!payload?.email || !payload.email_verified) {
    throw new AppError('Sua conta Google não tem um email verificado.', 401);
  }
  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    nome: payload.name ?? payload.email,
    avatarUrl: payload.picture ?? null,
  };
}

/**
 * Login social do cliente com Google. Três casos:
 * 1. Já existe usuário com este googleId → entra.
 * 2. Já existe CLIENTE com este email (conta email/senha) → vincula o googleId a ela,
 *    sem criar conta duplicada (regra 15).
 * 3. Não existe → cria Usuario (CLIENTE, sem senha) + Cliente.
 * Email ou googleId de FUNCIONÁRIO → 403: funcionário só entra com email e senha (regra 16).
 *
 * Termina em buildAuthResponse: o MESMO JWT do login com email e senha.
 * @param credential ID token do Google.
 */
export async function loginWithGoogle(credential: string) {
  const google = await verifyGoogleToken(credential);

  const existing =
    (await prisma.usuario.findUnique({ where: { googleId: google.googleId } })) ??
    (await prisma.usuario.findUnique({ where: { email: google.email } }));

  if (existing && existing.role !== Role.CLIENTE) {
    throw new AppError('Funcionários devem entrar com email e senha, na aba "Funcionário".', 403);
  }

  if (existing) {
    const user = existing.googleId
      ? existing
      : await prisma.usuario.update({
          where: { id: existing.id },
          data: { googleId: google.googleId, avatarUrl: existing.avatarUrl ?? google.avatarUrl },
        });
    return buildAuthResponse(user);
  }

  const user = await prisma.usuario.create({
    data: {
      nome: google.nome,
      email: google.email,
      googleId: google.googleId,
      avatarUrl: google.avatarUrl,
      senha: null, // pode ser definida depois em "Meu perfil"
      role: Role.CLIENTE,
      cliente: { create: {} },
    },
  });
  return buildAuthResponse(user);
}

/**
 * Dados do usuário logado (usado pelo front ao recarregar a página).
 * @throws 404 se o usuário não existir mais.
 */
export async function getCurrentUser(userId: string) {
  const user = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Usuário não encontrado.', 404);
  return toPublicUser(user);
}

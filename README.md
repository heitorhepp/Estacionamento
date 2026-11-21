# 🅿️ ParkFlow — Sistema de Controle de Estacionamento

Aplicação full stack para gestão de estacionamento, com dois públicos:

- **Painel interno** (ADMIN e OPERADOR): mapa de vagas em tempo real, entrada com **foto lida por IA**, saída com cálculo automático, mensalistas, histórico, dashboard e assistente de IA.
- **Portal do cliente** (CLIENTE): cadastro com email e senha **ou login com Google**, veículos com foto, estadias, mensalidade e vagas livres em tempo real.

> Projeto acadêmico. Foco em código claro, comentado e organizado em camadas, seguindo boas práticas de mercado sem over-engineering.

---

## Sumário

1. [Funcionalidades](#funcionalidades)
2. [Stack](#stack)
3. [Conteúdos da disciplina aplicados](#conteúdos-da-disciplina-aplicados)
4. [Regras de negócio](#regras-de-negócio)
5. [Estrutura de pastas](#estrutura-de-pastas)
6. [Como obter as chaves](#como-obter-as-chaves)
7. [Rodando localmente](#rodando-localmente)
8. [Logins de teste](#logins-de-teste)
9. [Documentação da API (Swagger)](#documentação-da-api-swagger)
10. [Scripts e testes](#scripts-e-testes)
11. [Deploy (Neon + Render + Vercel)](#deploy-neon--render--vercel)
12. [Variáveis de ambiente de produção](#variáveis-de-ambiente-de-produção)

---

## Funcionalidades

**Painel interno**
- Mapa de vagas: grade colorida por status (livre, ocupada, inativa), agrupada por setor e atualizada sozinha. Clicar em uma vaga ocupada mostra a placa, a foto, o horário de entrada e o tempo decorrido.
- Entrada: foto pela câmera do celular. O Gemini sugere placa, modelo, cor, tipo e avarias, e o operador confirma ou corrige.
- Saída em dois passos: primeiro a pré-visualização do valor, depois a confirmação com a forma de pagamento.
- Cancelamento de entrada lançada por engano, com motivo obrigatório.
- Histórico com filtros por placa, status e período.
- Clientes e mensalistas: cadastro, registro de pagamento e histórico de pagamentos.
- Somente ADMIN:
  - CRUD de vagas, tabela de preços e funcionários.
  - Dashboard com indicadores e gráficos.
  - Assistente de IA em formato de chat.

**Portal do cliente**
- Criar conta (email e senha) ou entrar com Google.
- Meu perfil: editar dados e definir ou alterar a senha.
- Meus veículos, com foto.
- Vagas livres por tipo em tempo real.
- Histórico de estadias com tempo e valor.
- Mensalidade: situação, próximo vencimento e pagamentos.

---

## Stack

| Camada | Tecnologias |
|---|---|
| Back-end | Node.js, TypeScript, Express 5, Prisma ORM 6, PostgreSQL (Neon), Zod, bcrypt, jsonwebtoken, dotenv, cors, multer, cloudinary, @google/genai, google-auth-library, swagger-ui-express, swagger-jsdoc |
| Front-end | React 19, TypeScript, Vite, React Router, Tailwind CSS, Zustand, axios, @react-oauth/google, lucide-react, recharts, react-hot-toast |
| Deploy | Neon (banco), Render (API), Vercel (front) |

---

## Conteúdos da disciplina aplicados

| Conteúdo | Onde está no código |
|---|---|
| **Integração com IA (Gemini)** | `backend/src/services/ai.service.ts` (toda a lógica, comentada), `backend/src/config/gemini.ts`, validação da resposta em `backend/src/schemas/ai.schema.ts`. Front: `frontend/src/pages/operador/Entrada.tsx` (sugestões com selo "sugerido pela IA") e `frontend/src/pages/admin/Assistente.tsx` (chat). |
| **Estado global com Zustand** | `frontend/src/stores/authStore.ts` (usuário, token, login e logout, com `persist` no localStorage) e `frontend/src/stores/historyFiltersStore.ts` (filtros do histórico). O interceptor em `frontend/src/services/api.ts` lê o token da store e faz logout automático quando recebe 401. |
| **Dashboard** | Back: `backend/src/services/dashboard.service.ts`. Front: `frontend/src/pages/admin/Dashboard.tsx`, com cards, gráfico de linha, de barras e de rosca (recharts) e filtro de período. |
| **Swagger** | `backend/src/config/swagger.ts` (definições, schemas e Bearer) + comentários `@openapi` em todos os arquivos de `backend/src/routes/`. Disponível em `/api-docs`. |
| **Upload com Multer + Cloudinary** | Middleware reutilizável: `backend/src/middlewares/upload.ts`. Envio via `upload_stream`: `backend/src/services/upload.service.ts`. Pastas `estacionamento/entradas` e `estacionamento/veiculos`. Front: `frontend/src/components/UploadFoto.tsx` (pré-visualização e `capture="environment"`). |
| **Login social (Google)** | Back: `loginWithGoogle` em `backend/src/services/auth.service.ts`, que valida o ID token com google-auth-library. Front: `frontend/src/components/GoogleButton.tsx` (@react-oauth/google). |
| **Deploy** | `render.yaml` (API), `frontend/vercel.json` (rewrite do React Router) e scripts `build`/`start` do back-end com `prisma generate` e `prisma migrate deploy`. |

---

## Regras de negócio

Todas ficam no back-end, na camada de services:

| # | Regra | Onde |
|---|---|---|
| 1 | Placa não pode ter duas movimentações abertas | `movement.service.ts` → `ensurePlateHasNoOpenMovement` |
| 2 | Vaga precisa estar ativa, livre e ser do tipo certo. A verificação e a criação ficam em `$transaction` **Serializable** | `movement.service.ts` → `registerEntry` |
| 3 | Placa nos formatos antigo e Mercosul, salva maiúscula e sem hífen | `utils/plate.ts`, `schemas/common.schema.ts` |
| 4 | Cálculo da tarifa (tolerância, horas iniciadas, teto da diária), em função pura e testada | `utils/tariff.ts` + `utils/tariff.test.ts` |
| 5 | Preço congelado na entrada (os campos `preco*` da movimentação) | `movement.service.ts` → `registerEntry` |
| 6 e 7 | Mensalista em dia sai sem custo, cobrindo um veículo por vez | `movement.service.ts` → `checkMembershipCoverage` |
| 8 | Saída em dois passos: prévia e confirmação | `previewExit` / `confirmExit` |
| 9 e 10 | Cancelamento com motivo; finalizadas e canceladas não podem ser editadas | `cancelMovement` / `updateMovement` |
| 11 | Vaga ocupada não pode ser desativada nem excluída | `spot.service.ts` |
| 12 | Pagamento da mensalidade avança o vencimento em 1 mês, na mesma transação; não aceita referência duplicada | `membership.service.ts` + `@@unique` no schema |
| 13 | Cliente só acessa os próprios dados | `portal.service.ts`, `vehicle.service.ts` |
| 14 a 16 | Cadastro do cliente, vinculação com o Google e bloqueio de funcionários no login social | `auth.service.ts` |
| 17 | Consulta pública de vagas livres | `GET /api/vagas/livres` |
| 18 | Fuso America/Sao_Paulo | `utils/date.ts` (back) e `utils/format.ts` (front) |

Interpretação adotada na regra 4: a tolerância vale para a estadia inteira. Quem fica 24h05 paga 1 diária + 1 hora.

---

## Estrutura de pastas

```
estacionamento/
├── package.json            # script "dev" (back + front juntos com concurrently)
├── render.yaml             # blueprint de deploy da API no Render
├── backend/
│   ├── prisma/             # schema.prisma, migrations/, seed.ts
│   ├── src/
│   │   ├── config/         # env, prisma, cloudinary, gemini, swagger
│   │   ├── routes/         # uma rota por recurso (+ anotações @openapi)
│   │   ├── controllers/    # recebe req/res e chama o service
│   │   ├── services/       # regras de negócio, ai, upload, auth
│   │   ├── schemas/        # validações Zod
│   │   ├── middlewares/    # auth, roles, upload, validate, errorHandler
│   │   ├── utils/          # tarifa, placa, datas, AppError
│   │   ├── types/          # extensão do Request do Express
│   │   ├── app.ts
│   │   └── server.ts
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/     # Button, Modal, Table, Card, Skeleton, UploadFoto, ExitModal...
    │   ├── layouts/        # PainelLayout, PortalLayout, AuthLayout
    │   ├── pages/
    │   │   ├── auth/       # Login, Cadastro
    │   │   ├── admin/      # Dashboard, Assistente, Vagas, Precos, Funcionarios
    │   │   ├── operador/   # MapaVagas, Entrada, Saida, Historico, Mensalistas
    │   │   └── cliente/    # Inicio, Perfil, MeusVeiculos, Estadias, Mensalidade
    │   ├── services/       # chamadas à API (axios)
    │   ├── stores/         # Zustand
    │   ├── hooks/          # useAsync, useForm, useNow
    │   ├── types/          # tipos das respostas da API
    │   ├── utils/          # moeda, datas, "2h 35min", placa, erros
    │   ├── routes/         # rotas e proteção por papel
    │   └── main.tsx
    ├── vercel.json
    └── .env.example
```

---

## Como obter as chaves

### Banco de dados — Neon (PostgreSQL)
1. Crie uma conta em https://neon.tech e um projeto. A região **AWS São Paulo (sa-east-1)** tem menor latência.
2. Em **Connect**, copie duas connection strings:
   - **DATABASE_URL**: com *Connection pooling* **ligado** (o host contém `-pooler`).
   - **DIRECT_URL**: com *Connection pooling* **desligado**. É usada pelas migrations.
3. As duas devem terminar com `?sslmode=require`.

### Google Gemini
1. Acesse https://aistudio.google.com/apikey e clique em **Create API key**.
2. Use a chave em `GEMINI_API_KEY`.
3. Em `GEMINI_MODEL`, coloque um modelo com suporte a imagem e JSON, por exemplo `gemini-2.5-flash`.

O plano gratuito tem limite de requisições por minuto. A API responde com uma mensagem amigável (429) quando o limite estoura.

### Cloudinary
1. Crie uma conta em https://cloudinary.com.
2. No **Dashboard**, em *Product Environment Credentials*, copie **Cloud name**, **API Key** e **API Secret**.
3. As pastas `estacionamento/entradas` e `estacionamento/veiculos` são criadas automaticamente no primeiro upload.

### Login com Google (OAuth)
1. Acesse https://console.cloud.google.com e crie um projeto.
2. Configure a tela de consentimento em **APIs e serviços → Tela de consentimento OAuth**:
   - Tipo **Externo**, com nome do app e email de suporte.
   - Enquanto o app estiver "Em teste", adicione os emails que vão testar.
3. Crie o ID do cliente em **Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo de aplicativo: **Aplicativo da Web**.
   - Em **Origens JavaScript autorizadas**, adicione `http://localhost:5173` e, depois do deploy, `https://SEU-APP.vercel.app`.
4. Copie o **ID do cliente** para `GOOGLE_CLIENT_ID` (back) e `VITE_GOOGLE_CLIENT_ID` (front).

Não é preciso *client secret*: o front recebe um ID token e o back só valida a assinatura.

---

## Rodando localmente

**Pré-requisitos:** Node.js **20.19+** e um PostgreSQL (Neon ou Docker).

**1. Instale as dependências** (raiz, back e front):

```powershell
npm run install:all
```

**2. Configure o back-end.** Copie o arquivo de exemplo:

```powershell
Copy-Item backend/.env.example backend/.env
```

Em seguida, edite o `backend/.env` e preencha:
- `DATABASE_URL` e `DIRECT_URL`;
- `JWT_SECRET`: pode gerar com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`;
- as chaves opcionais: Cloudinary, Gemini e Google.

Sem as chaves opcionais o sistema funciona normalmente; só os recursos correspondentes respondem "não configurado".

**Banco sem Neon (opcional):** dá para usar um PostgreSQL local com Docker.

```powershell
docker run -d --name parkflow-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=parkflow -p 5432:5432 postgres:16-alpine
```

Nesse caso, use no `.env`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/parkflow"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/parkflow"
```

**3. Configure o front-end.** Copie o arquivo de exemplo:

```powershell
Copy-Item frontend/.env.example frontend/.env
```

O `VITE_API_URL` já aponta para `http://localhost:3333/api`. Preencha `VITE_GOOGLE_CLIENT_ID` se for usar o login com Google.

**4. Crie as tabelas e popule os dados de demonstração:**

```powershell
cd backend; npx prisma migrate deploy; npm run seed; cd ..
```

O seed **apaga todos os dados** antes de inserir.

**5. Suba back e front juntos:**

```powershell
npm run dev
```

| Serviço | URL |
|---|---|
| Front-end | http://localhost:5173 |
| API | http://localhost:3333/api |
| Swagger | http://localhost:3333/api-docs |

---

## Logins de teste

Criados pelo seed (`backend/prisma/seed.ts`):

| Perfil | Email | Senha | Situação |
|---|---|---|---|
| ADMIN | `admin@parkflow.com` | `admin123` | Acesso total |
| OPERADOR | `carlos@parkflow.com` | `operador123` | — |
| OPERADOR | `fernanda@parkflow.com` | `operador123` | — |
| CLIENTE | `ana@email.com` | `cliente123` | Mensalista **em dia**, 2 veículos, um deles no pátio agora |
| CLIENTE | `bruno@email.com` | `cliente123` | Mensalista **em dia** |
| CLIENTE | `carla@email.com` | `cliente123` | Mensalista **vencida**, veículo no pátio (paga como avulsa) |
| CLIENTE | `diego@email.com` | `cliente123` | Avulso, veículo no pátio |
| CLIENTE | `felipe@email.com` | `cliente123` | Avulso (moto) |
| CLIENTE | `elisa.martins@gmail.com` | — | Simula uma conta criada pelo Google (sem senha) |

A conta da Elisa tem um `googleId` fictício: ela demonstra o modelo de dados e a mensagem "conta criada com o Google", mas não consegue entrar de verdade. Para testar o login social real, use a sua conta Google na aba **Cliente**.

**O seed também cria:**
- 30 vagas de carro (uma em manutenção) e 10 de moto, em 2 setores;
- a tabela de preços;
- 17 veículos no pátio;
- cerca de 900 movimentações dos últimos 30 dias, com picos às 8h, 12h e 18h e algumas canceladas.

---

## Documentação da API (Swagger)

- **Local:** http://localhost:3333/api-docs
- **Produção:** `https://SUA-API.onrender.com/api-docs`
- A especificação em JSON fica em `/api-docs.json`.

**Para testar rotas protegidas:**
1. Execute `POST /auth/login`.
2. Copie o `token` da resposta.
3. Clique em **Authorize** (cadeado) e cole o token.

Todas as rotas estão documentadas, agrupadas por tags, com parâmetros, corpo, respostas e erros.

---

## Scripts e testes

| Onde | Script | O que faz |
|---|---|---|
| raiz | `npm run dev` | Sobe API e front juntos (concurrently) |
| raiz | `npm run install:all` | Instala as dependências da raiz, do back e do front |
| raiz | `npm run build` | Build do back e do front |
| raiz | `npm test` | Testes do back-end |
| raiz | `npm run seed` | Recria os dados de demonstração |
| backend | `npm run prisma:migrate` | Cria uma nova migration ao alterar o `schema.prisma` |
| backend | `npm run prisma:studio` | Abre o Prisma Studio para ver o banco |

Os testes usam o runner nativo do Node (`node:test`):
- `utils/tariff.test.ts`: casos de tolerância, horas iniciadas, teto da diária e várias diárias.
- `schemas/ai.schema.test.ts`: validação da resposta da IA.

---

## Deploy (Neon + Render + Vercel)

### 1. Banco — Neon
Crie o projeto e copie `DATABASE_URL` (pooler) e `DIRECT_URL` (direta), como em [Como obter as chaves](#como-obter-as-chaves). As tabelas são criadas automaticamente pelo `prisma migrate deploy` no start da API.

### 2. API — Render
1. Suba o projeto para um repositório no GitHub.
2. No Render, crie o serviço:
   - **Opção A (Blueprint):** em **New → Blueprint**, escolha o repositório. O `render.yaml` configura tudo.
   - **Opção B (manual):** em **New → Web Service**, use:
     - **Root Directory:** `backend`
     - **Build Command:** `npm install --include=dev && npm run build`
     - **Start Command:** `npm start` (roda `prisma migrate deploy` e sobe a API)
     - **Health Check Path:** `/api/health`
3. Preencha as variáveis de ambiente (tabela abaixo). Em `FRONTEND_URL`, coloque a URL da Vercel quando ela existir.
4. Acesse `https://SUA-API.onrender.com/api-docs` para conferir.

No plano gratuito, o Render "dorme" após 15 min sem uso. A primeira requisição depois disso pode levar cerca de 50 s; abra a API alguns minutos antes da apresentação.

### 3. Dados de demonstração em produção (uma vez)
Da sua máquina, rode o seed apontando para o Neon (use a conexão **direta**):

```powershell
cd backend; $env:DATABASE_URL="URL_DIRETA_DO_NEON"; npm run seed
```

O seed apaga os dados existentes. Por segurança, ele se recusa a rodar com `NODE_ENV=production`.

### 4. Front-end — Vercel
1. Em **Add New → Project**, importe o repositório.
2. Configure:
   - **Root Directory:** `frontend` (o framework Vite é detectado automaticamente).
   - **Environment Variables:** `VITE_API_URL=https://SUA-API.onrender.com/api` e `VITE_GOOGLE_CLIENT_ID`.
3. Clique em **Deploy**. O `vercel.json` redireciona todas as rotas para o `index.html`, para o React Router funcionar ao recarregar a página.

As variáveis `VITE_*` são gravadas no build. Se alterar alguma, faça um novo deploy.

### 5. Ajustes finais
1. No Render, atualize `FRONTEND_URL` com a URL da Vercel. Isso libera o CORS.
2. No Google Cloud Console, adicione a URL da Vercel em **Origens JavaScript autorizadas**.
3. Teste: login, mapa de vagas, entrada com foto, dashboard e login com Google.

---

## Variáveis de ambiente de produção

### Back-end (Render)

| Variável | Exemplo | Obrigatória |
|---|---|---|
| `NODE_ENV` | `production` | sim |
| `DATABASE_URL` | `postgresql://...-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require` | sim |
| `DIRECT_URL` | `postgresql://....sa-east-1.aws.neon.tech/neondb?sslmode=require` | sim |
| `JWT_SECRET` | texto aleatório longo (o Blueprint gera sozinho) | sim |
| `JWT_EXPIRES_IN` | `1d` | não (padrão `1d`) |
| `FRONTEND_URL` | `https://parkflow.vercel.app` (várias origens: separe por vírgula) | sim |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | credenciais do Cloudinary | para fotos |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | chave do AI Studio / `gemini-2.5-flash` | para IA |
| `GOOGLE_CLIENT_ID` | `xxxx.apps.googleusercontent.com` | para login Google |
| `PORT` | definida pelo Render | automática |

### Front-end (Vercel)

| Variável | Exemplo |
|---|---|
| `VITE_API_URL` | `https://parkflow-api.onrender.com/api` |
| `VITE_GOOGLE_CLIENT_ID` | o mesmo `GOOGLE_CLIENT_ID` do back-end |

Nenhuma credencial fica no código: tudo vem do `.env` (veja `backend/.env.example` e `frontend/.env.example`).

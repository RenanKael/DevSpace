# DevSpace

Rede social para quem cria, testa e compartilha projetos. Frontend em React + Vite, backend em Express + MySQL.

## Requisitos

- Node.js 20+
- MySQL 8+ rodando

## Como iniciar

No terminal, entre na pasta do app (a que tem o `package.json` e o `.env.example`):

```bash
cd DevSpace
```

Se você clonou o repositório, o caminho fica assim:

```bash
git clone https://github.com/RenanKael/DevSpace.git
cd DevSpace/DevSpace
```

### 1. Instalar dependências

```bash
npm install
npm install --prefix backend
```

### 2. Configurar o `.env`

É **um único arquivo** na raiz do app (frontend + banco + backend):

```powershell
Copy-Item .env.example .env
```

No Git Bash / macOS / Linux:

```bash
cp .env.example .env
```

Abra o `.env` e preencha o MySQL:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=devspace
DB_USER=devspace
DB_PASSWORD=sua-senha
PORT=4000
FRONTEND_ORIGIN=http://127.0.0.1:5173,http://localhost:5173
```

`VITE_GOOGLE_CLIENT_ID` é opcional (só para login Google).  
Não commite o `.env`.

### 3. Preparar o banco

```bash
npm run check-db
npm run setup-db --prefix backend
```

O `check-db` testa a conexão. O `setup-db` cria/atualiza as tabelas.

### 4. Subir o projeto

```bash
npm run dev
```

Isso sobe os dois juntos:

| Serviço  | URL                         |
|----------|-----------------------------|
| Frontend | http://127.0.0.1:5173       |
| Backend  | http://localhost:4000/api   |

Para parar: `Ctrl + C` no terminal.

Só o frontend: `npm run dev:front`  
Só o backend: `npm run dev:back`

## Build

```bash
npm run build
npm run preview
```

## Scripts úteis

| Comando | Função |
|---|---|
| `npm run dev` | Sobe frontend + backend |
| `npm run lint` | ESLint no frontend |
| `npm run check-db` | Testa a conexão MySQL |
| `npm run setup-db --prefix backend` | Cria/atualiza o schema |
| `npm run seed:dev` | Dados de exemplo (não use em produção) |

## Estrutura

```
DevSpace/
  .env.example         # copie para .env
  src/                 # React (páginas, componentes, estilos)
  backend/             # Express + MySQL
  public/              # favicon, robots.txt
```

Rotas principais: `/`, `/explorar`, `/perfil`, `/perfil/:handle`, `/chat`, `/notificacoes`, `/configuracoes`, `/perfil/colecao/:tipo`.

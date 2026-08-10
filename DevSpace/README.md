# DevSpace

Rede social para quem cria, testa e compartilha projetos. Frontend em React + Vite, backend em Express + MySQL.

## Requisitos

- Node.js 20+
- MySQL 8+

## Instalação

```bash
cd DevSpace
npm install
npm install --prefix backend
```

Copie o exemplo de ambiente (um único `.env` na raiz, frontend + banco):

```bash
cp .env.example .env
```

Preencha o `.env` com host, banco, usuário e senha do MySQL.  
`VITE_GOOGLE_CLIENT_ID` é opcional (login Google).

## Banco

```bash
npm run check-db
npm run setup-db --prefix backend
```

## Desenvolvimento

Sobe frontend (`127.0.0.1:5173`) e backend (`4000`) juntos:

```bash
npm run dev
```

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
| `npm run lint` | ESLint no frontend |
| `npm run check-db` | Testa a conexão MySQL |
| `npm run setup-db --prefix backend` | Cria/atualiza o schema |

## Estrutura

```
DevSpace/
  src/                 # React (páginas, componentes, estilos)
  backend/             # Express + MySQL
  public/              # favicon, robots.txt
```

Rotas principais: `/`, `/explorar`, `/perfil`, `/perfil/:handle`, `/chat`, `/notificacoes`, `/configuracoes`, `/perfil/colecao/:tipo`.

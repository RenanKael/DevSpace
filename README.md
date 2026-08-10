# DevSpace

O app fica na pasta **`DevSpace/`**.

## Como iniciar

```bash
git clone https://github.com/RenanKael/DevSpace.git
cd DevSpace/DevSpace
npm install
npm install --prefix backend
```

No PowerShell:

```powershell
Copy-Item .env.example .env
```

No Git Bash / Linux / macOS:

```bash
cp .env.example .env
```

Preencha o `.env` com o MySQL (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`), depois:

```bash
npm run check-db
npm run setup-db --prefix backend
npm run dev
```

Abre **http://127.0.0.1:5173** (frontend) e o backend em **http://localhost:4000/api**.

Passo a passo completo: [`DevSpace/README.md`](DevSpace/README.md).

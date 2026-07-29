import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "devspace.db");
const PORT = Number(process.env.PORT || 4000);

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(DB_PATH, (error) => {
  if (error) {
    console.error("Falha ao abrir o banco de dados:", error);
    process.exit(1);
  }
});

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (error) {
      if (error) return reject(error);
      resolve(this);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) return reject(error);
      resolve(row);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) return reject(error);
      resolve(rows);
    });
  });

function safeParse(value, fallback = []) {
  if (value == null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    handle: row.handle,
    email: row.email,
    telefone: row.telefone,
    criadoEm: row.criadoEm,
    bio: row.bio,
    fotoPerfil: row.fotoPerfil,
    fotoCapa: row.fotoCapa,
    estrelas: row.estrelas,
    avaliacao: row.avaliacao,
    isAdmin: !!row.isAdmin,
    comments: row.comments,
    seguidores: row.seguidores,
    seguindo: safeParse(row.seguindo, []),
    starStats: safeParse(row.starStats, {}),
    projetos: safeParse(row.projetos, []),
  };
}

function normalizePost(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    handle: row.handle,
    email: row.email,
    fotoPerfil: row.fotoPerfil,
    texto: row.texto,
    imagem: row.imagem,
    criadoEm: row.criadoEm,
    comments: row.comments,
    shares: row.shares,
    likes: row.likes,
    bookmarks: row.bookmarks,
    likedBy: safeParse(row.likedBy, []),
    savedBy: safeParse(row.savedBy, []),
    repostedBy: safeParse(row.repostedBy, []),
    isSeedFake: !!row.isSeedFake,
    commentsList: safeParse(row.commentsList, []),
  };
}

async function initDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      handle TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      telefone TEXT,
      criadoEm TEXT,
      bio TEXT,
      fotoPerfil TEXT,
      fotoCapa TEXT,
      estrelas INTEGER DEFAULT 0,
      avaliacao INTEGER DEFAULT 0,
      isAdmin INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      seguidores INTEGER DEFAULT 0,
      seguindo TEXT DEFAULT '[]',
      starStats TEXT DEFAULT '{}',
      projetos TEXT DEFAULT '[]'
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      handle TEXT,
      email TEXT,
      fotoPerfil TEXT,
      texto TEXT,
      imagem TEXT,
      criadoEm TEXT,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      bookmarks INTEGER DEFAULT 0,
      likedBy TEXT DEFAULT '[]',
      savedBy TEXT DEFAULT '[]',
      repostedBy TEXT DEFAULT '[]',
      isSeedFake INTEGER DEFAULT 0,
      commentsList TEXT DEFAULT '[]'
    );
  `);
}

app.get("/api/users", async (req, res) => {
  try {
    const rows = await all("SELECT * FROM users ORDER BY id DESC");
    res.json(rows.map(normalizeUser));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar usuários." });
  }
});

app.get("/api/users/:handle", async (req, res) => {
  try {
    const row = await get("SELECT * FROM users WHERE LOWER(handle) = LOWER(?)", [req.params.handle]);
    if (!row) return res.status(404).json({ message: "Usuário não encontrado." });
    res.json(normalizeUser(row));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar usuário." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { emailOrHandle, senha } = req.body;
    if (!emailOrHandle || !senha) {
      return res.status(400).json({ message: "Email/@ e senha são obrigatórios." });
    }

    const row = await get(
      "SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(handle) = LOWER(?)",
      [emailOrHandle, emailOrHandle]
    );

    if (!row || row.senha !== senha) {
      return res.status(401).json({ message: "Email/@ ou senha incorretos." });
    }

    const user = normalizeUser(row);
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao autenticar o usuário." });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, handle, email, senha, telefone, bio, fotoPerfil, fotoCapa } = req.body;
    if (!username || !handle || !email || !senha) {
      return res.status(400).json({ message: "username, handle, email e senha são obrigatórios." });
    }

    const existing = await get(
      "SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(handle) = LOWER(?)",
      [email, handle]
    );
    if (existing) {
      return res.status(409).json({ message: "Email ou handle já cadastrado." });
    }

    const createdAt = new Date().toISOString();
    const result = await run(
      `INSERT INTO users (username, handle, email, senha, telefone, criadoEm, bio, fotoPerfil, fotoCapa)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, handle, email, senha, telefone || "", createdAt, bio || "", fotoPerfil || "", fotoCapa || ""]
    );

    const user = await get("SELECT * FROM users WHERE id = ?", [result.lastID]);
    res.status(201).json(normalizeUser(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao registrar usuário." });
  }
});

app.get("/api/posts", async (req, res) => {
  try {
    const rows = await all("SELECT * FROM posts ORDER BY criadoEm DESC");
    res.json(rows.map(normalizePost));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar publicações." });
  }
});

app.post("/api/posts", async (req, res) => {
  try {
    const {
      username,
      handle,
      email,
      fotoPerfil,
      texto,
      imagem,
      comments,
      shares,
      likes,
      bookmarks,
      likedBy,
      savedBy,
      repostedBy,
      isSeedFake,
      commentsList,
    } = req.body;

    const createdAt = new Date().toISOString();
    const result = await run(
      `INSERT INTO posts (username, handle, email, fotoPerfil, texto, imagem, criadoEm,
        comments, shares, likes, bookmarks, likedBy, savedBy, repostedBy, isSeedFake, commentsList)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username || "",
        handle || "",
        email || "",
        fotoPerfil || "",
        texto || "",
        imagem || "",
        createdAt,
        comments || 0,
        shares || 0,
        likes || 0,
        bookmarks || 0,
        JSON.stringify(likedBy || []),
        JSON.stringify(savedBy || []),
        JSON.stringify(repostedBy || []),
        isSeedFake ? 1 : 0,
        JSON.stringify(commentsList || []),
      ]
    );

    const post = await get("SELECT * FROM posts WHERE id = ?", [result.lastID]);
    res.status(201).json(normalizePost(post));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar publicação." });
  }
});

app.put("/api/posts/:id", async (req, res) => {
  try {
    const post = await get("SELECT * FROM posts WHERE id = ?", [req.params.id]);
    if (!post) {
      return res.status(404).json({ message: "Post não encontrado." });
    }

    const updates = req.body || {};
    const fields = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (["texto", "imagem", "comments", "shares", "likes", "bookmarks", "likedBy", "savedBy", "repostedBy"].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(["likedBy", "savedBy", "repostedBy"].includes(key) ? JSON.stringify(value || []) : value);
      }
    });

    if (!fields.length) {
      return res.status(400).json({ message: "Nenhuma atualização válida enviada." });
    }

    values.push(req.params.id);
    await run(`UPDATE posts SET ${fields.join(", ")} WHERE id = ?`, values);
    const updated = await get("SELECT * FROM posts WHERE id = ?", [req.params.id]);
    res.json(normalizePost(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar publicação." });
  }
});

app.get("/api/posts/:id", async (req, res) => {
  try {
    const post = await get("SELECT * FROM posts WHERE id = ?", [req.params.id]);
    if (!post) return res.status(404).json({ message: "Post não encontrado." });
    res.json(normalizePost(post));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar publicação." });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: "Rota não encontrada." });
});

await initDatabase();

app.listen(PORT, () => {
  console.log(`Backend DevSpace rodando em http://localhost:${PORT}/api`);
});

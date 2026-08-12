import "./loadEnv.js";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import bcrypt from "bcryptjs";
import { query, queryOne } from "./db.js";
import {
  ensureAuthTables,
  createSession,
  destroySession,
  requireAuth,
  getSessionUser,
  rateLimit,
  storeVerificationCode,
  consumeVerificationCode,
  storePasswordReset,
  consumePasswordReset,
} from "./auth.js";

const PORT = Number(process.env.PORT || 4000);
const ALLOWED_ORIGINS = String(process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5173,http://localhost:5173")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const app = express();
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
  })
);
app.use(express.json({ limit: "15mb" }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MIDIA_TIPOS = ["imagem", "video", "gif", "arquivo"];
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const ALLOWED_UPLOAD_EXT = new Set([
  "pdf",
  "doc",
  "docx",
  "txt",
  "zip",
  "rar",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "csv",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
]);

function mimeFromName(name = "") {
  const ext = String(name).split(".").pop()?.toLowerCase() || "";
  const map = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    csv: "text/csv",
    zip: "application/zip",
    rar: "application/vnd.rar",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
  };
  return map[ext] || "application/octet-stream";
}

function midiaTipoFromMime(mime) {
  if (!mime) return "arquivo";
  if (mime.startsWith("image/gif")) return "gif";
  if (mime.startsWith("image/")) return "imagem";
  if (mime.startsWith("video/")) return "video";
  return "arquivo";
}

function mimeFromDataUrl(url = "") {
  const match = String(url).match(/^data:([^;,]+)/);
  return match?.[1] || "";
}

function inferNameFromUrl(url = "") {
  const value = String(url || "");
  if (value.startsWith("data:")) {
    const mime = mimeFromDataUrl(value);
    if (mime === "application/pdf") return "documento.pdf";
    if (mime.includes("wordprocessingml") || mime === "application/msword") return "documento.docx";
    if (mime.includes("spreadsheetml") || mime === "application/vnd.ms-excel") return "planilha.xlsx";
    if (mime.includes("presentationml") || mime === "application/vnd.ms-powerpoint") return "apresentacao.pptx";
    if (mime === "application/zip") return "arquivo.zip";
    if (mime.startsWith("image/")) return `imagem.${mime.split("/")[1] || "png"}`;
    return "arquivo";
  }
  try {
    const last = value.split("?")[0].split("/").pop();
    if (last) return decodeURIComponent(last);
  } catch {
    /* ignore */
  }
  return "arquivo";
}

function serializeAnexo(row) {
  if (!row?.url) return null;
  const nome = row.nome_original || row.nome_arquivo || inferNameFromUrl(row.url);
  const tipo =
    row.mime_original ||
    mimeFromDataUrl(row.url) ||
    mimeFromName(nome) ||
    (row.tipo === "video" ? "video/*" : "application/octet-stream");
  return {
    url: row.url,
    tipo,
    nome,
    tamanho: row.tamanho_bytes || null,
  };
}

function safeDownloadName(name) {
  return String(name || "arquivo").replace(/[\r\n"]/g, "").slice(0, 180) || "arquivo";
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").slice(0, 10).toLowerCase().replace(/[^.a-z0-9]/g, "");
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").slice(1).toLowerCase();
    const mime = file.mimetype || mimeFromName(file.originalname);
    if (ALLOWED_UPLOAD_EXT.has(ext) || mime.startsWith("image/")) return cb(null, true);
    cb(new Error("Tipo de arquivo não permitido. Use PDF, documento, zip ou imagem."));
  },
});

async function ensureMidiaAnexoColumns() {
  const nome = await queryOne(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'midias' AND COLUMN_NAME = 'nome_original'`
  );
  if (!nome) {
    await query("ALTER TABLE midias ADD COLUMN nome_original VARCHAR(255) DEFAULT NULL AFTER tamanho_bytes");
  }
  const mime = await queryOne(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'midias' AND COLUMN_NAME = 'mime_original'`
  );
  if (!mime) {
    await query("ALTER TABLE midias ADD COLUMN mime_original VARCHAR(255) DEFAULT NULL AFTER nome_original");
  }
}

// ---------- Usuarios ----------

// Mesmos niveis/formula de src/utils/starProgress.js (avaliacao 1-5 estrelas
// com base em contagens reais, nao XP): cada nivel exige TODOS os limiares
// simultaneamente para ser alcancado.
const ADMIN_EMAIL = "renan.kael@gmail.com";
const STAR_LEVELS = [
  { stars: 1, posts: 1 },
  { stars: 2, posts: 5, comments: 1 },
  { stars: 3, posts: 50, comments: 100, likes: 150, reposts: 70 },
  { stars: 4, posts: 500, comments: 700, likes: 1000, reposts: 500 },
  { stars: 5, posts: 1500, comments: 200, likes: 4000, reposts: 300, saves: 10 },
];

function calculateStars(progress, isAdmin) {
  if (isAdmin) return 5;

  let stars = 0;
  for (const level of STAR_LEVELS) {
    const atingiu =
      progress.postsCreated >= level.posts &&
      progress.commentsMade >= (level.comments || 0) &&
      progress.likesMade >= (level.likes || 0) &&
      progress.repostsMade >= (level.reposts || 0) &&
      progress.savesMade >= (level.saves || 0);
    if (atingiu) {
      stars = level.stars;
    } else {
      break;
    }
  }
  return Math.min(5, stars);
}

// Conta a atividade real do usuario direto nas tabelas (em vez de manter um
// contador separado que pode ficar dessincronizado) para calcular as estrelas.
async function getStarProgress(usuarioId) {
  const [postsRows, commentsRows, likesRows, repostsRows, savesRows] = await Promise.all([
    query("SELECT COUNT(*) AS c FROM posts WHERE usuario_id = ?", [usuarioId]),
    query("SELECT COUNT(*) AS c FROM comentarios WHERE usuario_id = ?", [usuarioId]),
    query("SELECT COUNT(*) AS c FROM post_interacoes WHERE usuario_id = ? AND tipo = 'like'", [usuarioId]),
    query("SELECT COUNT(*) AS c FROM post_shares WHERE usuario_id = ?", [usuarioId]),
    query("SELECT COUNT(*) AS c FROM post_bookmarks WHERE usuario_id = ?", [usuarioId]),
  ]);

  return {
    postsCreated: Number(postsRows[0]?.c || 0),
    commentsMade: Number(commentsRows[0]?.c || 0),
    likesMade: Number(likesRows[0]?.c || 0),
    repostsMade: Number(repostsRows[0]?.c || 0),
    savesMade: Number(savesRows[0]?.c || 0),
  };
}

async function getRatingSummary(userId, reviewerId = null) {
  const [aggRows, minha] = await Promise.all([
    query("SELECT AVG(nota) AS media, COUNT(*) AS total FROM avaliacoes_perfil WHERE avaliado_id = ?", [userId]),
    reviewerId
      ? queryOne("SELECT nota FROM avaliacoes_perfil WHERE avaliado_id = ? AND avaliador_id = ?", [userId, reviewerId])
      : Promise.resolve(null),
  ]);
  return {
    ratingMedia: Number(aggRows[0]?.media || 0),
    ratingCount: Number(aggRows[0]?.total || 0),
    minhaNota: minha ? Number(minha.nota) : 0,
  };
}

async function mapUsuario(row, { self = false, reviewerId = null } = {}) {
  if (!row) return null;

  const [seguidoresRows, seguindoRows, starProgress, ratings] = await Promise.all([
    query("SELECT COUNT(*) AS c FROM seguidores WHERE seguido_id = ?", [row.id]),
    query(
      "SELECT u.username FROM seguidores s JOIN usuarios u ON u.id = s.seguido_id WHERE s.seguidor_id = ?",
      [row.id]
    ),
    getStarProgress(row.id),
    getRatingSummary(row.id, reviewerId),
  ]);

  const isAdmin = !!row.is_admin || (row.email || "").toLowerCase() === ADMIN_EMAIL;
  const estrelas = calculateStars(starProgress, isAdmin);

  return {
    id: row.id,
    username: row.nome_exibicao || row.username,
    handle: row.username,
    email: self ? row.email || "" : "",
    telefone: self ? row.telefone || "" : "",
    bio: row.bio || "",
    fotoPerfil: row.avatar_url || "",
    fotoCapa: row.foto_capa_url || "",
    github: row.github_url || "",
    linkedin: row.linkedin_url || "",
    site: row.site_url || "",
    stack: row.stack || "",
    linguagemPrincipal: row.linguagem_principal || "",
    disponivelContratacao: !!row.disponivel_contratacao,
    authProvider: self ? row.auth_provider || "local" : undefined,
    isAdmin: self ? isAdmin : undefined,
    posPerfil: { x: Number(row.pos_perfil_x ?? 50), y: Number(row.pos_perfil_y ?? 50) },
    posCapa: { x: Number(row.pos_capa_x ?? 50), y: Number(row.pos_capa_y ?? 50) },
    zoomPerfil: Number(row.zoom_perfil ?? 100),
    zoomCapa: Number(row.zoom_capa ?? 100),
    criadoEm: row.criado_em,
    seguidores: Number(seguidoresRows[0]?.c || 0),
    seguindo: seguindoRows.map((r) => r.username),
    estrelas,
    avaliacao: estrelas,
    ratingMedia: ratings.ratingMedia,
    ratingCount: ratings.ratingCount,
    minhaNota: ratings.minhaNota,
    starStats: { ...starProgress, firstPostAwarded: starProgress.postsCreated > 0 },
    notifPrefs: self
      ? {
          contatos: row.notif_contatos !== 0,
          mensagens: row.notif_mensagens !== 0,
          atividade: row.notif_atividade !== 0,
        }
      : undefined,
    projetos: [],
    comments: 0,
  };
}

async function sendAuth(res, row, status = 200) {
  const token = await createSession(row.id);
  res.status(status).json({ token, user: await mapUsuario(row, { self: true }) });
}

app.get("/api/users", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM usuarios WHERE ativo = 1 ORDER BY id DESC LIMIT 100");
    const usuarios = await Promise.all(rows.map((row) => mapUsuario(row)));
    res.json(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar usuários." });
  }
});

app.get("/api/users/:id(\\d+)", async (req, res) => {
  try {
    const row = await queryOne("SELECT * FROM usuarios WHERE id = ?", [req.params.id]);
    if (!row) return res.status(404).json({ message: "Usuário não encontrado." });
    const session = await getSessionUser(req);
    const reviewerId = session?.usuario?.id || null;
    res.json(await mapUsuario(row, { self: reviewerId === row.id, reviewerId }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar usuário." });
  }
});

app.put("/api/users/:id(\\d+)", requireAuth, async (req, res) => {
  try {
    if (Number(req.params.id) !== req.usuario.id) {
      return res.status(403).json({ message: "Você só pode editar o próprio perfil." });
    }
    const updates = req.body || {};
    const columnMap = {
      username: "nome_exibicao",
      handle: "username",
      bio: "bio",
      fotoPerfil: "avatar_url",
      fotoCapa: "foto_capa_url",
      telefone: "telefone",
      github: "github_url",
      linkedin: "linkedin_url",
      site: "site_url",
      stack: "stack",
      linguagemPrincipal: "linguagem_principal",
      disponivelContratacao: "disponivel_contratacao",
      zoomPerfil: "zoom_perfil",
      zoomCapa: "zoom_capa",
    };

    const fields = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      const column = columnMap[key];
      if (!column) return;
      fields.push(`${column} = ?`);
      if (key === "disponivelContratacao") {
        values.push(value ? 1 : 0);
      } else if (key === "telefone") {
        values.push(onlyDigits(value) || null);
      } else if (key === "handle") {
        values.push(normalizeHandle(value));
      } else {
        values.push(value);
      }
    });

    // posPerfil/posCapa sao objetos {x, y}, cada um mapeando pra duas colunas
    if (updates.posPerfil && typeof updates.posPerfil === "object") {
      fields.push("pos_perfil_x = ?", "pos_perfil_y = ?");
      values.push(Number(updates.posPerfil.x) || 50, Number(updates.posPerfil.y) || 50);
    }
    if (updates.posCapa && typeof updates.posCapa === "object") {
      fields.push("pos_capa_x = ?", "pos_capa_y = ?");
      values.push(Number(updates.posCapa.x) || 50, Number(updates.posCapa.y) || 50);
    }

    if (updates.senha) {
      const atual = await queryOne("SELECT senha_hash FROM usuarios WHERE id = ?", [req.params.id]);
      if (!atual) return res.status(404).json({ message: "Usuário não encontrado." });

      const senhaAtualOk = updates.senhaAtual
        ? await bcrypt.compare(updates.senhaAtual, atual.senha_hash)
        : false;
      if (!senhaAtualOk) {
        return res.status(401).json({ message: "Senha atual incorreta." });
      }

      fields.push("senha_hash = ?");
      values.push(await bcrypt.hash(updates.senha, 10));
    }

    if (!fields.length) {
      return res.status(400).json({ message: "Nenhuma atualização válida enviada." });
    }

    values.push(req.params.id);
    await query(`UPDATE usuarios SET ${fields.join(", ")} WHERE id = ?`, values);
    const updated = await queryOne("SELECT * FROM usuarios WHERE id = ?", [req.params.id]);
    if (!updated) return res.status(404).json({ message: "Usuário não encontrado." });
    res.json(await mapUsuario(updated, { self: true }));
  } catch (error) {
    console.error(error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Esse @ ou email já está em uso." });
    }
    res.status(500).json({ message: "Erro ao atualizar usuário." });
  }
});

app.delete("/api/users/:id(\\d+)", requireAuth, async (req, res) => {
  try {
    if (Number(req.params.id) !== req.usuario.id) {
      return res.status(403).json({ message: "Você só pode excluir a própria conta." });
    }
    const result = await query("DELETE FROM usuarios WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }
    res.json({ message: "Usuário excluído com sucesso." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao excluir usuário." });
  }
});

app.post("/api/users/:id(\\d+)/follow", requireAuth, async (req, res) => {
  try {
    const seguidoId = Number(req.params.id);
    const seguidorId = req.usuario.id;
    if (!seguidoId || seguidorId === seguidoId) {
      return res.status(400).json({ message: "Não é possível seguir este perfil." });
    }

    const existente = await queryOne(
      "SELECT id FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?",
      [seguidorId, seguidoId]
    );

    if (existente) {
      await query("DELETE FROM seguidores WHERE id = ?", [existente.id]);
    } else {
      await query("INSERT INTO seguidores (seguidor_id, seguido_id) VALUES (?, ?)", [seguidorId, seguidoId]);
      await criarNotificacao(seguidoId, seguidorId, "seguidor");
    }

    const [seguidorRow, alvoRow] = await Promise.all([
      queryOne("SELECT * FROM usuarios WHERE id = ?", [seguidorId]),
      queryOne("SELECT * FROM usuarios WHERE id = ?", [seguidoId]),
    ]);
    res.json({
      seguindo: !existente,
      usuario: await mapUsuario(seguidorRow, { self: true }),
      alvo: await mapUsuario(alvoRow, { reviewerId: seguidorId }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao seguir/deixar de seguir usuário." });
  }
});

app.get("/api/users/:id(\\d+)/followers", async (req, res) => {
  try {
    const rows = await query(
      `SELECT u.* FROM seguidores s JOIN usuarios u ON u.id = s.seguidor_id WHERE s.seguido_id = ? ORDER BY s.criado_em DESC LIMIT 100`,
      [req.params.id]
    );
    res.json(await Promise.all(rows.map((row) => mapUsuario(row))));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar seguidores." });
  }
});

app.get("/api/users/:id(\\d+)/following", async (req, res) => {
  try {
    const rows = await query(
      `SELECT u.* FROM seguidores s JOIN usuarios u ON u.id = s.seguido_id WHERE s.seguidor_id = ? ORDER BY s.criado_em DESC LIMIT 100`,
      [req.params.id]
    );
    res.json(await Promise.all(rows.map((row) => mapUsuario(row))));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar quem segue." });
  }
});

app.put("/api/users/me/notification-prefs", requireAuth, async (req, res) => {
  try {
    const prefs = req.body || {};
    await query(
      "UPDATE usuarios SET notif_contatos = ?, notif_mensagens = ?, notif_atividade = ? WHERE id = ?",
      [
        prefs.contatos === false ? 0 : 1,
        prefs.mensagens === false ? 0 : 1,
        prefs.atividade === false ? 0 : 1,
        req.usuario.id,
      ]
    );
    const row = await queryOne("SELECT * FROM usuarios WHERE id = ?", [req.usuario.id]);
    res.json(await mapUsuario(row, { self: true }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao salvar preferências." });
  }
});

// ---------- Bloqueios ----------
// Bloquear e uma via so: quem bloqueia deixa de ver o perfil/posts de quem
// bloqueou (filtrado no frontend com a lista de bloqueados). Mensagem e
// solicitacao de contato, porem, ficam proibidas nos dois sentidos enquanto
// o bloqueio existir (checkForaBloqueado abaixo).
async function isBlocked(usuarioAId, usuarioBId) {
  const row = await queryOne(
    "SELECT id FROM bloqueios WHERE (usuario_id = ? AND bloqueado_id = ?) OR (usuario_id = ? AND bloqueado_id = ?) LIMIT 1",
    [usuarioAId, usuarioBId, usuarioBId, usuarioAId]
  );
  return !!row;
}

app.post("/api/users/:id(\\d+)/block", requireAuth, async (req, res) => {
  try {
    const bloqueadoId = Number(req.params.id);
    const bloqueadorId = req.usuario.id;
    if (!bloqueadoId || bloqueadorId === bloqueadoId) {
      return res.status(400).json({ message: "Não é possível bloquear este perfil." });
    }

    await query(
      "INSERT IGNORE INTO bloqueios (usuario_id, bloqueado_id) VALUES (?, ?)",
      [bloqueadorId, bloqueadoId]
    );
    res.json({ message: "Perfil bloqueado." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao bloquear usuário." });
  }
});

app.post("/api/users/:id(\\d+)/unblock", requireAuth, async (req, res) => {
  try {
    const bloqueadoId = Number(req.params.id);
    const bloqueadorId = req.usuario.id;
    if (!bloqueadoId) {
      return res.status(400).json({ message: "Perfil inválido." });
    }

    await query("DELETE FROM bloqueios WHERE usuario_id = ? AND bloqueado_id = ?", [
      bloqueadorId,
      bloqueadoId,
    ]);
    res.json({ message: "Perfil desbloqueado." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao desbloquear usuário." });
  }
});

app.get("/api/users/:id(\\d+)/blocked", requireAuth, async (req, res) => {
  try {
    if (Number(req.params.id) !== req.usuario.id) {
      return res.status(403).json({ message: "Você só pode ver os próprios bloqueios." });
    }
    const usuarioId = req.usuario.id;
    const rows = await query(
      `SELECT u.* FROM bloqueios b JOIN usuarios u ON u.id = b.bloqueado_id
       WHERE b.usuario_id = ? ORDER BY b.criado_em DESC`,
      [usuarioId]
    );
    res.json(await Promise.all(rows.map(mapUsuario)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar perfis bloqueados." });
  }
});

// ---------- Solicitacoes de contato ----------
// Clicar em "Contatar" em alguem com quem ainda nao existe conversa cria uma
// solicitacao pendente (notificacao); aceitar cria/reaproveita a conversa,
// recusar so remove a solicitacao. Se ja existe conversa, pula direto pra ela.

function mapSolicitacao(row) {
  return {
    id: row.id,
    remetente: {
      id: row.remetente_id,
      handle: row.remetente_username,
      username: row.remetente_nome || row.remetente_username,
      fotoPerfil: row.remetente_avatar || "",
    },
    criadoEm: row.criado_em,
  };
}

app.post("/api/users/:id(\\d+)/contact-request", requireAuth, async (req, res) => {
  try {
    const destinatarioId = Number(req.params.id);
    const remetenteId = req.usuario.id;
    if (!destinatarioId || remetenteId === destinatarioId) {
      return res.status(400).json({ message: "Não é possível contatar este perfil." });
    }

    if (await isBlocked(remetenteId, destinatarioId)) {
      return res.status(403).json({ message: "Não é possível contatar este perfil." });
    }

    const conversaExistente = await encontrarConversaExistente(remetenteId, destinatarioId);
    if (conversaExistente) {
      return res.json({ status: "conversa_existente", conversa: await mapConversa(conversaExistente.id) });
    }

    const jaPendente = await queryOne(
      "SELECT id FROM solicitacoes_contato WHERE remetente_id = ? AND destinatario_id = ?",
      [remetenteId, destinatarioId]
    );
    if (jaPendente) {
      return res.json({ status: "pendente", solicitacaoId: jaPendente.id });
    }

    const result = await query(
      "INSERT INTO solicitacoes_contato (remetente_id, destinatario_id) VALUES (?, ?)",
      [remetenteId, destinatarioId]
    );
    res.status(201).json({ status: "pendente", solicitacaoId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao enviar solicitação de contato." });
  }
});

app.get("/api/users/:id(\\d+)/contact-requests", requireAuth, async (req, res) => {
  try {
    if (Number(req.params.id) !== req.usuario.id) {
      return res.status(403).json({ message: "Você só pode ver as próprias solicitações." });
    }
    const destinatarioId = req.usuario.id;
    const rows = await query(
      `SELECT sc.id, sc.criado_em, sc.remetente_id,
        u.username AS remetente_username, u.nome_exibicao AS remetente_nome, u.avatar_url AS remetente_avatar
       FROM solicitacoes_contato sc JOIN usuarios u ON u.id = sc.remetente_id
       WHERE sc.destinatario_id = ? ORDER BY sc.criado_em DESC`,
      [destinatarioId]
    );
    res.json(rows.map(mapSolicitacao));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar solicitações de contato." });
  }
});

app.post("/api/contact-requests/:id(\\d+)/accept", requireAuth, async (req, res) => {
  try {
    const solicitacao = await queryOne("SELECT * FROM solicitacoes_contato WHERE id = ?", [req.params.id]);
    if (!solicitacao) return res.status(404).json({ message: "Solicitação não encontrada." });

    const usuarioId = req.usuario.id;
    if (usuarioId !== solicitacao.destinatario_id) {
      return res.status(403).json({ message: "Você não pode responder essa solicitação." });
    }

    const conversaId = await criarOuBuscarConversa(solicitacao.remetente_id, solicitacao.destinatario_id);
    await query("DELETE FROM solicitacoes_contato WHERE id = ?", [req.params.id]);

    res.json({ conversa: await mapConversa(conversaId) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao aceitar solicitação de contato." });
  }
});

app.post("/api/contact-requests/:id(\\d+)/decline", requireAuth, async (req, res) => {
  try {
    const solicitacao = await queryOne("SELECT * FROM solicitacoes_contato WHERE id = ?", [req.params.id]);
    if (!solicitacao) return res.status(404).json({ message: "Solicitação não encontrada." });

    const usuarioId = req.usuario.id;
    if (usuarioId !== solicitacao.destinatario_id) {
      return res.status(403).json({ message: "Você não pode responder essa solicitação." });
    }

    await query("DELETE FROM solicitacoes_contato WHERE id = ?", [req.params.id]);
    res.json({ message: "Solicitação recusada." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao recusar solicitação de contato." });
  }
});

app.get("/api/users/:handle", async (req, res) => {
  try {
    const row = await queryOne("SELECT * FROM usuarios WHERE LOWER(username) = LOWER(?)", [req.params.handle]);
    if (!row) return res.status(404).json({ message: "Usuário não encontrado." });
    const session = await getSessionUser(req);
    const reviewerId = session?.usuario?.id || null;
    res.json(await mapUsuario(row, { self: reviewerId === row.id, reviewerId }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar usuário." });
  }
});

app.post("/api/users/:id(\\d+)/ratings", requireAuth, async (req, res) => {
  try {
    const avaliadoId = Number(req.params.id);
    const avaliadorId = req.usuario.id;
    const nota = Number(req.body?.nota);
    if (!avaliadoId || avaliadorId === avaliadoId) {
      return res.status(400).json({ message: "Você não pode avaliar o próprio perfil." });
    }
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
      return res.status(400).json({ message: "A avaliação deve ser de 1 a 5 estrelas." });
    }
    const alvo = await queryOne("SELECT * FROM usuarios WHERE id = ? AND ativo = 1", [avaliadoId]);
    if (!alvo) return res.status(404).json({ message: "Usuário não encontrado." });

    await query(
      `INSERT INTO avaliacoes_perfil (avaliador_id, avaliado_id, nota)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE nota = VALUES(nota), atualizado_em = CURRENT_TIMESTAMP`,
      [avaliadorId, avaliadoId, nota]
    );
    await criarNotificacao(avaliadoId, avaliadorId, "avaliacao");

    res.json(await mapUsuario(alvo, { reviewerId: avaliadorId }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao avaliar perfil." });
  }
});

// ---------- Autenticação ----------

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeHandle(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function phoneEmailFromDigits(digits) {
  return digits ? `${digits}@phone.devspace.local` : "";
}

function digitsFromSyntheticEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  if (value.endsWith("@phone.devspace.local")) return onlyDigits(value.split("@")[0]);
  if (value.startsWith("tel_")) return onlyDigits(value.slice(4));
  return "";
}

function normalizeRegisterEmail({ email, telefone, authProvider }) {
  const trimmed = String(email || "").trim().toLowerCase();
  const digits = onlyDigits(telefone);
  if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) && !trimmed.startsWith("tel_")) {
    return trimmed;
  }
  if (trimmed.startsWith("tel_")) {
    return phoneEmailFromDigits(onlyDigits(trimmed.slice(4)) || digits);
  }
  if (digits) return phoneEmailFromDigits(digits);
  if (authProvider === "google") return trimmed;
  return trimmed;
}

async function encontrarUsuarioPorIdentificador(identificadorBruto) {
  const identificador = (identificadorBruto || "").trim();
  const semArroba = normalizeHandle(identificador);
  const somenteDigitos = onlyDigits(identificador);
  const phoneEmail = phoneEmailFromDigits(somenteDigitos);
  const legacyPhoneEmail = somenteDigitos ? `tel_${somenteDigitos}` : "";

  return queryOne(
    `SELECT * FROM usuarios
     WHERE LOWER(email) = LOWER(?)
        OR LOWER(username) = LOWER(?)
        OR (? <> '' AND LOWER(email) = LOWER(?))
        OR (? <> '' AND LOWER(email) = LOWER(?))
        OR (telefone IS NOT NULL AND telefone <> '' AND ? <> '' AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefone, '+', ''), ' ', ''), '-', ''), '(', ''), ')', '') = ?)`,
    [
      identificador,
      semArroba,
      phoneEmail, phoneEmail,
      legacyPhoneEmail, legacyPhoneEmail,
      somenteDigitos, somenteDigitos,
    ]
  );
}

async function fetchGoogleProfile(accessToken) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error("GOOGLE_USERINFO");
  }
  return response.json();
}

app.post("/api/auth/check", rateLimit({ max: 30 }), async (req, res) => {
  try {
    const email = normalizeRegisterEmail(req.body || {});
    const handle = normalizeHandle(req.body?.handle);
    const telefone = onlyDigits(req.body?.telefone) || digitsFromSyntheticEmail(req.body?.email || email);

    const [emailRow, handleRow, phoneRow] = await Promise.all([
      email
        ? queryOne("SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?) LIMIT 1", [email])
        : null,
      handle
        ? queryOne("SELECT id FROM usuarios WHERE LOWER(username) = LOWER(?) LIMIT 1", [handle])
        : null,
      telefone
        ? queryOne(
            `SELECT id FROM usuarios
             WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(IFNULL(telefone,''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', '') = ?
                OR LOWER(email) = LOWER(?)
                OR LOWER(email) = LOWER(?)
             LIMIT 1`,
            [telefone, phoneEmailFromDigits(telefone), `tel_${telefone}`],
          )
        : null,
    ]);

    res.json({
      email: email || null,
      handle: handle || null,
      telefone: telefone || null,
      emailTaken: Boolean(emailRow),
      handleTaken: Boolean(handleRow),
      telefoneTaken: Boolean(phoneRow),
      available: !emailRow && !handleRow && !phoneRow,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao verificar disponibilidade." });
  }
});

app.post("/api/auth/login", rateLimit({ max: 12 }), async (req, res) => {
  try {
    const { emailOrHandle, senha } = req.body;
    if (!emailOrHandle || !senha) {
      return res.status(400).json({ message: "Email/@ e senha são obrigatórios." });
    }

    const row = await encontrarUsuarioPorIdentificador(emailOrHandle);
    if (!row) {
      return res.status(401).json({ message: "Email/@ ou senha incorretos." });
    }

    let senhaOk = false;
    try {
      senhaOk = row.senha_hash ? await bcrypt.compare(senha, row.senha_hash) : false;
    } catch {
      senhaOk = false;
    }

    if (!senhaOk) {
      if (row.auth_provider === "google") {
        return res.status(401).json({ message: "Esta conta entra com Google." });
      }
      return res.status(401).json({ message: "Email/@ ou senha incorretos." });
    }

    await sendAuth(res, row);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao autenticar o usuário." });
  }
});

app.post("/api/auth/google", rateLimit({ max: 12 }), async (req, res) => {
  try {
    const accessToken = req.body?.accessToken;
    if (!accessToken) {
      return res.status(400).json({ message: "Token do Google é obrigatório." });
    }

    const profile = await fetchGoogleProfile(accessToken);
    const email = String(profile.email || "").trim().toLowerCase();
    const googleId = String(profile.sub || profile.id || "").trim();
    if (!email || !googleId) {
      return res.status(400).json({ message: "A conta Google não retornou um email válido." });
    }
    if (profile.email_verified !== true && String(profile.email_verified) !== "true") {
      return res.status(401).json({ message: "Confirme o e-mail da conta Google antes de entrar." });
    }

    let row = googleId
      ? await queryOne("SELECT * FROM usuarios WHERE google_id = ? LIMIT 1", [googleId])
      : null;
    if (!row) {
      row = await queryOne("SELECT * FROM usuarios WHERE LOWER(email) = LOWER(?) LIMIT 1", [email]);
    }

    if (row) {
      await query(
        "UPDATE usuarios SET google_id = COALESCE(google_id, ?), auth_provider = IF(auth_provider = 'local', 'google', auth_provider), avatar_url = COALESCE(NULLIF(avatar_url, ''), ?) WHERE id = ?",
        [googleId, profile.picture || null, row.id],
      );
      const updated = await queryOne("SELECT * FROM usuarios WHERE id = ?", [row.id]);
      return sendAuth(res, updated);
    }

    res.json({
      needsProfile: true,
      profile: {
        email,
        name: profile.name || "",
        picture: profile.picture || "",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: "Não foi possível validar a conta Google." });
  }
});

app.post("/api/auth/forgot", rateLimit({ max: 8 }), async (req, res) => {
  try {
    const emailOrHandle = String(req.body?.emailOrHandle || "").trim();
    if (!emailOrHandle) {
      return res.status(400).json({ message: "Informe seu e-mail, usuário ou @." });
    }

    const row = await encontrarUsuarioPorIdentificador(emailOrHandle);
    if (!row) {
      return res.json({ message: "Se a conta existir, um código foi gerado." });
    }

    const codigo = await storePasswordReset(row.id);
    res.json({
      message: "Use o código para continuar.",
      codigo,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao iniciar a recuperação de senha." });
  }
});

app.post("/api/auth/send-code", rateLimit({ max: 8 }), async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const telefone = onlyDigits(req.body?.telefone);
    const destino = email || telefone;
    if (!destino) {
      return res.status(400).json({ message: "Informe um e-mail ou celular." });
    }

    const codigo = await storeVerificationCode(destino);
    res.json({
      message: "Use o código para continuar.",
      codigo,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao gerar o código de verificação." });
  }
});

app.post("/api/auth/logout", requireAuth, async (req, res) => {
  try {
    await destroySession(req.sessionToken);
    res.json({ message: "Sessão encerrada." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao sair." });
  }
});

app.post("/api/auth/reset-password", rateLimit({ max: 8 }), async (req, res) => {
  try {
    const { emailOrHandle, codigo, novaSenha } = req.body;
    if (!emailOrHandle || !codigo || !novaSenha) {
      return res.status(400).json({ message: "Identificador, código e nova senha são obrigatórios." });
    }
    if (novaSenha.length < 6) {
      return res.status(400).json({ message: "A nova senha precisa ter pelo menos 6 caracteres." });
    }

    const row = await encontrarUsuarioPorIdentificador(emailOrHandle);
    if (!row) {
      return res.status(404).json({ message: "Não encontramos uma conta com esses dados." });
    }

    const codigoOk = await consumePasswordReset(row.id, codigo);
    if (!codigoOk) {
      return res.status(401).json({ message: "Código inválido ou expirado." });
    }

    const hash = await bcrypt.hash(novaSenha, 10);
    await query("UPDATE usuarios SET senha_hash = ? WHERE id = ?", [hash, row.id]);
    await query("DELETE FROM sessoes WHERE usuario_id = ?", [row.id]);

    res.json({ message: "Senha redefinida com sucesso." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao redefinir a senha." });
  }
});

app.post("/api/auth/register", rateLimit({ max: 12 }), async (req, res) => {
  try {
    const {
      username,
      handle,
      email,
      senha,
      telefone,
      bio,
      fotoPerfil,
      fotoCapa,
      disponivelContratacao,
      authProvider,
      codigo,
      accessToken,
    } = req.body;

    const handleLimpo = normalizeHandle(handle);
    const telefoneLimpo = onlyDigits(telefone);
    let emailLimpo = normalizeRegisterEmail({ email, telefone: telefoneLimpo, authProvider });
    let provider = authProvider === "google" ? "google" : telefoneLimpo && !String(email || "").includes("@") ? "sms" : "local";
    let googleId = null;
    const senhaEfetiva = senha || (provider === "google" ? crypto.randomBytes(24).toString("hex") : "");

    if (!handleLimpo || !emailLimpo) {
      return res.status(400).json({ message: "handle e email/telefone são obrigatórios." });
    }
    if (provider !== "google" && !senhaEfetiva) {
      return res.status(400).json({ message: "handle, email/telefone e senha são obrigatórios." });
    }
    if (!/^[a-z0-9._]{3,30}$/.test(handleLimpo)) {
      return res.status(400).json({ message: "O @ deve ter 3-30 caracteres (letras, números, . ou _)." });
    }
    if (provider !== "google" && String(senhaEfetiva).length < 6) {
      return res.status(400).json({ message: "A senha precisa ter pelo menos 6 caracteres." });
    }

    if (provider === "google") {
      if (!accessToken) {
        return res.status(400).json({ message: "Token do Google é obrigatório." });
      }
      const profile = await fetchGoogleProfile(accessToken);
      emailLimpo = String(profile.email || "").trim().toLowerCase();
      googleId = String(profile.sub || profile.id || "").trim();
      if (!emailLimpo || !googleId) {
        return res.status(400).json({ message: "A conta Google não retornou um email válido." });
      }
    } else {
      const destino = emailLimpo.includes("@phone.devspace.local") ? telefoneLimpo : emailLimpo;
      const codigoOk = await consumeVerificationCode(destino, codigo);
      if (!codigoOk) {
        return res.status(401).json({ message: "Código de verificação inválido ou expirado." });
      }
    }

    const existing = await queryOne(
      `SELECT id FROM usuarios
       WHERE LOWER(email) = LOWER(?)
          OR LOWER(username) = LOWER(?)
          OR (? <> '' AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(IFNULL(telefone,''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', '') = ?)
       LIMIT 1`,
      [emailLimpo, handleLimpo, telefoneLimpo, telefoneLimpo],
    );
    if (existing) {
      return res.status(409).json({ message: "Email, telefone ou @ já cadastrado." });
    }

    const senhaHash = await bcrypt.hash(senhaEfetiva, 10);
    const result = await query(
      `INSERT INTO usuarios
        (username, email, senha_hash, telefone, nome_exibicao, bio, avatar_url, foto_capa_url, disponivel_contratacao, google_id, auth_provider)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        handleLimpo,
        emailLimpo,
        senhaHash,
        telefoneLimpo || null,
        String(username || handleLimpo).slice(0, 100),
        bio || null,
        fotoPerfil || null,
        fotoCapa || null,
        disponivelContratacao ? 1 : 0,
        googleId,
        provider,
      ],
    );

    const user = await queryOne("SELECT * FROM usuarios WHERE id = ?", [result.insertId]);
    await sendAuth(res, user, 201);
  } catch (error) {
    console.error(error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email, telefone ou @ já cadastrado." });
    }
    res.status(500).json({ message: "Erro ao registrar usuário." });
  }
});

// ---------- Posts ----------

async function getPostFull(postRow, viewerUsername = null) {
  const [likesRows, sharesRows, bookmarksRows, imagemRow, anexoRow, commentsRows, pollRow] = await Promise.all([
    query(
      "SELECT u.username FROM post_interacoes pi JOIN usuarios u ON u.id = pi.usuario_id WHERE pi.post_id = ? AND pi.tipo = 'like'",
      [postRow.id]
    ),
    query(
      "SELECT u.username FROM post_shares s JOIN usuarios u ON u.id = s.usuario_id WHERE s.post_id = ?",
      [postRow.id]
    ),
    query(
      "SELECT u.username FROM post_bookmarks b JOIN usuarios u ON u.id = b.usuario_id WHERE b.post_id = ?",
      [postRow.id]
    ),
    queryOne(
      "SELECT url FROM midias WHERE post_id = ? AND tipo IN ('imagem', 'gif') AND nome_original IS NULL ORDER BY id ASC LIMIT 1",
      [postRow.id]
    ),
    queryOne(
      "SELECT url, tipo, tamanho_bytes, nome_original, mime_original FROM midias WHERE post_id = ? AND nome_original IS NOT NULL ORDER BY id ASC LIMIT 1",
      [postRow.id]
    ),
    query(
      `SELECT c.*, u.username AS autor_username, u.nome_exibicao AS autor_nome, u.avatar_url AS autor_avatar, u.email AS autor_email,
        (SELECT url FROM midias WHERE comentario_id = c.id LIMIT 1) AS imagem_url
       FROM comentarios c JOIN usuarios u ON u.id = c.usuario_id
       WHERE c.post_id = ? ORDER BY c.criado_em ASC`,
      [postRow.id]
    ),
    queryOne("SELECT id FROM post_polls WHERE post_id = ?", [postRow.id]),
  ]);

  const commentsList = await Promise.all(
    commentsRows.map(async (c) => {
      const likesC = await query(
        "SELECT u.username FROM comentario_curtidas cc JOIN usuarios u ON u.id = cc.usuario_id WHERE cc.comentario_id = ?",
        [c.id]
      );
      return {
        id: c.id,
        username: c.autor_nome || c.autor_username,
        handle: c.autor_username,
        email: c.autor_email,
        fotoPerfil: c.autor_avatar || "",
        texto: c.conteudo,
        imagem: c.imagem_url || "",
        criadoEm: c.criado_em,
        parentId: c.comentario_pai_id,
        likes: likesC.length,
        likedBy: likesC.map((r) => r.username),
      };
    })
  );

  let poll = null;
  if (pollRow) {
    const opcoes = await query("SELECT * FROM post_poll_opcoes WHERE poll_id = ? ORDER BY ordem ASC, id ASC", [
      pollRow.id,
    ]);
    const optionVoters = await Promise.all(
      opcoes.map(async (op) => {
        const votos = await query(
          "SELECT u.username FROM post_poll_votos v JOIN usuarios u ON u.id = v.usuario_id WHERE v.opcao_id = ?",
          [op.id]
        );
        return votos.map((v) => v.username);
      })
    );
    poll = { options: opcoes.map((op) => op.texto), optionVoters };
  }

  return {
    id: postRow.id,
    username: postRow.autor_nome || postRow.autor_username,
    handle: postRow.autor_username,
    email: postRow.autor_email,
    fotoPerfil: postRow.autor_avatar || "",
    texto: postRow.conteudo,
    imagem: imagemRow?.url || "",
    criadoEm: postRow.criado_em,
    tag: postRow.linguagem_tag || "",
    agendadoPara: postRow.publicar_em ? new Date(postRow.publicar_em).toISOString() : "",
    comments: commentsList.length,
    shares: sharesRows.length,
    likes: likesRows.length,
    bookmarks: bookmarksRows.length,
    likedBy: likesRows.map((r) => r.username),
    savedBy:
      viewerUsername && bookmarksRows.some((r) => r.username === viewerUsername) ? [viewerUsername] : [],
    repostedBy: sharesRows.map((r) => r.username),
    commentsList,
    poll,
    anexo: serializeAnexo(anexoRow),
    isSeedFake: false,
  };
}

const POST_SELECT = `
  SELECT p.*, u.username AS autor_username, u.nome_exibicao AS autor_nome, u.avatar_url AS autor_avatar, u.email AS autor_email
  FROM posts p JOIN usuarios u ON u.id = p.usuario_id
`;

app.get("/api/posts", async (req, res) => {
  try {
    const session = await getSessionUser(req);
    const viewerUsername = session?.usuario?.username || null;
    const rows = await query(
      `${POST_SELECT} WHERE p.publicar_em IS NULL OR p.publicar_em <= NOW() ORDER BY p.criado_em DESC LIMIT 80`
    );
    const posts = await Promise.all(rows.map((row) => getPostFull(row, viewerUsername)));
    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar publicações." });
  }
});

app.get("/api/me/collections/:tipo", requireAuth, async (req, res) => {
  try {
    const tipo = String(req.params.tipo || "").toLowerCase();
    const usuarioId = req.usuario.id;
    let sql;
    if (tipo === "salvos") {
      sql = `${POST_SELECT} INNER JOIN post_bookmarks b ON b.post_id = p.id AND b.usuario_id = ?
             WHERE p.publicar_em IS NULL OR p.publicar_em <= NOW()
             ORDER BY b.criado_em DESC LIMIT 80`;
    } else if (tipo === "curtidos") {
      sql = `${POST_SELECT} INNER JOIN post_interacoes pi ON pi.post_id = p.id AND pi.usuario_id = ? AND pi.tipo = 'like'
             WHERE p.publicar_em IS NULL OR p.publicar_em <= NOW()
             ORDER BY pi.criado_em DESC LIMIT 80`;
    } else if (tipo === "republicados") {
      sql = `${POST_SELECT} INNER JOIN post_shares s ON s.post_id = p.id AND s.usuario_id = ?
             WHERE p.publicar_em IS NULL OR p.publicar_em <= NOW()
             ORDER BY s.criado_em DESC LIMIT 80`;
    } else {
      return res.status(400).json({ message: "Coleção inválida." });
    }
    const rows = await query(sql, [usuarioId]);
    res.json(await Promise.all(rows.map((row) => getPostFull(row, req.usuario.username))));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar coleção." });
  }
});

app.get("/api/posts/:id(\\d+)", async (req, res) => {
  try {
    const session = await getSessionUser(req);
    const row = await queryOne(`${POST_SELECT} WHERE p.id = ?`, [req.params.id]);
    if (!row) return res.status(404).json({ message: "Post não encontrado." });
    res.json(await getPostFull(row, session?.usuario?.username || null));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar publicação." });
  }
});

app.post("/api/posts", requireAuth, async (req, res) => {
  try {
    const { texto, imagem, anexo, poll, tag, agendadoPara } = req.body;
    const usuarioId = req.usuario.id;
    if (!texto?.trim() && !imagem && !anexo && !(poll?.options?.length >= 2)) {
      return res.status(400).json({ message: "Post vazio." });
    }

    const publicarEm = agendadoPara ? new Date(agendadoPara) : null;

    const result = await query(
      "INSERT INTO posts (usuario_id, conteudo, linguagem_tag, publicar_em) VALUES (?, ?, ?, ?)",
      [usuarioId, texto || "", tag || null, publicarEm]
    );
    const postId = result.insertId;

    if (imagem) {
      await query("INSERT INTO midias (usuario_id, post_id, url, tipo) VALUES (?, ?, ?, 'imagem')", [
        usuarioId,
        postId,
        imagem,
      ]);
    }

    if (anexo?.url) {
      const mime = anexo.tipo || mimeFromName(anexo.nome);
      const tipo = midiaTipoFromMime(mime) === "video" ? "video" : "arquivo";
      if (!MIDIA_TIPOS.includes(tipo)) {
        return res.status(400).json({ message: "Tipo de anexo inválido." });
      }
      await query(
        "INSERT INTO midias (usuario_id, post_id, url, tipo, tamanho_bytes, nome_original, mime_original) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          usuarioId,
          postId,
          anexo.url,
          tipo,
          anexo.tamanho ?? null,
          anexo.nome || inferNameFromUrl(anexo.url),
          anexo.tipo || mimeFromName(anexo.nome) || null,
        ]
      );
    }

    if (poll?.options?.length >= 2) {
      const pollResult = await query("INSERT INTO post_polls (post_id) VALUES (?)", [postId]);
      const pollId = pollResult.insertId;
      for (let i = 0; i < poll.options.length; i += 1) {
        await query("INSERT INTO post_poll_opcoes (poll_id, texto, ordem) VALUES (?, ?, ?)", [
          pollId,
          poll.options[i],
          i,
        ]);
      }
    }

    await notificarMencoes(texto, postId, usuarioId);

    const createdRow = await queryOne(`${POST_SELECT} WHERE p.id = ?`, [postId]);
    res.status(201).json(await getPostFull(createdRow, req.usuario.username));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar publicação." });
  }
});

app.put("/api/posts/:id(\\d+)", requireAuth, async (req, res) => {
  try {
    const post = await queryOne("SELECT * FROM posts WHERE id = ?", [req.params.id]);
    if (!post) return res.status(404).json({ message: "Post não encontrado." });
    if (post.usuario_id !== req.usuario.id) {
      return res.status(403).json({ message: "Você só pode editar os próprios posts." });
    }

    const { texto, tag } = req.body || {};
    const fields = [];
    const values = [];

    if (typeof texto === "string") {
      fields.push("conteudo = ?");
      values.push(texto);
    }
    if (typeof tag === "string") {
      fields.push("linguagem_tag = ?");
      values.push(tag || null);
    }

    if (!fields.length) {
      return res.status(400).json({ message: "Nenhuma atualização válida enviada." });
    }

    values.push(req.params.id);
    await query(`UPDATE posts SET ${fields.join(", ")} WHERE id = ?`, values);
    const updatedRow = await queryOne(`${POST_SELECT} WHERE p.id = ?`, [req.params.id]);
    res.json(await getPostFull(updatedRow, req.usuario.username));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar publicação." });
  }
});

app.delete("/api/posts/:id(\\d+)", requireAuth, async (req, res) => {
  try {
    const post = await queryOne("SELECT usuario_id FROM posts WHERE id = ?", [req.params.id]);
    if (!post) return res.status(404).json({ message: "Post não encontrado." });
    if (post.usuario_id !== req.usuario.id) {
      return res.status(403).json({ message: "Você só pode excluir os próprios posts." });
    }
    const result = await query("DELETE FROM posts WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Post não encontrado." });
    }
    res.json({ message: "Post deletado com sucesso." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao deletar post." });
  }
});

// ---------- Notificacoes de atividade ----------
// (curtida no post, comentario no post, curtida no comentario, mencao)

async function criarNotificacao(destinatarioId, atorId, tipo, extras = {}) {
  if (!destinatarioId || !atorId || destinatarioId === atorId) return;
  try {
    await query(
      "INSERT INTO notificacoes (destinatario_id, ator_id, tipo, post_id, comentario_id) VALUES (?, ?, ?, ?, ?)",
      [destinatarioId, atorId, tipo, extras.postId || null, extras.comentarioId || null]
    );
  } catch (error) {
    console.warn("Notificação não criada:", error.message);
  }
}

// Detecta @handles no texto do post e notifica cada usuario real e existente
// mencionado (ignora auto-mencao e handles que nao existem).
async function notificarMencoes(texto, postId, atorId) {
  if (!texto) return;
  const handles = [...new Set((texto.match(/@([a-zA-Z0-9._-]{3,30})/g) || []).map((m) => m.slice(1).toLowerCase()))];
  if (handles.length === 0) return;

  for (const handle of handles) {
    const usuario = await queryOne("SELECT id FROM usuarios WHERE LOWER(username) = LOWER(?)", [handle]);
    if (usuario) {
      await criarNotificacao(usuario.id, atorId, "mencao", { postId });
    }
  }
}

// ---------- Reações a posts (curtir / repostar / salvar) ----------

async function toggleSimpleRelation(table, postId, usuarioId) {
  const existente = await queryOne(`SELECT id FROM ${table} WHERE post_id = ? AND usuario_id = ?`, [
    postId,
    usuarioId,
  ]);
  if (existente) {
    await query(`DELETE FROM ${table} WHERE id = ?`, [existente.id]);
    return false;
  }
  await query(`INSERT INTO ${table} (post_id, usuario_id) VALUES (?, ?)`, [postId, usuarioId]);
  return true;
}

app.post("/api/posts/:id(\\d+)/like", requireAuth, async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const usuarioId = req.usuario.id;

    const existente = await queryOne(
      "SELECT id FROM post_interacoes WHERE post_id = ? AND usuario_id = ? AND tipo = 'like'",
      [postId, usuarioId]
    );

    let liked;
    if (existente) {
      await query("DELETE FROM post_interacoes WHERE id = ?", [existente.id]);
      liked = false;
    } else {
      await query("INSERT INTO post_interacoes (post_id, usuario_id, tipo) VALUES (?, ?, 'like')", [
        postId,
        usuarioId,
      ]);
      liked = true;

      const post = await queryOne("SELECT usuario_id FROM posts WHERE id = ?", [postId]);
      if (post) await criarNotificacao(post.usuario_id, usuarioId, "curtida_post", { postId });
    }

    const [{ c: likes }] = await query(
      "SELECT COUNT(*) AS c FROM post_interacoes WHERE post_id = ? AND tipo = 'like'",
      [postId]
    );
    res.json({ liked, likes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao curtir/descurtir post." });
  }
});

app.post("/api/posts/:id(\\d+)/share", requireAuth, async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const usuarioId = req.usuario.id;

    const shared = await toggleSimpleRelation("post_shares", postId, usuarioId);
    const [{ c: shares }] = await query("SELECT COUNT(*) AS c FROM post_shares WHERE post_id = ?", [postId]);
    res.json({ shared, shares });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao repostar post." });
  }
});

app.post("/api/posts/:id(\\d+)/bookmark", requireAuth, async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const usuarioId = req.usuario.id;

    const bookmarked = await toggleSimpleRelation("post_bookmarks", postId, usuarioId);
    const [{ c: bookmarks }] = await query("SELECT COUNT(*) AS c FROM post_bookmarks WHERE post_id = ?", [postId]);
    res.json({ bookmarked, bookmarks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao salvar post." });
  }
});

// ---------- Enquetes ----------

app.post("/api/posts/:id(\\d+)/poll/vote", requireAuth, async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const usuarioId = req.usuario.id;
    const optionIndex = Number(req.body?.optionIndex);
    if (Number.isNaN(optionIndex)) {
      return res.status(400).json({ message: "optionIndex é obrigatório." });
    }

    const poll = await queryOne("SELECT id FROM post_polls WHERE post_id = ?", [postId]);
    if (!poll) return res.status(404).json({ message: "Este post não tem enquete." });

    const opcoes = await query("SELECT * FROM post_poll_opcoes WHERE poll_id = ? ORDER BY ordem ASC, id ASC", [
      poll.id,
    ]);
    const opcaoAlvo = opcoes[optionIndex];
    if (!opcaoAlvo) return res.status(400).json({ message: "Opção inválida." });

    const votoAtual = await queryOne("SELECT id, opcao_id FROM post_poll_votos WHERE poll_id = ? AND usuario_id = ?", [
      poll.id,
      usuarioId,
    ]);

    if (votoAtual && votoAtual.opcao_id === opcaoAlvo.id) {
      await query("DELETE FROM post_poll_votos WHERE id = ?", [votoAtual.id]);
    } else if (votoAtual) {
      await query("UPDATE post_poll_votos SET opcao_id = ? WHERE id = ?", [opcaoAlvo.id, votoAtual.id]);
    } else {
      await query("INSERT INTO post_poll_votos (poll_id, opcao_id, usuario_id) VALUES (?, ?, ?)", [
        poll.id,
        opcaoAlvo.id,
        usuarioId,
      ]);
    }

    const postRow = await queryOne(`${POST_SELECT} WHERE p.id = ?`, [postId]);
    res.json(await getPostFull(postRow, req.usuario.username));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao votar na enquete." });
  }
});

// ---------- Comentários ----------

app.post("/api/posts/:id(\\d+)/comments", requireAuth, async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const usuarioId = req.usuario.id;
    const { texto, parentId, imagem } = req.body || {};
    if (!texto?.trim() && !imagem) {
      return res.status(400).json({ message: "Texto ou imagem são obrigatórios." });
    }

    const result = await query(
      "INSERT INTO comentarios (post_id, usuario_id, comentario_pai_id, conteudo) VALUES (?, ?, ?, ?)",
      [postId, usuarioId, parentId || null, texto?.trim() || ""]
    );

    if (imagem) {
      await query("INSERT INTO midias (usuario_id, comentario_id, url, tipo) VALUES (?, ?, ?, 'imagem')", [
        usuarioId,
        result.insertId,
        imagem,
      ]);
    }

    const postRow = await queryOne(`${POST_SELECT} WHERE p.id = ?`, [postId]);
    if (!postRow) return res.status(404).json({ message: "Post não encontrado." });

    await criarNotificacao(postRow.usuario_id, usuarioId, "comentario_post", {
      postId,
      comentarioId: result.insertId,
    });

    res.status(201).json(await getPostFull(postRow, req.usuario.username));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao comentar." });
  }
});

app.delete("/api/comments/:id(\\d+)", requireAuth, async (req, res) => {
  try {
    const comentario = await queryOne("SELECT post_id, usuario_id FROM comentarios WHERE id = ?", [req.params.id]);
    if (!comentario) return res.status(404).json({ message: "Comentário não encontrado." });
    const postDono = await queryOne("SELECT usuario_id FROM posts WHERE id = ?", [comentario.post_id]);
    if (comentario.usuario_id !== req.usuario.id && postDono?.usuario_id !== req.usuario.id) {
      return res.status(403).json({ message: "Você não pode excluir este comentário." });
    }

    await query("DELETE FROM comentarios WHERE id = ?", [req.params.id]);

    const postRow = await queryOne(`${POST_SELECT} WHERE p.id = ?`, [comentario.post_id]);
    res.json(await getPostFull(postRow, req.usuario.username));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao excluir comentário." });
  }
});

app.post("/api/comments/:id(\\d+)/like", requireAuth, async (req, res) => {
  try {
    const comentarioId = Number(req.params.id);
    const usuarioId = req.usuario.id;

    const comentario = await queryOne("SELECT post_id, usuario_id FROM comentarios WHERE id = ?", [comentarioId]);
    if (!comentario) return res.status(404).json({ message: "Comentário não encontrado." });

    const existente = await queryOne(
      "SELECT id FROM comentario_curtidas WHERE comentario_id = ? AND usuario_id = ?",
      [comentarioId, usuarioId]
    );
    if (existente) {
      await query("DELETE FROM comentario_curtidas WHERE id = ?", [existente.id]);
    } else {
      await query("INSERT INTO comentario_curtidas (comentario_id, usuario_id) VALUES (?, ?)", [
        comentarioId,
        usuarioId,
      ]);
      await criarNotificacao(comentario.usuario_id, usuarioId, "curtida_comentario", {
        postId: comentario.post_id,
        comentarioId,
      });
    }

    const postRow = await queryOne(`${POST_SELECT} WHERE p.id = ?`, [comentario.post_id]);
    res.json(await getPostFull(postRow, req.usuario.username));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao curtir comentário." });
  }
});

// ---------- Tarefas (recurso simples, sem relação com o feed) ----------

app.get("/api/tarefas", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM tarefas ORDER BY data_criacao DESC");
    res.json(rows.map((row) => ({
      id: row.id,
      descricao: row.descricao,
      status: !!row.status,
      data_criacao: row.data_criacao,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar tarefas." });
  }
});

app.post("/api/tarefas", async (req, res) => {
  try {
    const { descricao } = req.body;
    if (!descricao || !descricao.trim()) {
      return res.status(400).json({ message: "Descrição obrigatória." });
    }
    const result = await query("INSERT INTO tarefas (descricao, status) VALUES (?, 0)", [descricao.trim()]);
    const tarefa = await queryOne("SELECT * FROM tarefas WHERE id = ?", [result.insertId]);
    res.status(201).json({
      id: tarefa.id,
      descricao: tarefa.descricao,
      status: !!tarefa.status,
      data_criacao: tarefa.data_criacao,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar tarefa." });
  }
});

app.put("/api/tarefas/:id(\\d+)", async (req, res) => {
  try {
    const { descricao, status } = req.body;
    if (!descricao || typeof status !== "boolean") {
      return res.status(400).json({ message: "Dados inválidos." });
    }
    const result = await query("UPDATE tarefas SET descricao = ?, status = ? WHERE id = ?", [
      descricao.trim(),
      status ? 1 : 0,
      req.params.id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Tarefa não encontrada." });
    }
    const tarefa = await queryOne("SELECT * FROM tarefas WHERE id = ?", [req.params.id]);
    res.json({
      id: tarefa.id,
      descricao: tarefa.descricao,
      status: !!tarefa.status,
      data_criacao: tarefa.data_criacao,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar tarefa." });
  }
});

app.get("/api/tarefas/:id(\\d+)", async (req, res) => {
  try {
    const row = await queryOne("SELECT * FROM tarefas WHERE id = ?", [req.params.id]);
    if (!row) return res.status(404).json({ message: "Tarefa não encontrada." });
    res.json({ id: row.id, descricao: row.descricao, status: !!row.status, data_criacao: row.data_criacao });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar tarefa." });
  }
});

app.delete("/api/tarefas/:id(\\d+)", async (req, res) => {
  try {
    const result = await query("DELETE FROM tarefas WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Tarefa não encontrada." });
    }
    res.json({ message: "Tarefa deletada com sucesso." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao deletar tarefa." });
  }
});

// ---------- Chat ----------

function mapParticipante(row) {
  return {
    handle: row.username,
    username: row.nome_exibicao || row.username,
    fotoPerfil: row.avatar_url || "",
  };
}

async function mapConversa(conversaId) {
  const [conversaRow, participantesRows, mensagensRows] = await Promise.all([
    queryOne("SELECT * FROM conversas WHERE id = ?", [conversaId]),
    query(
      `SELECT u.username, u.nome_exibicao, u.avatar_url
       FROM conversa_participantes cp JOIN usuarios u ON u.id = cp.usuario_id
       WHERE cp.conversa_id = ?`,
      [conversaId]
    ),
    query(
      `SELECT m.*, u.username AS autor_username,
        (SELECT url FROM midias WHERE mensagem_id = m.id LIMIT 1) AS imagem_url
       FROM mensagens m JOIN usuarios u ON u.id = m.remetente_id
       WHERE m.conversa_id = ? ORDER BY m.criado_em ASC`,
      [conversaId]
    ),
  ]);

  if (!conversaRow) return null;

  return {
    id: conversaRow.id,
    participantes: participantesRows.map(mapParticipante),
    mensagens: mensagensRows.map((m) => ({
      id: m.id,
      autor: m.autor_username,
      texto: m.conteudo,
      imagem: m.imagem_url || "",
      criadoEm: m.criado_em,
    })),
    atualizadoEm: conversaRow.atualizado_em,
  };
}

app.get("/api/conversas", requireAuth, async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const conversaIds = await query(
      `SELECT c.id FROM conversas c
       JOIN conversa_participantes cp ON cp.conversa_id = c.id
       WHERE cp.usuario_id = ? ORDER BY c.atualizado_em DESC`,
      [usuarioId]
    );

    const conversas = await Promise.all(conversaIds.map((row) => mapConversa(row.id)));
    res.json(conversas.filter(Boolean));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar conversas." });
  }
});

async function encontrarConversaExistente(usuarioAId, usuarioBId) {
  return queryOne(
    `SELECT cp1.conversa_id AS id
     FROM conversa_participantes cp1
     JOIN conversa_participantes cp2 ON cp2.conversa_id = cp1.conversa_id AND cp2.usuario_id = ?
     WHERE cp1.usuario_id = ?
       AND (SELECT COUNT(*) FROM conversa_participantes cp3 WHERE cp3.conversa_id = cp1.conversa_id) = 2
     LIMIT 1`,
    [usuarioBId, usuarioAId]
  );
}

async function criarOuBuscarConversa(usuarioAId, usuarioBId) {
  const existente = await encontrarConversaExistente(usuarioAId, usuarioBId);
  if (existente) return existente.id;

  const result = await query("INSERT INTO conversas () VALUES ()");
  const conversaId = result.insertId;
  await query("INSERT INTO conversa_participantes (conversa_id, usuario_id) VALUES (?, ?), (?, ?)", [
    conversaId,
    usuarioAId,
    conversaId,
    usuarioBId,
  ]);
  return conversaId;
}

app.post("/api/conversas", requireAuth, async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const outroUsuarioId = Number(req.body?.outroUsuarioId);
    if (!outroUsuarioId || usuarioId === outroUsuarioId) {
      return res.status(400).json({ message: "outroUsuarioId (diferente) é obrigatório." });
    }

    if (await isBlocked(usuarioId, outroUsuarioId)) {
      return res.status(403).json({ message: "Não é possível conversar com este perfil." });
    }

    const conversaId = await criarOuBuscarConversa(usuarioId, outroUsuarioId);
    res.status(201).json(await mapConversa(conversaId));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar/criar conversa." });
  }
});

app.post("/api/conversas/:id(\\d+)/mensagens", requireAuth, async (req, res) => {
  try {
    const conversaId = Number(req.params.id);
    const usuarioId = req.usuario.id;
    const { texto, imagem } = req.body || {};
    if (!texto?.trim() && !imagem) {
      return res.status(400).json({ message: "Texto ou imagem são obrigatórios." });
    }

    const participante = await queryOne(
      "SELECT id FROM conversa_participantes WHERE conversa_id = ? AND usuario_id = ?",
      [conversaId, usuarioId]
    );
    if (!participante) return res.status(403).json({ message: "Usuário não participa dessa conversa." });

    const outroParticipante = await queryOne(
      "SELECT usuario_id FROM conversa_participantes WHERE conversa_id = ? AND usuario_id <> ?",
      [conversaId, usuarioId]
    );
    if (outroParticipante && (await isBlocked(usuarioId, outroParticipante.usuario_id))) {
      return res.status(403).json({ message: "Não é possível enviar mensagem para este perfil." });
    }

    const result = await query(
      "INSERT INTO mensagens (conversa_id, remetente_id, conteudo) VALUES (?, ?, ?)",
      [conversaId, usuarioId, (texto || "").trim()]
    );

    if (imagem) {
      await query("INSERT INTO midias (usuario_id, mensagem_id, url, tipo) VALUES (?, ?, ?, 'imagem')", [
        usuarioId,
        result.insertId,
        imagem,
      ]);
    }

    await query("UPDATE conversas SET atualizado_em = CURRENT_TIMESTAMP WHERE id = ?", [conversaId]);
    if (outroParticipante) {
      await criarNotificacao(outroParticipante.usuario_id, usuarioId, "mensagem");
    }

    res.status(201).json(await mapConversa(conversaId));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao enviar mensagem." });
  }
});

app.get("/api/conversas/unread", requireAuth, async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const rows = await query(
      `SELECT c.id AS conversa_id, c.atualizado_em,
        COUNT(m.id) AS nao_lidas,
        outro.username AS outro_username, outro.nome_exibicao AS outro_nome, outro.avatar_url AS outro_avatar
       FROM conversas c
       JOIN conversa_participantes cp_eu ON cp_eu.conversa_id = c.id AND cp_eu.usuario_id = ?
       JOIN conversa_participantes cp_outro ON cp_outro.conversa_id = c.id AND cp_outro.usuario_id != ?
       JOIN usuarios outro ON outro.id = cp_outro.usuario_id
       JOIN mensagens m ON m.conversa_id = c.id AND m.remetente_id != ? AND m.lida = 0
       GROUP BY c.id, c.atualizado_em, outro.username, outro.nome_exibicao, outro.avatar_url
       ORDER BY c.atualizado_em DESC`,
      [usuarioId, usuarioId, usuarioId]
    );

    res.json(
      rows.map((r) => ({
        conversaId: r.conversa_id,
        naoLidas: Number(r.nao_lidas),
        outroParticipante: {
          handle: r.outro_username,
          username: r.outro_nome || r.outro_username,
          fotoPerfil: r.outro_avatar || "",
        },
        atualizadoEm: r.atualizado_em,
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar mensagens não lidas." });
  }
});

app.post("/api/conversas/:id(\\d+)/marcar-lida", requireAuth, async (req, res) => {
  try {
    const conversaId = Number(req.params.id);
    const usuarioId = req.usuario.id;
    const participante = await queryOne(
      "SELECT id FROM conversa_participantes WHERE conversa_id = ? AND usuario_id = ?",
      [conversaId, usuarioId]
    );
    if (!participante) return res.status(403).json({ message: "Você não participa dessa conversa." });

    await query("UPDATE mensagens SET lida = 1 WHERE conversa_id = ? AND remetente_id != ?", [
      conversaId,
      usuarioId,
    ]);
    res.json({ message: "Conversa marcada como lida." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao marcar conversa como lida." });
  }
});

function mapNotificacao(row) {
  return {
    id: row.id,
    tipo: row.tipo,
    lida: !!row.lida,
    criadoEm: row.criado_em,
    postId: row.post_id,
    comentarioId: row.comentario_id,
    ator: {
      id: row.ator_id,
      handle: row.ator_username,
      username: row.ator_nome || row.ator_username,
      fotoPerfil: row.ator_avatar || "",
    },
    trecho: (row.trecho || "").slice(0, 80),
  };
}

app.get("/api/users/:id(\\d+)/notifications", requireAuth, async (req, res) => {
  try {
    if (Number(req.params.id) !== req.usuario.id) {
      return res.status(403).json({ message: "Você só pode ver as próprias notificações." });
    }
    const destinatarioId = req.usuario.id;
    const rows = await query(
      `SELECT n.*, u.username AS ator_username, u.nome_exibicao AS ator_nome, u.avatar_url AS ator_avatar,
        COALESCE(c.conteudo, p.conteudo) AS trecho
       FROM notificacoes n
       JOIN usuarios u ON u.id = n.ator_id
       LEFT JOIN posts p ON p.id = n.post_id
       LEFT JOIN comentarios c ON c.id = n.comentario_id
       WHERE n.destinatario_id = ?
       ORDER BY n.criado_em DESC
       LIMIT 50`,
      [destinatarioId]
    );
    res.json(rows.map(mapNotificacao));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar notificações." });
  }
});

app.post("/api/notifications/:id(\\d+)/read", requireAuth, async (req, res) => {
  try {
    await query("UPDATE notificacoes SET lida = 1 WHERE id = ? AND destinatario_id = ?", [
      req.params.id,
      req.usuario.id,
    ]);
    res.json({ message: "Notificação marcada como lida." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao marcar notificação como lida." });
  }
});

app.post("/api/notifications/read-from/:handle", requireAuth, async (req, res) => {
  try {
    const ator = await queryOne("SELECT id FROM usuarios WHERE username = ?", [req.params.handle]);
    if (!ator) return res.json({ message: "Nenhuma notificação para marcar." });
    await query(
      "UPDATE notificacoes SET lida = 1 WHERE destinatario_id = ? AND ator_id = ? AND tipo = 'mensagem'",
      [req.usuario.id, ator.id]
    );
    res.json({ message: "Notificações de mensagem marcadas como lidas." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao marcar notificações como lidas." });
  }
});

app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
  try {
    await query("UPDATE notificacoes SET lida = 1 WHERE destinatario_id = ?", [req.usuario.id]);
    res.json({ message: "Notificações marcadas como lidas." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao marcar notificações como lidas." });
  }
});

app.post("/api/uploads", requireAuth, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "O arquivo pode ter no máximo 12 MB."
          : err.message || "Falha no upload.";
      return res.status(400).json({ message });
    }
    if (!req.file) return res.status(400).json({ message: "Arquivo obrigatório." });
    res.status(201).json({
      url: `/api/uploads/${req.file.filename}`,
      nome: req.file.originalname,
      tipo: req.file.mimetype || mimeFromName(req.file.originalname),
      tamanho: req.file.size,
    });
  });
});

app.get("/api/uploads/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return res.status(400).json({ message: "Arquivo inválido." });
  }
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Arquivo não encontrado." });
  const original = req.query.nome ? safeDownloadName(req.query.nome) : filename;
  res.setHeader("Content-Disposition", `inline; filename="${original}"`);
  res.sendFile(filePath);
});

app.use((req, res) => {
  res.status(404).json({ message: "Rota não encontrada." });
});

Promise.all([ensureAuthTables(), ensureMidiaAnexoColumns()])
  .catch((error) => {
    console.error("Não foi possível preparar tabelas de sessão:", error.message);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Backend DevSpace (MySQL) rodando em http://localhost:${PORT}/api`);
    });
  });

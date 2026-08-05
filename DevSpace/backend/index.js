import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { query, queryOne } from "./db.js";

const PORT = Number(process.env.PORT || 4000);

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

const MIDIA_TIPOS = ["imagem", "video", "gif", "arquivo"];

function midiaTipoFromMime(mime) {
  if (!mime) return "arquivo";
  if (mime.startsWith("image/gif")) return "gif";
  if (mime.startsWith("image/")) return "imagem";
  if (mime.startsWith("video/")) return "video";
  return "arquivo";
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

async function mapUsuario(row) {
  if (!row) return null;

  const [seguidoresRows, seguindoRows, starProgress] = await Promise.all([
    query("SELECT COUNT(*) AS c FROM seguidores WHERE seguido_id = ?", [row.id]),
    query(
      "SELECT u.username FROM seguidores s JOIN usuarios u ON u.id = s.seguido_id WHERE s.seguidor_id = ?",
      [row.id]
    ),
    getStarProgress(row.id),
  ]);

  const isAdmin = !!row.is_admin || (row.email || "").toLowerCase() === ADMIN_EMAIL;
  const estrelas = calculateStars(starProgress, isAdmin);

  return {
    id: row.id,
    username: row.nome_exibicao || row.username,
    handle: row.username,
    email: row.email,
    telefone: row.telefone || "",
    bio: row.bio || "",
    fotoPerfil: row.avatar_url || "",
    fotoCapa: row.foto_capa_url || "",
    github: row.github_url || "",
    linkedin: row.linkedin_url || "",
    site: row.site_url || "",
    stack: row.stack || "",
    linguagemPrincipal: row.linguagem_principal || "",
    disponivelContratacao: !!row.disponivel_contratacao,
    isAdmin,
    posPerfil: { x: Number(row.pos_perfil_x ?? 50), y: Number(row.pos_perfil_y ?? 50) },
    posCapa: { x: Number(row.pos_capa_x ?? 50), y: Number(row.pos_capa_y ?? 50) },
    zoomPerfil: Number(row.zoom_perfil ?? 100),
    zoomCapa: Number(row.zoom_capa ?? 100),
    criadoEm: row.criado_em,
    seguidores: Number(seguidoresRows[0]?.c || 0),
    seguindo: seguindoRows.map((r) => r.username),
    estrelas,
    avaliacao: estrelas,
    starStats: { ...starProgress, firstPostAwarded: starProgress.postsCreated > 0 },
    projetos: [],
    comments: 0,
  };
}

async function findUsuarioIdByEmailOrHandle(email, handle) {
  const row = await queryOne(
    "SELECT id FROM usuarios WHERE (email IS NOT NULL AND LOWER(email) = LOWER(?)) OR (username IS NOT NULL AND LOWER(username) = LOWER(?)) LIMIT 1",
    [email || "", handle || ""]
  );
  return row?.id || null;
}

app.get("/api/users", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM usuarios WHERE ativo = 1 ORDER BY id DESC");
    const usuarios = await Promise.all(rows.map(mapUsuario));
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
    res.json(await mapUsuario(row));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar usuário." });
  }
});

app.put("/api/users/:id(\\d+)", async (req, res) => {
  try {
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
      values.push(key === "disponivelContratacao" ? (value ? 1 : 0) : value);
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
    res.json(await mapUsuario(updated));
  } catch (error) {
    console.error(error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Esse @ ou email já está em uso." });
    }
    res.status(500).json({ message: "Erro ao atualizar usuário." });
  }
});

app.delete("/api/users/:id(\\d+)", async (req, res) => {
  try {
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

app.post("/api/users/:id(\\d+)/follow", async (req, res) => {
  try {
    const seguidoId = Number(req.params.id);
    const seguidorId = Number(req.body?.seguidorId);
    if (!seguidorId || seguidorId === seguidoId) {
      return res.status(400).json({ message: "seguidorId inválido." });
    }

    const existente = await queryOne(
      "SELECT id FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?",
      [seguidorId, seguidoId]
    );

    if (existente) {
      await query("DELETE FROM seguidores WHERE id = ?", [existente.id]);
    } else {
      await query("INSERT INTO seguidores (seguidor_id, seguido_id) VALUES (?, ?)", [seguidorId, seguidoId]);
    }

    const seguidorRow = await queryOne("SELECT * FROM usuarios WHERE id = ?", [seguidorId]);
    res.json({ seguindo: !existente, usuario: await mapUsuario(seguidorRow) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao seguir/deixar de seguir usuário." });
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

app.post("/api/users/:id(\\d+)/contact-request", async (req, res) => {
  try {
    const destinatarioId = Number(req.params.id);
    const remetenteId = Number(req.body?.remetenteId);
    if (!remetenteId || remetenteId === destinatarioId) {
      return res.status(400).json({ message: "remetenteId inválido." });
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

app.get("/api/users/:id(\\d+)/contact-requests", async (req, res) => {
  try {
    const destinatarioId = Number(req.params.id);
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

app.post("/api/contact-requests/:id(\\d+)/accept", async (req, res) => {
  try {
    const solicitacao = await queryOne("SELECT * FROM solicitacoes_contato WHERE id = ?", [req.params.id]);
    if (!solicitacao) return res.status(404).json({ message: "Solicitação não encontrada." });

    const usuarioId = Number(req.body?.usuarioId);
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

app.post("/api/contact-requests/:id(\\d+)/decline", async (req, res) => {
  try {
    const solicitacao = await queryOne("SELECT * FROM solicitacoes_contato WHERE id = ?", [req.params.id]);
    if (!solicitacao) return res.status(404).json({ message: "Solicitação não encontrada." });

    const usuarioId = Number(req.body?.usuarioId);
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
    res.json(await mapUsuario(row));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar usuário." });
  }
});

// ---------- Autenticação ----------

// Aceita email, @ (username) ou telefone (comparado so pelos digitos, pra
// tolerar espacos/traco/parenteses no que a pessoa digitar).
async function encontrarUsuarioPorIdentificador(identificadorBruto) {
  const identificador = (identificadorBruto || "").trim();
  // O @ e so decoracao visual do handle (nao fica salvo no banco), entao
  // precisa ser removido antes de comparar com a coluna username.
  const semArroba = identificador.replace(/^@+/, "");
  const somenteDigitos = identificador.replace(/\D/g, "");

  return queryOne(
    `SELECT * FROM usuarios
     WHERE LOWER(email) = LOWER(?)
        OR LOWER(username) = LOWER(?)
        OR (telefone IS NOT NULL AND telefone <> '' AND ? <> '' AND telefone = ?)`,
    [identificador, semArroba, somenteDigitos, somenteDigitos]
  );
}

app.post("/api/auth/login", async (req, res) => {
  try {
    const { emailOrHandle, senha } = req.body;
    if (!emailOrHandle || !senha) {
      return res.status(400).json({ message: "Email/@ e senha são obrigatórios." });
    }

    const row = await encontrarUsuarioPorIdentificador(emailOrHandle);
    const senhaOk = row ? await bcrypt.compare(senha, row.senha_hash) : false;
    if (!row || !senhaOk) {
      return res.status(401).json({ message: "Email/@ ou senha incorretos." });
    }

    res.json(await mapUsuario(row));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao autenticar o usuário." });
  }
});

// A verificacao de identidade ("codigo enviado") acontece so no frontend
// (simulada, sem SMS/email de verdade) -- por isso essa rota nao pede a
// senha atual, so o identificador (ja "confirmado" pela etapa anterior).
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { emailOrHandle, novaSenha } = req.body;
    if (!emailOrHandle || !novaSenha) {
      return res.status(400).json({ message: "Identificador e nova senha são obrigatórios." });
    }
    if (novaSenha.length < 6) {
      return res.status(400).json({ message: "A nova senha precisa ter pelo menos 6 caracteres." });
    }

    const row = await encontrarUsuarioPorIdentificador(emailOrHandle);
    if (!row) {
      return res.status(404).json({ message: "Não encontramos uma conta com esses dados." });
    }

    const hash = await bcrypt.hash(novaSenha, 10);
    await query("UPDATE usuarios SET senha_hash = ? WHERE id = ?", [hash, row.id]);

    res.json({ message: "Senha redefinida com sucesso." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao redefinir a senha." });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, handle, email, senha, telefone, bio, fotoPerfil, fotoCapa } = req.body;
    if (!handle || !email || !senha) {
      return res.status(400).json({ message: "handle, email e senha são obrigatórios." });
    }

    const existing = await queryOne(
      "SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)",
      [email, handle]
    );
    if (existing) {
      return res.status(409).json({ message: "Email ou @ já cadastrado." });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const result = await query(
      `INSERT INTO usuarios (username, email, senha_hash, telefone, nome_exibicao, bio, avatar_url, foto_capa_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [handle, email, senhaHash, telefone || null, username || handle, bio || null, fotoPerfil || null, fotoCapa || null]
    );

    const user = await queryOne("SELECT * FROM usuarios WHERE id = ?", [result.insertId]);
    res.status(201).json(await mapUsuario(user));
  } catch (error) {
    console.error(error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email ou @ já cadastrado." });
    }
    res.status(500).json({ message: "Erro ao registrar usuário." });
  }
});

// ---------- Posts ----------

async function getPostFull(postRow) {
  const [likesRows, sharesRows, bookmarksRows, imagemRow, commentsRows, pollRow] = await Promise.all([
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
    queryOne("SELECT url FROM midias WHERE post_id = ? AND tipo IN ('imagem', 'gif') ORDER BY id ASC LIMIT 1", [
      postRow.id,
    ]),
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
    savedBy: bookmarksRows.map((r) => r.username),
    repostedBy: sharesRows.map((r) => r.username),
    commentsList,
    poll,
    isSeedFake: false,
  };
}

const POST_SELECT = `
  SELECT p.*, u.username AS autor_username, u.nome_exibicao AS autor_nome, u.avatar_url AS autor_avatar, u.email AS autor_email
  FROM posts p JOIN usuarios u ON u.id = p.usuario_id
`;

app.get("/api/posts", async (req, res) => {
  try {
    const rows = await query(
      `${POST_SELECT} WHERE p.publicar_em IS NULL OR p.publicar_em <= NOW() ORDER BY p.criado_em DESC`
    );
    const posts = await Promise.all(rows.map(getPostFull));
    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar publicações." });
  }
});

app.get("/api/posts/:id(\\d+)", async (req, res) => {
  try {
    const row = await queryOne(`${POST_SELECT} WHERE p.id = ?`, [req.params.id]);
    if (!row) return res.status(404).json({ message: "Post não encontrado." });
    res.json(await getPostFull(row));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar publicação." });
  }
});

app.post("/api/posts", async (req, res) => {
  try {
    const { email, handle, texto, imagem, anexo, poll, tag, agendadoPara } = req.body;

    const usuarioId = await findUsuarioIdByEmailOrHandle(email, handle);
    if (!usuarioId) {
      return res.status(400).json({ message: "Usuário autor não encontrado." });
    }
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
      const tipo = MIDIA_TIPOS.includes(midiaTipoFromMime(anexo.tipo)) ? midiaTipoFromMime(anexo.tipo) : "arquivo";
      await query(
        "INSERT INTO midias (usuario_id, post_id, url, tipo, tamanho_bytes) VALUES (?, ?, ?, ?, ?)",
        [usuarioId, postId, anexo.url, tipo, anexo.tamanho || null]
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

    const createdRow = await queryOne(`${POST_SELECT} WHERE p.id = ?`, [postId]);
    res.status(201).json(await getPostFull(createdRow));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar publicação." });
  }
});

app.put("/api/posts/:id(\\d+)", async (req, res) => {
  try {
    const post = await queryOne("SELECT * FROM posts WHERE id = ?", [req.params.id]);
    if (!post) return res.status(404).json({ message: "Post não encontrado." });

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
    res.json(await getPostFull(updatedRow));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar publicação." });
  }
});

app.delete("/api/posts/:id(\\d+)", async (req, res) => {
  try {
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

app.post("/api/posts/:id(\\d+)/like", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const usuarioId = Number(req.body?.usuarioId);
    if (!usuarioId) return res.status(400).json({ message: "usuarioId é obrigatório." });

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

app.post("/api/posts/:id(\\d+)/share", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const usuarioId = Number(req.body?.usuarioId);
    if (!usuarioId) return res.status(400).json({ message: "usuarioId é obrigatório." });

    const shared = await toggleSimpleRelation("post_shares", postId, usuarioId);
    const [{ c: shares }] = await query("SELECT COUNT(*) AS c FROM post_shares WHERE post_id = ?", [postId]);
    res.json({ shared, shares });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao repostar post." });
  }
});

app.post("/api/posts/:id(\\d+)/bookmark", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const usuarioId = Number(req.body?.usuarioId);
    if (!usuarioId) return res.status(400).json({ message: "usuarioId é obrigatório." });

    const bookmarked = await toggleSimpleRelation("post_bookmarks", postId, usuarioId);
    const [{ c: bookmarks }] = await query("SELECT COUNT(*) AS c FROM post_bookmarks WHERE post_id = ?", [postId]);
    res.json({ bookmarked, bookmarks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao salvar post." });
  }
});

// ---------- Enquetes ----------

app.post("/api/posts/:id(\\d+)/poll/vote", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const usuarioId = Number(req.body?.usuarioId);
    const optionIndex = Number(req.body?.optionIndex);
    if (!usuarioId || Number.isNaN(optionIndex)) {
      return res.status(400).json({ message: "usuarioId e optionIndex são obrigatórios." });
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
    res.json(await getPostFull(postRow));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao votar na enquete." });
  }
});

// ---------- Comentários ----------

app.post("/api/posts/:id(\\d+)/comments", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { usuarioId, texto, parentId, imagem } = req.body || {};
    if (!usuarioId || (!texto?.trim() && !imagem)) {
      return res.status(400).json({ message: "usuarioId e texto ou imagem são obrigatórios." });
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
    res.status(201).json(await getPostFull(postRow));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao comentar." });
  }
});

app.delete("/api/comments/:id(\\d+)", async (req, res) => {
  try {
    const comentario = await queryOne("SELECT post_id FROM comentarios WHERE id = ?", [req.params.id]);
    if (!comentario) return res.status(404).json({ message: "Comentário não encontrado." });

    await query("DELETE FROM comentarios WHERE id = ?", [req.params.id]);

    const postRow = await queryOne(`${POST_SELECT} WHERE p.id = ?`, [comentario.post_id]);
    res.json(await getPostFull(postRow));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao excluir comentário." });
  }
});

app.post("/api/comments/:id(\\d+)/like", async (req, res) => {
  try {
    const comentarioId = Number(req.params.id);
    const usuarioId = Number(req.body?.usuarioId);
    if (!usuarioId) return res.status(400).json({ message: "usuarioId é obrigatório." });

    const comentario = await queryOne("SELECT post_id FROM comentarios WHERE id = ?", [comentarioId]);
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
    }

    const postRow = await queryOne(`${POST_SELECT} WHERE p.id = ?`, [comentario.post_id]);
    res.json(await getPostFull(postRow));
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

app.get("/api/conversas", async (req, res) => {
  try {
    const usuarioId = Number(req.query.usuarioId);
    if (!usuarioId) return res.status(400).json({ message: "usuarioId é obrigatório." });

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

app.post("/api/conversas", async (req, res) => {
  try {
    const usuarioId = Number(req.body?.usuarioId);
    const outroUsuarioId = Number(req.body?.outroUsuarioId);
    if (!usuarioId || !outroUsuarioId || usuarioId === outroUsuarioId) {
      return res.status(400).json({ message: "usuarioId e outroUsuarioId (diferentes) são obrigatórios." });
    }

    const conversaId = await criarOuBuscarConversa(usuarioId, outroUsuarioId);
    res.status(201).json(await mapConversa(conversaId));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar/criar conversa." });
  }
});

app.post("/api/conversas/:id(\\d+)/mensagens", async (req, res) => {
  try {
    const conversaId = Number(req.params.id);
    const { usuarioId, texto, imagem } = req.body || {};
    if (!usuarioId || (!texto?.trim() && !imagem)) {
      return res.status(400).json({ message: "usuarioId e texto ou imagem são obrigatórios." });
    }

    const participante = await queryOne(
      "SELECT id FROM conversa_participantes WHERE conversa_id = ? AND usuario_id = ?",
      [conversaId, usuarioId]
    );
    if (!participante) return res.status(403).json({ message: "Usuário não participa dessa conversa." });

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

    res.status(201).json(await mapConversa(conversaId));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao enviar mensagem." });
  }
});

app.get("/api/conversas/unread", async (req, res) => {
  try {
    const usuarioId = Number(req.query.usuarioId);
    if (!usuarioId) return res.status(400).json({ message: "usuarioId é obrigatório." });

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

app.post("/api/conversas/:id(\\d+)/marcar-lida", async (req, res) => {
  try {
    const conversaId = Number(req.params.id);
    const usuarioId = Number(req.body?.usuarioId);
    if (!usuarioId) return res.status(400).json({ message: "usuarioId é obrigatório." });

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

app.use((req, res) => {
  res.status(404).json({ message: "Rota não encontrada." });
});

app.listen(PORT, () => {
  console.log(`Backend DevSpace (MySQL) rodando em http://localhost:${PORT}/api`);
});

/**
 * Auditoria funcional E2E: API + MySQL.
 * Usa contas de TESTE. Não imprime hashes, tokens nem senhas.
 */
import mysql from "mysql2/promise";
import { dbConfig } from "./loadEnv.js";

const API = process.env.AUDIT_API || "http://127.0.0.1:4000";
const PASS_A = "senha123";
const PASS_B = "senha123";
const HANDLE_A = "qauiloop";
const EMAIL_A = "qa.ui.loop@devspace.local";
const HANDLE_B = "qaauditb";
const EMAIL_B = "qa.audit.b@devspace.local";
const STAMP = Date.now();

const results = [];
function record(name, status, detail = "") {
  results.push({ name, status, detail });
  const icon = status === "ok" ? "OK" : status === "fail" ? "FAIL" : "WARN";
  console.log(`[${icon}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function api(method, path, { token, body, expectStatus } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  if (expectStatus && res.status !== expectStatus) {
    throw new Error(`${method} ${path} → ${res.status} (esperado ${expectStatus}): ${data?.message || text.slice(0, 120)}`);
  }
  return { status: res.status, data };
}

async function ensureUser(handle, email, senha) {
  const login = await api("POST", "/api/auth/login", {
    body: { emailOrHandle: handle, senha },
  });
  if (login.status === 200 && login.data?.token) {
    return { token: login.data.token, user: login.data.user, created: false };
  }

  const codeRes = await api("POST", "/api/auth/send-code", { body: { email } });
  if (codeRes.status !== 200 || !codeRes.data?.codigo) {
    throw new Error(`Não gerou código para ${handle}: ${codeRes.status} ${codeRes.data?.message || ""}`);
  }
  const reg = await api("POST", "/api/auth/register", {
    body: {
      username: `QA ${handle}`,
      handle,
      email,
      senha,
      bio: "Conta de auditoria funcional.",
      codigo: codeRes.data.codigo,
    },
  });
  if (reg.status !== 201 && reg.status !== 200) {
    throw new Error(`Cadastro ${handle} falhou: ${reg.status} ${reg.data?.message || ""}`);
  }
  return { token: reg.data.token, user: reg.data.user, created: true };
}

async function main() {
  console.log(`API ${API}`);
  const conn = await mysql.createConnection(dbConfig());

  try {
    const [[info]] = await conn.query("SELECT DATABASE() AS db, NOW() AS now");
    const [tables] = await conn.query("SHOW TABLES");
    record("conexao-mysql", "ok", `${info.db} · ${tables.length} tabelas`);

    const expected = [
      "usuarios",
      "posts",
      "comentarios",
      "post_interacoes",
      "post_bookmarks",
      "post_shares",
      "seguidores",
      "conversas",
      "conversa_participantes",
      "mensagens",
      "sessoes",
    ];
    const tableNames = tables.map((row) => Object.values(row)[0]);
    const missing = expected.filter((t) => !tableNames.includes(t));
    record("schema-tabelas", missing.length ? "fail" : "ok", missing.length ? `faltando: ${missing.join(", ")}` : expected.join(", "));

    const [uniques] = await conn.query(
      `SELECT INDEX_NAME, COLUMN_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND NON_UNIQUE = 0
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
    );
    const uniqueCols = uniques.map((r) => r.COLUMN_NAME);
    record(
      "uniques-usuario",
      uniqueCols.includes("email") && uniqueCols.includes("username") ? "ok" : "fail",
      uniqueCols.join(", "),
    );

    const [hashRows] = await conn.query(
      `SELECT COUNT(*) AS total,
              SUM(senha_hash IS NULL OR senha_hash = '') AS vazias,
              SUM(senha_hash LIKE '$2a$%' OR senha_hash LIKE '$2b$%' OR senha_hash LIKE '$2y$%') AS bcrypt
       FROM usuarios WHERE ativo = 1`,
    );
    const h = hashRows[0];
    record(
      "senhas-hash",
      Number(h.vazias) === 0 && Number(h.bcrypt) === Number(h.total) ? "ok" : "warn",
      `${h.bcrypt}/${h.total} bcrypt · ${h.vazias} vazias`,
    );

    const [plain] = await conn.query(
      `SELECT COUNT(*) AS c FROM usuarios
       WHERE senha_hash IS NOT NULL AND senha_hash <> ''
         AND senha_hash NOT LIKE '$2%' AND CHAR_LENGTH(senha_hash) < 60`,
    );
    record("senha-texto-puro", Number(plain[0].c) === 0 ? "ok" : "fail", Number(plain[0].c) ? `${plain[0].c} suspeitas` : "nenhuma");

    const health = await api("GET", "/api/users");
    record("api-users", health.status === 200 ? "ok" : "fail", `HTTP ${health.status} · ${Array.isArray(health.data) ? health.data.length : 0} usuários`);

    const guestPost = await api("POST", "/api/posts", { body: { texto: "não deveria" } });
    record("rota-protegida-post", guestPost.status === 401 ? "ok" : "fail", `HTTP ${guestPost.status}`);

    const guestChat = await api("GET", "/api/conversas");
    record("rota-protegida-chat", guestChat.status === 401 ? "ok" : "fail", `HTTP ${guestChat.status}`);

    const userA = await ensureUser(HANDLE_A, EMAIL_A, PASS_A);
    record("login-A", userA.token && userA.user?.id ? "ok" : "fail", `@${userA.user?.handle || HANDLE_A} id=${userA.user?.id}`);

    const userB = await ensureUser(HANDLE_B, EMAIL_B, PASS_B);
    record("cadastro-ou-login-B", userB.token && userB.user?.id ? "ok" : "fail", `@${userB.user?.handle || HANDLE_B} id=${userB.user?.id}${userB.created ? " (criado)" : " (já existia)"}`);

    const dupCode = await api("POST", "/api/auth/send-code", { body: { email: EMAIL_A } });
    const dupReg = await api("POST", "/api/auth/register", {
      body: {
        username: "Dup A",
        handle: HANDLE_A,
        email: EMAIL_A,
        senha: PASS_A,
        codigo: dupCode.data?.codigo || "000000",
      },
    });
    record("duplicata-email-username", dupReg.status === 409 ? "ok" : "fail", `HTTP ${dupReg.status} ${dupReg.data?.message || ""}`);

    const emptyPost = await api("POST", "/api/posts", { token: userA.token, body: { texto: "   " } });
    record("post-vazio-backend", emptyPost.status === 400 ? "ok" : "fail", `HTTP ${emptyPost.status}`);

    const postTexto = await api("POST", "/api/posts", {
      token: userA.token,
      body: { texto: `Auditoria ${STAMP} — olá DevSpace` },
      expectStatus: 201,
    });
    const postId = postTexto.data?.id;
    record("criar-post-texto", postId ? "ok" : "fail", `id=${postId}`);

    const postLongo = await api("POST", "/api/posts", {
      token: userA.token,
      body: { texto: `Texto longo ${STAMP} ${"lorem ".repeat(80).trim()}` },
      expectStatus: 201,
    });
    record("criar-post-longo", postLongo.data?.id ? "ok" : "fail", `id=${postLongo.data?.id}`);

    const postEspecial = await api("POST", "/api/posts", {
      token: userA.token,
      body: { texto: `Acentos: ção, ã, é, ü.\nQuebra de linha.\n<script>alert('xss-post')</script> & caracteres <>& "${STAMP}"` },
      expectStatus: 201,
    });
    record("criar-post-especial", postEspecial.data?.id ? "ok" : "fail", `id=${postEspecial.data?.id}`);

    const [[dbPost]] = await conn.query("SELECT id, conteudo, usuario_id FROM posts WHERE id = ?", [postId]);
    record("post-no-banco", dbPost?.id === postId && String(dbPost.conteudo).includes(String(STAMP)) ? "ok" : "fail");

    const edit = await api("PUT", `/api/posts/${postId}`, {
      token: userA.token,
      body: { texto: `Auditoria ${STAMP} — editado` },
      expectStatus: 200,
    });
    const [[dbEdit]] = await conn.query("SELECT conteudo FROM posts WHERE id = ?", [postId]);
    record("editar-post", String(dbEdit?.conteudo).includes("editado") ? "ok" : "fail", edit.data?.id ? `id=${edit.data.id}` : "");

    const like1 = await api("POST", `/api/posts/${postId}/like`, { token: userB.token, expectStatus: 200 });
    const like2 = await api("POST", `/api/posts/${postId}/like`, { token: userB.token, expectStatus: 200 });
    const [[likeCount]] = await conn.query(
      "SELECT COUNT(*) AS c FROM post_interacoes WHERE post_id = ? AND usuario_id = ? AND tipo = 'like'",
      [postId, userB.user.id],
    );
    record(
      "curtir-toggle",
      like1.data?.liked === true && like2.data?.liked === false && Number(likeCount.c) === 0 ? "ok" : "fail",
      `1=${like1.data?.liked} 2=${like2.data?.liked} banco=${likeCount.c}`,
    );

    await api("POST", `/api/posts/${postId}/like`, { token: userB.token, expectStatus: 200 });
    const [[likeAfter]] = await conn.query(
      "SELECT COUNT(*) AS c FROM post_interacoes WHERE post_id = ? AND usuario_id = ? AND tipo = 'like'",
      [postId, userB.user.id],
    );
    record("curtir-persistido", Number(likeAfter.c) === 1 ? "ok" : "fail", `banco=${likeAfter.c}`);

    const bm1 = await api("POST", `/api/posts/${postId}/bookmark`, { token: userB.token, expectStatus: 200 });
    const [[bmCount]] = await conn.query(
      "SELECT COUNT(*) AS c FROM post_bookmarks WHERE post_id = ? AND usuario_id = ?",
      [postId, userB.user.id],
    );
    record("salvar-post", bm1.data?.bookmarked === true && Number(bmCount.c) === 1 ? "ok" : "fail", `banco=${bmCount.c}`);
    await api("POST", `/api/posts/${postId}/bookmark`, { token: userB.token, expectStatus: 200 });

    const share1 = await api("POST", `/api/posts/${postId}/share`, { token: userB.token, expectStatus: 200 });
    const [[shareCount]] = await conn.query(
      "SELECT COUNT(*) AS c FROM post_shares WHERE post_id = ? AND usuario_id = ?",
      [postId, userB.user.id],
    );
    record("repost", share1.data?.shared === true && Number(shareCount.c) === 1 ? "ok" : "fail", `banco=${shareCount.c}`);

    const emptyComment = await api("POST", `/api/posts/${postId}/comments`, {
      token: userB.token,
      body: { texto: "   " },
    });
    record("comentario-vazio", emptyComment.status === 400 ? "ok" : "fail", `HTTP ${emptyComment.status}`);

    const comment = await api("POST", `/api/posts/${postId}/comments`, {
      token: userB.token,
      body: { texto: `Comentário B ${STAMP} <script>alert('xss-comment')</script>` },
      expectStatus: 201,
    });
    const [[cmt]] = await conn.query(
      "SELECT id, conteudo FROM comentarios WHERE post_id = ? AND usuario_id = ? ORDER BY id DESC LIMIT 1",
      [postId, userB.user.id],
    );
    record(
      "comentar",
      cmt && String(cmt.conteudo).includes(String(STAMP)) ? "ok" : "fail",
      cmt ? `id=${cmt.id}` : comment.data?.message || "",
    );

    const selfFollow = await api("POST", `/api/users/${userA.user.id}/follow`, { token: userA.token });
    record("seguir-a-si", selfFollow.status === 400 ? "ok" : "fail", `HTTP ${selfFollow.status}`);

    await conn.query("DELETE FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?", [userA.user.id, userB.user.id]);

    const follow = await api("POST", `/api/users/${userB.user.id}/follow`, { token: userA.token, expectStatus: 200 });
    const [[fol]] = await conn.query(
      "SELECT COUNT(*) AS c FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?",
      [userA.user.id, userB.user.id],
    );
    record("seguir", follow.data?.seguindo === true && Number(fol.c) === 1 ? "ok" : "fail", `banco=${fol.c}`);

    const unfollow = await api("POST", `/api/users/${userB.user.id}/follow`, { token: userA.token, expectStatus: 200 });
    const [[fol2]] = await conn.query(
      "SELECT COUNT(*) AS c FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?",
      [userA.user.id, userB.user.id],
    );
    record("deixar-de-seguir", unfollow.data?.seguindo === false && Number(fol2.c) === 0 ? "ok" : "fail", `banco=${fol2.c}`);
    await api("POST", `/api/users/${userB.user.id}/follow`, { token: userA.token, expectStatus: 200 });

    const profile = await api("GET", `/api/users/${userB.user.handle}`);
    record(
      "perfil-leitura",
      profile.status === 200 && profile.data?.handle === HANDLE_B ? "ok" : "fail",
      `HTTP ${profile.status} @${profile.data?.handle || "?"}`,
    );

    const editProfile = await api("PUT", `/api/users/${userB.user.id}`, {
      token: userB.token,
      body: { bio: `Bio auditoria ${STAMP}` },
    });
    const [[dbBio]] = await conn.query("SELECT bio FROM usuarios WHERE id = ?", [userB.user.id]);
    record(
      "editar-perfil",
      editProfile.status === 200 && String(dbBio?.bio).includes(String(STAMP)) ? "ok" : "fail",
      `HTTP ${editProfile.status}`,
    );

    const users = await api("GET", "/api/users");
    const maya = Array.isArray(users.data)
      ? users.data.find((u) => String(u.handle || "").toLowerCase().includes("maya") || String(u.username || "").toLowerCase().includes("maya"))
      : null;
    record("pesquisa-maya", maya ? "ok" : "warn", maya ? `@${maya.handle}` : "nenhum usuário Maya no backend (Explorar ainda mistura grupos seed)");

    const selfChat = await api("POST", "/api/conversas", {
      token: userA.token,
      body: { outroUsuarioId: userA.user.id },
    });
    record("auto-mensagem", selfChat.status === 400 ? "ok" : "fail", `HTTP ${selfChat.status}`);

    const conv1 = await api("POST", "/api/conversas", {
      token: userA.token,
      body: { outroUsuarioId: userB.user.id },
      expectStatus: 201,
    });
    const conv2 = await api("POST", "/api/conversas", {
      token: userA.token,
      body: { outroUsuarioId: userB.user.id },
      expectStatus: 201,
    });
    record(
      "conversa-unica",
      conv1.data?.id && conv1.data.id === conv2.data?.id ? "ok" : "fail",
      `ids ${conv1.data?.id} / ${conv2.data?.id}`,
    );

    const conversaId = conv1.data?.id;
    const msgA = await api("POST", `/api/conversas/${conversaId}/mensagens`, {
      token: userA.token,
      body: { texto: `Olá de A ${STAMP}` },
      expectStatus: 201,
    });
    await new Promise((r) => setTimeout(r, 50));
    const msgB = await api("POST", `/api/conversas/${conversaId}/mensagens`, {
      token: userB.token,
      body: { texto: `Oi A, aqui é B ${STAMP} <script>alert('xss-msg')</script>` },
      expectStatus: 201,
    });
    record("enviar-mensagem-A", msgA.status === 201 ? "ok" : "fail");
    record("enviar-mensagem-B", msgB.status === 201 ? "ok" : "fail");

    const [dbMsgs] = await conn.query(
      "SELECT id, remetente_id, conteudo, criado_em FROM mensagens WHERE conversa_id = ? ORDER BY criado_em ASC, id ASC",
      [conversaId],
    );
    const texts = dbMsgs.map((m) => m.conteudo);
    const orderOk =
      texts.some((t) => t.includes(`Olá de A ${STAMP}`)) &&
      texts.some((t) => t.includes(`Oi A, aqui é B ${STAMP}`)) &&
      texts.findIndex((t) => t.includes("Olá de A")) < texts.findIndex((t) => t.includes("Oi A, aqui é B"));
    record("mensagens-banco-ordem", orderOk ? "ok" : "fail", `${dbMsgs.length} msgs`);

    const xssStored = texts.some((t) => t.includes("<script>alert('xss-msg')</script>"));
    record("xss-armazenado-como-texto", xssStored ? "ok" : "warn", "conteúdo literal no banco; React não usa innerHTML");

    const listA = await api("GET", "/api/conversas", { token: userA.token, expectStatus: 200 });
    const listB = await api("GET", "/api/conversas", { token: userB.token, expectStatus: 200 });
    const seenByB = Array.isArray(listB.data) && listB.data.some((c) => Number(c.id) === Number(conversaId));
    record("B-ve-conversa", seenByB ? "ok" : "fail", `A=${Array.isArray(listA.data) ? listA.data.length : 0} B=${Array.isArray(listB.data) ? listB.data.length : 0}`);

    const [[ratingTable]] = await conn.query("SHOW TABLES LIKE 'avaliacoes_perfil'");
    record("tabela-avaliacoes", ratingTable ? "ok" : "fail");

    const selfRate = await api("POST", `/api/users/${userA.user.id}/ratings`, {
      token: userA.token,
      body: { nota: 5 },
    });
    record("avaliar-si-mesmo", selfRate.status === 400 ? "ok" : "fail", `HTTP ${selfRate.status}`);

    const rateB = await api("POST", `/api/users/${userB.user.id}/ratings`, {
      token: userA.token,
      body: { nota: 5 },
      expectStatus: 200,
    });
    record("avaliar-B", Number(rateB.data?.minhaNota) === 5 ? "ok" : "fail", `nota ${rateB.data?.minhaNota}`);

    const rateB2 = await api("POST", `/api/users/${userB.user.id}/ratings`, {
      token: userA.token,
      body: { nota: 4 },
      expectStatus: 200,
    });
    const [[ratingRows]] = await conn.query(
      "SELECT COUNT(*) AS c, MAX(nota) AS nota FROM avaliacoes_perfil WHERE avaliador_id = ? AND avaliado_id = ?",
      [userA.user.id, userB.user.id],
    );
    record(
      "avaliacao-upsert",
      Number(ratingRows.c) === 1 && Number(rateB2.data?.minhaNota) === 4 ? "ok" : "fail",
      `rows ${ratingRows.c} nota ${rateB2.data?.minhaNota}`,
    );

    const profileB = await api("GET", `/api/users/${userB.user.id}`, { token: userA.token, expectStatus: 200 });
    record(
      "media-avaliacao",
      Number(profileB.data?.ratingCount) >= 1 ? "ok" : "fail",
      `media ${profileB.data?.ratingMedia} count ${profileB.data?.ratingCount}`,
    );

    const reloginA = await api("POST", "/api/auth/login", {
      body: { emailOrHandle: HANDLE_A, senha: PASS_A },
      expectStatus: 200,
    });
    const relist = await api("GET", "/api/conversas", { token: reloginA.data.token, expectStatus: 200 });
    const stillThere = Array.isArray(relist.data) && relist.data.some((c) => Number(c.id) === Number(conversaId));
    record("persistencia-apos-relogin", stillThere ? "ok" : "fail");

    const logout = await api("POST", "/api/auth/logout", { token: reloginA.data.token });
    record("logout", logout.status === 200 ? "ok" : "fail", `HTTP ${logout.status}`);
    const afterLogout = await api("GET", "/api/conversas", { token: reloginA.data.token });
    record("sessao-invalidada", afterLogout.status === 401 ? "ok" : "fail", `HTTP ${afterLogout.status}`);

    const idorEdit = await api("PUT", `/api/posts/${postId}`, {
      token: userB.token,
      body: { texto: "tentativa IDOR" },
    });
    record("idor-editar-post", idorEdit.status === 403 ? "ok" : "fail", `HTTP ${idorEdit.status}`);

    const delPost = await api("DELETE", `/api/posts/${postLongo.data.id}`, { token: userA.token });
    const [[gone]] = await conn.query("SELECT id FROM posts WHERE id = ?", [postLongo.data.id]);
    record("excluir-post", (delPost.status === 200 || delPost.status === 204) && !gone ? "ok" : "fail", `HTTP ${delPost.status}`);

    const [[orphanComments]] = await conn.query(
      `SELECT COUNT(*) AS c FROM comentarios c LEFT JOIN posts p ON p.id = c.post_id WHERE p.id IS NULL`,
    );
    const [[orphanLikes]] = await conn.query(
      `SELECT COUNT(*) AS c FROM post_interacoes i LEFT JOIN usuarios u ON u.id = i.usuario_id WHERE u.id IS NULL`,
    );
    record("orfaos-comentarios", Number(orphanComments.c) === 0 ? "ok" : "fail", `${orphanComments.c}`);
    record("orfaos-likes", Number(orphanLikes.c) === 0 ? "ok" : "fail", `${orphanLikes.c}`);

    const [indexes] = await conn.query(
      `SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND (
           (TABLE_NAME = 'usuarios' AND COLUMN_NAME IN ('email','username'))
           OR (TABLE_NAME = 'posts' AND COLUMN_NAME IN ('usuario_id','criado_em'))
           OR (TABLE_NAME = 'comentarios' AND COLUMN_NAME IN ('post_id','usuario_id'))
           OR (TABLE_NAME = 'mensagens' AND COLUMN_NAME IN ('conversa_id','criado_em'))
         )
       ORDER BY TABLE_NAME, INDEX_NAME`,
    );
    record("indices-consulta", indexes.length >= 6 ? "ok" : "warn", `${indexes.length} índices relevantes`);

    const googleEnv = Boolean(process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID);
    record("google-env-backend", googleEnv ? "ok" : "warn", googleEnv ? "client id presente" : "sem GOOGLE_CLIENT_ID no backend");
  } finally {
    await conn.end();
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const fail = results.filter((r) => r.status === "fail").length;
  const warn = results.filter((r) => r.status === "warn").length;
  console.log(`\nRESUMO ${ok} ok · ${warn} warn · ${fail} fail · total ${results.length}`);
  if (fail) process.exit(1);
}

main().catch((error) => {
  console.error("Auditoria abortada:", error.message);
  process.exit(1);
});

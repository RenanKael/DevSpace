import crypto from "crypto";
import bcrypt from "bcryptjs";
import { query, queryOne } from "./db.js";

const SESSION_DAYS = 7;

export async function ensureAuthTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS sessoes (
      token CHAR(64) NOT NULL,
      usuario_id BIGINT NOT NULL,
      expira_em DATETIME NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (token),
      KEY idx_sessoes_usuario (usuario_id),
      KEY idx_sessoes_expira (expira_em)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id BIGINT NOT NULL AUTO_INCREMENT,
      usuario_id BIGINT NOT NULL,
      codigo_hash VARCHAR(255) NOT NULL,
      expira_em DATETIME NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_password_resets_usuario (usuario_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id BIGINT NOT NULL AUTO_INCREMENT,
      destino VARCHAR(255) NOT NULL,
      codigo_hash VARCHAR(255) NOT NULL,
      expira_em DATETIME NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_verification_destino (destino)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

export async function createSession(usuarioId) {
  const token = crypto.randomBytes(32).toString("hex");
  await query(
    "INSERT INTO sessoes (token, usuario_id, expira_em) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))",
    [token, usuarioId, SESSION_DAYS]
  );
  return token;
}

export async function destroySession(token) {
  if (!token) return;
  await query("DELETE FROM sessoes WHERE token = ?", [token]);
}

export async function getSessionUser(req) {
  const raw = String(req.headers.authorization || "");
  const token = raw.startsWith("Bearer ") ? raw.slice(7).trim() : "";
  if (!token) return null;

  const row = await queryOne(
    `SELECT u.* FROM sessoes s
     JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token = ? AND s.expira_em > NOW() AND u.ativo = 1
     LIMIT 1`,
    [token]
  );
  return row ? { usuario: row, token } : null;
}

export async function requireAuth(req, res, next) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      const hasToken = String(req.headers.authorization || "").startsWith("Bearer ");
      return res.status(401).json({
        message: hasToken ? "Sessão expirada. Entre novamente." : "Entre na sua conta para continuar.",
      });
    }

    req.usuario = session.usuario;
    req.sessionToken = session.token;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao validar a sessão." });
  }
}

const rateHits = new Map();

export function rateLimit({ windowMs = 15 * 60 * 1000, max = 20 } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const entry = rateHits.get(key) || { count: 0, start: now };
    if (now - entry.start > windowMs) {
      entry.count = 0;
      entry.start = now;
    }
    entry.count += 1;
    rateHits.set(key, entry);
    if (entry.count > max) {
      return res.status(429).json({ message: "Muitas tentativas. Espere um pouco e tente de novo." });
    }
    next();
  };
}

export function generateNumericCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function hashSecret(value) {
  return bcrypt.hash(String(value), 8);
}

export async function compareSecret(value, hash) {
  if (!value || !hash) return false;
  try {
    return await bcrypt.compare(String(value), hash);
  } catch {
    return false;
  }
}

export async function storeVerificationCode(destino) {
  const codigo = generateNumericCode();
  const codigoHash = await hashSecret(codigo);
  await query("DELETE FROM verification_codes WHERE destino = ? OR expira_em < NOW()", [destino]);
  await query(
    "INSERT INTO verification_codes (destino, codigo_hash, expira_em) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))",
    [destino, codigoHash]
  );
  return codigo;
}

export async function consumeVerificationCode(destino, codigo) {
  const row = await queryOne(
    "SELECT * FROM verification_codes WHERE destino = ? AND expira_em > NOW() ORDER BY id DESC LIMIT 1",
    [destino]
  );
  if (!row || !(await compareSecret(codigo, row.codigo_hash))) return false;
  await query("DELETE FROM verification_codes WHERE destino = ?", [destino]);
  return true;
}

export async function storePasswordReset(usuarioId) {
  const codigo = generateNumericCode();
  const codigoHash = await hashSecret(codigo);
  await query("DELETE FROM password_resets WHERE usuario_id = ? OR expira_em < NOW()", [usuarioId]);
  await query(
    "INSERT INTO password_resets (usuario_id, codigo_hash, expira_em) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))",
    [usuarioId, codigoHash]
  );
  return codigo;
}

export async function consumePasswordReset(usuarioId, codigo) {
  const row = await queryOne(
    "SELECT * FROM password_resets WHERE usuario_id = ? AND expira_em > NOW() ORDER BY id DESC LIMIT 1",
    [usuarioId]
  );
  if (!row || !(await compareSecret(codigo, row.codigo_hash))) return false;
  await query("DELETE FROM password_resets WHERE usuario_id = ?", [usuarioId]);
  return true;
}

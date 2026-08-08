import "dotenv/config";
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: false,
  // O banco fica atras de uma VPN; sem keep-alive, uma conexao ociosa por
  // muito tempo (ex: durante a madrugada) pode ser derrubada em silencio no
  // meio do caminho, e a proxima query nela falha com erro generico.
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  // O keep-alive TCP sozinho nao evita a VPN/MySQL derrubando uma conexao
  // ociosa: idleTimeout recicla conexoes paradas ha mais de 1 min antes que
  // fiquem mortas no pool esperando a proxima query falhar.
  idleTimeout: 60000,
  maxIdle: 10,
});

const TRANSIENT_CONNECTION_ERRORS = new Set([
  "PROTOCOL_CONNECTION_LOST",
  "ECONNRESET",
  "ER_SERVER_GONE_ERROR",
  "ETIMEDOUT",
]);

export async function query(sql, params = []) {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    // Conexao do pool morreu ociosa (ex: idle-drop da VPN) entre uma query e
    // outra; o mysql2 ja descarta essa conexao sozinho, entao uma unica
    // tentativa nova com outra conexao do pool costuma resolver.
    if (!TRANSIENT_CONNECTION_ERRORS.has(error.code)) throw error;
    const [rows] = await pool.query(sql, params);
    return rows;
  }
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work({
      query: async (sql, params = []) => {
        const [rows] = await conn.query(sql, params);
        return rows;
      },
      queryOne: async (sql, params = []) => {
        const [rows] = await conn.query(sql, params);
        return rows[0] || null;
      },
    });
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export default pool;

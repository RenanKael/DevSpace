import mysql from "mysql2/promise";
import { dbConfig } from "./loadEnv.js";

const cfg = dbConfig();

console.log(
  `Testando MySQL ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}`,
);

try {
  const conn = await mysql.createConnection(cfg);
  const [info] = await conn.query(
    "SELECT DATABASE() AS db, USER() AS user, NOW() AS now",
  );
  const [tables] = await conn.query("SHOW TABLES");
  await conn.end();

  console.log("Conexão OK");
  console.log(info[0]);
  console.log(`Tabelas: ${tables.length}`);
  process.exit(0);
} catch (error) {
  console.error("Falha na conexão:", error.code || error.message);
  console.error(
    "Confira se a VPN (vpn.buchholz.net.br) está ligada neste PC. Ping no host funciona, mas a porta 65190 só abre pela VPN.",
  );
  process.exit(1);
}

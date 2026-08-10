import dns from "node:dns";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dns.setDefaultResultOrder("ipv4first");

const dir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(dir, "..", ".env") });

export function dbConfig() {
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 20000,
  };
}

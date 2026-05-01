import mysql from "mysql2/promise";
import { env } from "../config/env.js";

export function createMysqlPool() {
  if (!env.DB_HOST || !env.DB_NAME || !env.DB_USER) {
    return null;
  }

  return mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: env.DB_SSL ? { rejectUnauthorized: true } : undefined,
    decimalNumbers: true,
    timezone: "Z"
  });
}

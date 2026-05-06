import mysql from "mysql2/promise";
import "dotenv/config";

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "69.6.213.99",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "flavi071_user",
  password: process.env.DB_PASSWORD || "GhiOb[;6{VIH",
  database: process.env.DB_NAME || "flavi071_tavon",
  waitForConnections: true,
  connectionLimit: 10,
  timezone: "-03:00"
});

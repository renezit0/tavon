import { pool } from "./db.js";
import bcrypt from "bcryptjs";
import "dotenv/config";

async function migrate() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(180) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(180) NOT NULL,
        email VARCHAR(180) NOT NULL UNIQUE,
        phone VARCHAR(30),
        company VARCHAR(180),
        notes TEXT,
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS licenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        license_key VARCHAR(64) NOT NULL UNIQUE,
        module ENUM('admin','cardapio','garcom','cozinha','caixa','totem','all') NOT NULL DEFAULT 'all',
        status ENUM('active','inactive','expired','suspended') NOT NULL DEFAULT 'active',
        started_at DATETIME NOT NULL,
        expires_at DATETIME,
        max_devices INT NOT NULL DEFAULT 1,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS license_validations (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        license_key VARCHAR(64) NOT NULL,
        module VARCHAR(30),
        ip VARCHAR(64),
        user_agent VARCHAR(255),
        result ENUM('valid','invalid','expired','suspended') NOT NULL,
        validated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS device_activations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        license_id INT NOT NULL,
        machine_id VARCHAR(64) NOT NULL,
        hostname VARCHAR(180),
        platform VARCHAR(30),
        first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_license_machine (license_id, machine_id),
        FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // seed initial admin if not exists
    const adminEmail = process.env.ADMIN_EMAIL || "admin@tavon.com.br";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@2025!";
    const [rows] = await conn.query("SELECT id FROM admins WHERE email = ?", [adminEmail]);
    if ((rows as unknown[]).length === 0) {
      const hash = await bcrypt.hash(adminPassword, 12);
      await conn.query("INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)", [
        "Admin Tavon", adminEmail, hash
      ]);
      console.log(`Admin criado: ${adminEmail}`);
    }

    console.log("Migracao concluida com sucesso.");
  } finally {
    conn.release();
    await pool.end();
  }
}

migrate().catch((err) => { console.error(err); process.exit(1); });

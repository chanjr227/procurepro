require("dotenv").config();

const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const { PrismaClient } = require("@prisma/client");

// Membaca konfigurasi koneksi database dari environment.
const databaseUrl = new URL(process.env.DATABASE_URL);

// Menyiapkan adapter MariaDB untuk Prisma Client.
const adapter = new PrismaMariaDb({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || 3306),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: databaseUrl.pathname.slice(1),
  connectionLimit: 5,
});

// Membuat client Prisma yang digunakan oleh controller backend.
const prisma = new PrismaClient({ adapter });

module.exports = prisma;

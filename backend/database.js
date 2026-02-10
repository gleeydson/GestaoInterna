const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Usa variável de ambiente ou fallback para desenvolvimento
const DB_PATH = path.join(
  __dirname,
  process.env.DB_PATH || "epi_control_dev.db",
);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados:", err.message);
    return;
  }

  console.log("Conectado ao banco de dados SQLite");
  initDatabase().catch((initErr) => {
    console.error("Erro ao inicializar banco:", initErr.message);
  });
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function hasColumn(table, column) {
  const columns = await all(`PRAGMA table_info(${table})`);
  return columns.some((col) => col.name === column);
}

async function addColumnIfMissing(table, column, definition) {
  if (!(await hasColumn(table, column))) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function initDatabase() {
  await run(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            appliedAt TEXT NOT NULL
        )
    `);

  await run(`
        CREATE TABLE IF NOT EXISTS colaboradores (
            id TEXT PRIMARY KEY,
            nome TEXT NOT NULL,
            cpf TEXT UNIQUE,
            rg TEXT,
            dataNascimento TEXT,
            funcao TEXT NOT NULL,
            setor TEXT,
            cidade TEXT,
            telefone TEXT,
            email TEXT,
            dataUltimoTreinamento TEXT,
            proximoTreinamento TEXT,
            periodicidadeTreinamento INTEGER,
            dataUltimoExame TEXT,
            proximoExame TEXT,
            periodicidadeExame INTEGER,
            dataCadastro TEXT NOT NULL,
            dataAtualizacao TEXT,
            ativo INTEGER DEFAULT 1,
            createdBy TEXT,
            updatedBy TEXT
        )
    `);

  await run(`
        CREATE TABLE IF NOT EXISTS epis (
            id TEXT PRIMARY KEY,
            nome TEXT NOT NULL,
            ca TEXT NOT NULL,
            tipo TEXT NOT NULL,
            validadeCA TEXT NOT NULL,
            estoque INTEGER DEFAULT 0,
            estoqueMinimo INTEGER DEFAULT 0,
            descricao TEXT,
            dataCadastro TEXT NOT NULL,
            dataAtualizacao TEXT,
            ativo INTEGER DEFAULT 1,
            createdBy TEXT,
            updatedBy TEXT
        )
    `);

  await run(`
        CREATE TABLE IF NOT EXISTS entregas (
            id TEXT PRIMARY KEY,
            colaboradorId TEXT NOT NULL,
            colaboradorNome TEXT NOT NULL,
            epiId TEXT NOT NULL,
            epiNome TEXT NOT NULL,
            epiCA TEXT NOT NULL,
            dataEntrega TEXT NOT NULL,
            dataValidade TEXT NOT NULL,
            quantidade INTEGER NOT NULL,
            observacoes TEXT,
            assinaturaHash TEXT,
            assinaturaDevice TEXT,
            assinaturaIp TEXT,
            assinaturaTimestamp TEXT,
            dataCadastro TEXT NOT NULL,
            createdBy TEXT,
            FOREIGN KEY (colaboradorId) REFERENCES colaboradores (id),
            FOREIGN KEY (epiId) REFERENCES epis (id)
        )
    `);

  await run(`
        CREATE TABLE IF NOT EXISTS treinamentos (
            id TEXT PRIMARY KEY,
            colaboradorId TEXT NOT NULL,
            dataTreinamento TEXT NOT NULL,
            proximoTreinamento TEXT,
            tipo TEXT,
            observacoes TEXT,
            dataCadastro TEXT NOT NULL,
            createdBy TEXT,
            FOREIGN KEY (colaboradorId) REFERENCES colaboradores (id)
        )
    `);

  await run(`
        CREATE TABLE IF NOT EXISTS exames (
            id TEXT PRIMARY KEY,
            colaboradorId TEXT NOT NULL,
            dataExame TEXT NOT NULL,
            proximoExame TEXT,
            resultado TEXT,
            observacoes TEXT,
            dataCadastro TEXT NOT NULL,
            createdBy TEXT,
            FOREIGN KEY (colaboradorId) REFERENCES colaboradores (id)
        )
    `);

  await run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            passwordHash TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('admin', 'tecnico', 'leitura')),
            ativo INTEGER DEFAULT 1,
            dataCadastro TEXT NOT NULL
        )
    `);

  await run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity TEXT NOT NULL,
            entityId TEXT,
            action TEXT NOT NULL,
            actorId TEXT,
            actorRole TEXT,
            details TEXT,
            ip TEXT,
            createdAt TEXT NOT NULL
        )
    `);

  await addColumnIfMissing("colaboradores", "setor", "TEXT");
  await addColumnIfMissing("colaboradores", "cidade", "TEXT");
  await addColumnIfMissing("colaboradores", "createdBy", "TEXT");
  await addColumnIfMissing("colaboradores", "updatedBy", "TEXT");
  await addColumnIfMissing("epis", "createdBy", "TEXT");
  await addColumnIfMissing("epis", "updatedBy", "TEXT");
  await addColumnIfMissing("entregas", "assinaturaHash", "TEXT");
  await addColumnIfMissing("entregas", "assinaturaDevice", "TEXT");
  await addColumnIfMissing("entregas", "assinaturaIp", "TEXT");
  await addColumnIfMissing("entregas", "assinaturaTimestamp", "TEXT");
  await addColumnIfMissing("entregas", "createdBy", "TEXT");
  await addColumnIfMissing("treinamentos", "createdBy", "TEXT");
  await addColumnIfMissing("exames", "createdBy", "TEXT");

  const adminUser = await get(`SELECT id FROM users WHERE username = ?`, [
    "admin",
  ]);
  if (!adminUser) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await run(
      `INSERT INTO users (id, username, passwordHash, role, dataCadastro) VALUES (?, ?, ?, ?, ?)`,
      ["usr-admin", "admin", passwordHash, "admin", new Date().toISOString()],
    );
  }
}

db.runAsync = run;
db.getAsync = get;
db.allAsync = all;

db.execTransaction = async function (actions) {
  await run("BEGIN TRANSACTION");
  try {
    await actions();
    await run("COMMIT");
  } catch (error) {
    await run("ROLLBACK");
    throw error;
  }
};

db.logAudit = async function ({
  entity,
  entityId,
  action,
  actorId,
  actorRole,
  details,
  ip,
}) {
  await run(
    `INSERT INTO audit_logs (entity, entityId, action, actorId, actorRole, details, ip, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entity,
      entityId || null,
      action,
      actorId || null,
      actorRole || null,
      details ? JSON.stringify(details) : null,
      ip || null,
      new Date().toISOString(),
    ],
  );
};

module.exports = db;

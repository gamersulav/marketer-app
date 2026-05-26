import { createClient } from '@libsql/client';

let _db = null;

function makeDb(client) {
  return {
    async query(sql, args = []) {
      const r = await client.execute({ sql, args });
      return r.rows;
    },
    async queryOne(sql, args = []) {
      const r = await client.execute({ sql, args });
      return r.rows[0] || null;
    },
    async run(sql, args = []) {
      return client.execute({ sql, args });
    },
    async tx(fn) {
      const tx = await client.transaction('write');
      try {
        const wrap = {
          query: async (sql, args = []) => { const r = await tx.execute({ sql, args }); return r.rows; },
          queryOne: async (sql, args = []) => { const r = await tx.execute({ sql, args }); return r.rows[0] || null; },
          run: async (sql, args = []) => tx.execute({ sql, args }),
        };
        const result = await fn(wrap);
        await tx.commit();
        return result;
      } catch (e) {
        await tx.rollback();
        throw e;
      }
    },
  };
}

export async function getDb() {
  if (_db) return _db;
  const url = process.env.TURSO_URL;
  const authToken = process.env.TURSO_TOKEN;
  const client = url
    ? createClient({ url, authToken })
    : createClient({ url: 'file:local.db' });
  _db = makeDb(client);
  await initSchema(_db);
  return _db;
}

async function initSchema(db) {
  await db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner TEXT,
    phone TEXT,
    address TEXT,
    outstanding REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    unit TEXT DEFAULT 'pcs',
    default_price REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL REFERENCES shops(id),
    delivery_date TEXT DEFAULT (date('now')),
    total REAL DEFAULT 0,
    paid REAL DEFAULT 0,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS delivery_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    delivery_id INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    unit TEXT DEFAULT 'pcs',
    qty REAL NOT NULL,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL REFERENCES shops(id),
    delivery_id INTEGER REFERENCES deliveries(id),
    amount REAL NOT NULL,
    note TEXT,
    payment_date TEXT DEFAULT (date('now')),
    created_at TEXT DEFAULT (datetime('now'))
  )`);
}

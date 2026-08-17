// jangojs/core/orm/db.js
// A persistence layer with zero native code: every "table" is a plain JS
// array of row objects, held in memory and flushed to a single JSON file on
// every write. No SQL, no C bindings — just fs and JSON, so it runs
// anywhere Node runs with nothing to compile.
//
// Trade-offs worth knowing: the whole database loads into memory and the
// whole file rewrites on every write (fine for prototypes and small apps;
// not for anything approaching production scale or concurrent writers).

const fs = require('node:fs');

class Database {
  constructor(filePath) {
    this.filePath = filePath;
    this.tables = {};   // tableName -> array of row objects
    this.nextIds = {};  // tableName -> next auto-increment id
    this._load();
  }

  _load() {
    if (this.filePath === ':memory:') return;
    if (fs.existsSync(this.filePath)) {
      const raw = fs.readFileSync(this.filePath, 'utf-8').trim();
      const data = raw ? JSON.parse(raw) : {};
      this.tables = data.tables || {};
      this.nextIds = data.nextIds || {};
    }
  }

  _persist() {
    if (this.filePath === ':memory:') return;
    fs.writeFileSync(this.filePath, JSON.stringify({ tables: this.tables, nextIds: this.nextIds }, null, 2));
  }

  ensureTable(name) {
    if (!this.tables[name]) {
      this.tables[name] = [];
      this.nextIds[name] = 1;
      this._persist();
    }
  }

  all(table) {
    this.ensureTable(table);
    return this.tables[table];
  }

  insert(table, row) {
    this.ensureTable(table);
    const id = this.nextIds[table]++;
    const record = { ...row, id };
    this.tables[table].push(record);
    this._persist();
    return record;
  }

  update(table, id, patch) {
    this.ensureTable(table);
    const rows = this.tables[table];
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    rows[idx] = { ...rows[idx], ...patch, id };
    this._persist();
    return rows[idx];
  }

  /** Deletes every row matching predicate(row) === true. Returns the count removed. */
  deleteWhere(table, predicate) {
    this.ensureTable(table);
    const before = this.tables[table].length;
    this.tables[table] = this.tables[table].filter((row) => !predicate(row));
    this._persist();
    return before - this.tables[table].length;
  }
}

let instance = null;

function connect(filePath) {
  instance = new Database(filePath);
  return instance;
}

function getDb() {
  if (!instance) {
    throw new Error('Database not connected. Call connect(settings.DATABASE_PATH) first (createApp() does this for you).');
  }
  return instance;
}

module.exports = { connect, getDb, Database };

// jangojs/core/orm/migrations.js
// Deliberately simplified vs. real Django migrations: no migration files or
// history table — `migrate()` just makes sure every registered model has an
// empty table array to write into. Good enough for prototyping; write real
// migration files (or a diffing tool) before this framework sees data you
// care about losing.

const { getDb } = require('./db');

const registry = [];

function registerModel(ModelClass) {
  if (!registry.includes(ModelClass)) registry.push(ModelClass);
}

function migrate() {
  const db = getDb();
  const created = [];
  for (const ModelClass of registry) {
    const tableName = ModelClass.tableName || `${ModelClass.name.toLowerCase()}s`;
    db.ensureTable(tableName);
    created.push(ModelClass.name);
  }
  return created;
}

module.exports = { registerModel, migrate, registry };

// jangojs/core/orm/model.js
// A small Active-Record-ish ORM styled after Django's Model / QuerySet API,
// running entirely in JS over the flat-file store in db.js — no SQL:
//   Post.objects.filter({ published: true }).orderBy('-createdAt').all()
//   const post = new Post({ title: 'Hi' }); post.save();

const { getDb } = require('./db');
const { ForeignKey, IntegerField } = require('./fields');
const { registerModel } = require('./migrations');

function tableNameFor(ModelClass) {
  return ModelClass.tableName || `${ModelClass.name.toLowerCase()}s`;
}

function fieldsFor(ModelClass) {
  // Walk the class's declared `static fields = {...}` for Field instances.
  if (ModelClass.__fieldsCache) return ModelClass.__fieldsCache;
  const fields = { id: Object.assign(new IntegerField({ primaryKey: true }), { name: 'id' }) };
  const declared = ModelClass.fields || {};
  for (const [name, field] of Object.entries(declared)) {
    field.name = name;
    fields[name] = field;
  }
  ModelClass.__fieldsCache = fields;
  registerModel(ModelClass);
  return fields;
}

const OPS = {
  eq: (actual, target) => actual === target,
  ne: (actual, target) => actual !== target,
  gt: (actual, target) => actual > target,
  gte: (actual, target) => actual >= target,
  lt: (actual, target) => actual < target,
  lte: (actual, target) => actual <= target,
  contains: (actual, target) => typeof actual === 'string' && actual.includes(String(target)),
};

class QuerySet {
  constructor(ModelClass) {
    this.ModelClass = ModelClass;
    this._predicates = [];
    this._order = null;
    this._limit = null;
  }

  _clone() {
    const qs = new QuerySet(this.ModelClass);
    qs._predicates = [...this._predicates];
    qs._order = this._order;
    qs._limit = this._limit;
    return qs;
  }

  /** filter({ field: value, field__gt: value, field__contains: value }) */
  filter(criteria = {}) {
    const qs = this._clone();
    const fields = fieldsFor(this.ModelClass);
    for (const [key, rawValue] of Object.entries(criteria)) {
      const [rawField, op = 'eq'] = key.includes('__') ? key.split('__') : [key, 'eq'];
      const field = fields[rawField];
      const column = field instanceof ForeignKey ? field.columnName : rawField;
      const target = field ? field.toDb(rawValue) : rawValue;
      const compare = OPS[op] || OPS.eq;
      qs._predicates.push((row) => compare(row[column], target));
    }
    return qs;
  }

  /** orderBy('-createdAt') or orderBy('title') */
  orderBy(field) {
    const qs = this._clone();
    const desc = field.startsWith('-');
    qs._order = { column: desc ? field.slice(1) : field, desc };
    return qs;
  }

  limit(n) {
    const qs = this._clone();
    qs._limit = n;
    return qs;
  }

  _rows() {
    const db = getDb();
    const table = tableNameFor(this.ModelClass);
    let rows = db.all(table).filter((row) => this._predicates.every((p) => p(row)));
    if (this._order) {
      const { column, desc } = this._order;
      rows = [...rows].sort((a, b) => {
        if (a[column] < b[column]) return -1;
        if (a[column] > b[column]) return 1;
        return 0;
      });
      if (desc) rows.reverse();
    }
    if (this._limit != null) rows = rows.slice(0, this._limit);
    return rows;
  }

  all() {
    return this._rows().map((row) => this.ModelClass._fromRow(row));
  }

  first() {
    return this.limit(1).all()[0] || null;
  }

  /** Throws if zero or more than one match, like Django's .get() */
  get(criteria) {
    const results = (criteria ? this.filter(criteria) : this).all();
    if (results.length === 0) throw new Error(`${this.ModelClass.name} matching query does not exist.`);
    if (results.length > 1) throw new Error(`get() returned more than one ${this.ModelClass.name} — it returned ${results.length}!`);
    return results[0];
  }

  count() {
    return this._rows().length;
  }

  delete() {
    const db = getDb();
    const table = tableNameFor(this.ModelClass);
    const ids = new Set(this._rows().map((r) => r.id));
    return db.deleteWhere(table, (row) => ids.has(row.id));
  }

  [Symbol.iterator]() {
    return this.all()[Symbol.iterator]();
  }
}

class Model {
  constructor(data = {}) {
    const fields = fieldsFor(this.constructor);
    for (const name of Object.keys(fields)) {
      if (name === 'id') continue;
      this[name] = data[name];
    }
    if (data.id !== undefined) this.id = data.id;
  }

  static _fromRow(row) {
    const fields = fieldsFor(this);
    const instance = Object.create(this.prototype);
    for (const [name, field] of Object.entries(fields)) {
      const column = field instanceof ForeignKey ? field.columnName : name;
      instance[name] = field.fromDb(row[column]);
    }
    return instance;
  }

  static get objects() {
    return new QuerySet(this);
  }

  /**
   * Registers this model with the migration/admin registry immediately.
   * Call this once, right after defining a model with `static fields = {...}`,
   * so `migrate()` knows about it even before any query runs:
   *   class Post extends Model { static fields = {...} }
   *   Post.register();
   */
  static register() {
    fieldsFor(this);
    return this;
  }

  save() {
    const ModelClass = this.constructor;
    const db = getDb();
    const fields = fieldsFor(ModelClass);
    const table = tableNameFor(ModelClass);
    const row = {};
    for (const [name, field] of Object.entries(fields)) {
      if (name === 'id') continue;
      const column = field instanceof ForeignKey ? field.columnName : name;
      const raw = field instanceof ForeignKey ? (this[name] && this[name].id) ?? this[column] : this[name];
      row[column] = field.toDb(raw);
    }

    if (this.id) {
      db.update(table, this.id, row);
    } else {
      const record = db.insert(table, row);
      this.id = record.id;
    }
    return this;
  }

  delete() {
    const table = tableNameFor(this.constructor);
    getDb().deleteWhere(table, (row) => row.id === this.id);
  }

  toJSON() {
    const fields = fieldsFor(this.constructor);
    const out = {};
    for (const name of Object.keys(fields)) out[name] = this[name];
    return out;
  }
}

module.exports = { Model, QuerySet, fieldsFor, tableNameFor };

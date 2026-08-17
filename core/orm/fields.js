// jangojs/core/orm/fields.js
// Field descriptors — declared on a Model subclass, they describe how a
// value is validated/normalized on the way into and out of storage. No SQL
// types here: the store is plain JS objects in a JSON file.

class Field {
  constructor({ primaryKey = false, nullable = false, default: def = undefined, unique = false } = {}) {
    this.primaryKey = primaryKey;
    this.nullable = nullable;
    this.default = def;
    this.unique = unique;
    this.name = null; // set by Model when the class is defined
  }

  /** Normalizes a JS value into the form stored on disk. */
  toDb(value) {
    if (value === undefined) return this.default !== undefined ? this.default : null;
    return value;
  }

  /** Normalizes a stored value back into the form JS code works with. */
  fromDb(value) {
    return value;
  }
}

class CharField extends Field {
  constructor(opts = {}) {
    super(opts);
    this.maxLength = opts.maxLength || 255;
  }
}

class TextField extends Field {}

class IntegerField extends Field {
  toDb(value) {
    const v = value === undefined ? this.default : value;
    return v === null || v === undefined ? null : Number(v);
  }
}

class BooleanField extends Field {
  toDb(value) {
    const v = value === undefined ? this.default : value;
    return !!v;
  }
  fromDb(value) {
    return !!value;
  }
}

class DateTimeField extends Field {
  constructor(opts = {}) {
    super(opts);
    this.autoNow = !!opts.autoNow;
    this.autoNowAdd = !!opts.autoNowAdd;
  }
  toDb(value) {
    if (this.autoNow || (this.autoNowAdd && value === undefined)) return new Date().toISOString();
    if (value === undefined) return this.default !== undefined ? this.default : null;
    return value instanceof Date ? value.toISOString() : value;
  }
  fromDb(value) {
    return value ? new Date(value) : null;
  }
}

class ForeignKey extends Field {
  constructor(relatedModel, opts = {}) {
    super(opts);
    this.relatedModel = relatedModel; // a function returning the Model class (avoids circular imports)
  }
  get columnName() {
    return `${this.name}_id`;
  }
  toDb(value) {
    return value === undefined ? null : value;
  }
}

module.exports = { Field, CharField, TextField, IntegerField, BooleanField, DateTimeField, ForeignKey };

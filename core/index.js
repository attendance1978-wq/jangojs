// jangojs/core/index.js — public API surface, akin to `import django` giving
// you access to the whole framework's pieces.

const { Model } = require('./orm/model');
const fields = require('./orm/fields');
const { path, include } = require('./router');
const views = require('./views');
const { createApp } = require('./server');
const admin = require('./admin');
const template = require('./template/engine');
const { migrate } = require('./orm/migrations');

module.exports = {
  Model,
  ...fields,
  path,
  include,
  ...views,
  createApp,
  admin,
  template,
  migrate,
};

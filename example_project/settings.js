// example_project/settings.js — analogous to Django's settings.py
const path = require('node:path');
const urls = require('./urls');

function logMiddleware(request, next) {
  const start = Date.now();
  return Promise.resolve(next()).then((response) => {
    console.log(`${request.method} ${request.path} -> ${response.status} (${Date.now() - start}ms)`);
    return response;
  });
}

module.exports = {
  DEBUG: true,
  PORT: 8000,
  DATABASE_PATH: path.join(__dirname, 'db.json'),
  TEMPLATE_DIR: path.join(__dirname, 'blog', 'templates'),
  INSTALLED_APPS: ['blog'],
  ROOT_URLCONF: urls,
  MIDDLEWARE: [logMiddleware],
};

#!/usr/bin/env node
// jangojs/bin/manage.js
// Run from a project directory containing settings.js, exactly like
// `python manage.py <command>` expects manage.py next to settings.py.
//
// Usage:
//   node bin/manage.js runserver [port]
//   node bin/manage.js migrate

const path = require('node:path');
const { createApp } = require('../core/server');
const { connect } = require('../core/orm/db');
const { migrate } = require('../core/orm/migrations');

function loadSettings() {
  const settingsPath = path.join(process.cwd(), 'settings.js');
  return require(settingsPath);
}

function main() {
  const [, , command, arg] = process.argv;
  const settings = loadSettings();

  if (command === 'runserver') {
    const port = Number(arg) || settings.PORT || 8000;
    const app = createApp(settings);
    app.listen(port, () => {
      console.log(`jangojs dev server running at http://127.0.0.1:${port}/`);
    });
  } else if (command === 'migrate') {
    connect(settings.DATABASE_PATH || ':memory:');
    // Force app models to load (and thus register) before migrating.
    (settings.INSTALLED_APPS || []).forEach((appPath) => {
      try { require(path.join(process.cwd(), appPath, 'models.js')); } catch { /* app has no models */ }
    });
    const created = migrate();
    console.log(`Applied migrations for: ${created.join(', ') || '(no models registered)'}`);
  } else {
    console.log(`Unknown command: ${command}\n\nAvailable commands:\n  runserver [port]\n  migrate`);
    process.exitCode = 1;
  }
}

main();

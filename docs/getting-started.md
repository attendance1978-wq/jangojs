# Getting started

## Requirements

Just Node.js — no external packages to install, no native code to compile.
Any reasonably recent Node version works (the framework only uses `fs`,
`http`, and `url` from the standard library).

## Project layout

A jangojs project looks like a Django project:

```
my_project/
  settings.js          # DEBUG, PORT, DATABASE_PATH, TEMPLATE_DIR, INSTALLED_APPS, ROOT_URLCONF, MIDDLEWARE
  urls.js              # root urlpatterns — usually include()s each app's urls
  blog/                # an "app" — a self-contained feature area
    models.js
    views.js
    urls.js
    admin.js
    templates/
      base.html
      post_list.html
```

`example_project/` in this repo is exactly this shape, with one app (`blog`).
Read through it alongside this guide.

## Running the example

```bash
cd example_project
node ../bin/manage.js migrate      # ensures a table exists for every registered model
node ../bin/manage.js runserver    # serves on http://127.0.0.1:8000/ (or settings.PORT)
```

Visit `/` for the post list, `/posts/new/` to create one, `/posts/<id>/` for
a detail page, `/api/posts/` for JSON, and `/admin/` for the auto-generated
admin listing.

## `settings.js`

```js
const path = require('node:path');
const urls = require('./urls');

module.exports = {
  DEBUG: true,
  PORT: 8000,
  DATABASE_PATH: path.join(__dirname, 'db.json'),   // or ':memory:' for no persistence
  TEMPLATE_DIR: path.join(__dirname, 'blog', 'templates'),
  INSTALLED_APPS: ['blog'],
  ROOT_URLCONF: urls,           // an array of path()/include() entries
  MIDDLEWARE: [],                // array of (request, next) => response
};
```

- `DATABASE_PATH` — a file path for the JSON data store, or the literal
  string `':memory:'` to skip persistence entirely (everything resets when
  the process exits — handy for tests).
- `TEMPLATE_DIR` — one directory `render()` looks templates up in. Multi-app
  projects with per-app template directories aren't supported yet; point
  this at a shared `templates/` folder if you have more than one app.
- `INSTALLED_APPS` — only used by `bin/manage.js migrate`, to `require()`
  each app's `models.js` so its models register before migrating.

## Starting a new project by hand

There's no `startproject`/`startapp` scaffolding command yet — copy
`example_project/` and rename things, or build up the files following the
layout above. See [Models](./models.md) and [Routing & views](./routing-views.md)
for what each file needs to contain.

## Where to go next

- Define your data: [Models & the ORM](./models.md)
- Wire up URLs and request handling: [Routing & views](./routing-views.md)
- Render HTML: [Templates](./templates.md)

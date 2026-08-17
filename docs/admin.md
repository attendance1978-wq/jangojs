# Admin

`core/admin.js` is a stripped-down version of `django.contrib.admin`: a
read-only listing UI generated from whatever models you register. It's a
starting point, not a security boundary — see "What you don't get" below.

## Registering a model

```js
// blog/admin.js
const admin = require('../../core/admin');
const { Post } = require('./models');

admin.register(Post, { listFields: ['id', 'title', 'published', 'createdAt'] });
```

`listFields` controls which columns show in the table and their order. If
you omit it, the admin infers columns from the first row returned (or falls
back to just `id` if the table is empty).

## Mounting it

```js
// urls.js (root)
const { path, include } = require('./core/router');
const admin = require('./core/admin');

require('./blog/models');   // make sure models are registered first
require('./blog/admin');

module.exports = [
  path('admin/', include(admin.urls())),
  // ...
];
```

`admin.urls()` builds the urlpatterns for everything registered so far —
call it *after* your app's `models.js`/`admin.js` have run, so every
`admin.register()` call has already happened.

## What you get

- `/admin/` — a dashboard listing every registered model and its row count,
  linking to each model's table.
- `/admin/<modelname>/` — a plain HTML `<table>` of every row (lowercased
  model name, e.g. `Post` → `/admin/post/`).

## What you don't get

This is deliberately minimal — treat it as a debugging/demo tool, not a
production admin panel:

- **No authentication.** Anyone who can reach the URL can see the data.
  Don't mount it on a publicly deployed app without adding your own
  auth middleware in front of the `admin/` prefix.
- **No create/edit/delete forms.** It's read-only — use the Node REPL, a
  script, or your app's own views to modify data.
- **No pagination, search, or filtering.** Every row renders every time;
  fine for a handful of records, not for a large table.
- **No customization hooks** beyond `listFields` — no custom widgets,
  computed columns, or per-field formatting.

If you need more than this, it's a reasonable place to start extending —
`core/admin.js` is short and the table-rendering logic is a good spot to
add pagination or a simple auth check.

# Comparison to Django

## File-for-file mapping

| Django | jangojs |
|---|---|
| `settings.py` | `settings.js` |
| `models.py` (`models.Model`) | `models.js` (`Model`) |
| `urls.py` (`urlpatterns`, `path()`, `include()`) | `urls.js` (same names, same shape) |
| `views.py` (function-based views) | `views.js` (function views — no class-based views) |
| `templates/*.html` (DTL) | `templates/*.html` (a subset of DTL — see [templates.md](./templates.md)) |
| `admin.py` (`admin.site.register`) | `admin.js` (`admin.register`) |
| `manage.py runserver` / `migrate` | `node bin/manage.js runserver` / `migrate` |
| `INSTALLED_APPS` | `settings.INSTALLED_APPS` (same purpose: used by `migrate` to load each app's models) |
| Django ORM (`Model.objects.filter(...)`) | jangojs ORM (`Model.objects.filter(...)`) — same call shape, no SQL underneath |

If you've built a Django app before, most of what you already know about
*where things go* transfers directly. What doesn't transfer is anything
Django implements with a metaclass, a signal, a WSGI middleware chain, or a
real relational database underneath — jangojs is a deliberately smaller,
from-scratch reimplementation of the shape, not the internals.

## Deliberate divergences

### `Model.register()` is explicit, not automatic

Django's `ModelBase` metaclass hooks into class creation to register every
model automatically. jangojs doesn't use a metaclass (plain ES classes),
so nothing observes `static fields = {...}` being declared. Call
`Post.register()` right after defining a model if you need `migrate()` or
the admin to know about it before the first query runs. Full explanation:
[models.md](./models.md#why-modelregister-exists).

### Migrations are not migrations

Django's migrations are a versioned history of schema changes, diffed and
applied incrementally. jangojs's `migrate()` just makes sure a table array
exists for each registered model — there's no history, no diffing, and no
schema to alter, since the storage layer is untyped JSON. Changing a
model's fields doesn't transform existing rows; either delete the data file
or write your own transform script.

### No SQL, no relational database

There's no SQL layer at all — `core/orm/db.js` is a hand-rolled flat-file
store (arrays of JS objects, persisted as one JSON file). This means:

- No JOINs. `ForeignKey` stores a raw id; fetch the related object yourself
  with a second query.
- No transactions or row-level locking — one process, one writer at a time,
  assumed.
- No indexes — every `filter()` scans the full table in memory. Fine for
  small datasets; not built for scale.

### No auth, sessions, or CSRF protection

Django ships `django.contrib.auth`, sessions, and CSRF middleware by
default. jangojs has none of this. If you need authentication, you're
writing your own middleware and session storage — nothing here assumes a
particular approach, so it's a blank slate rather than something to work
around.

### Templates are a subset of DTL

The tags you'd reach for most (`{{ }}`, `{% if %}`, `{% for %}`,
`{% extends %}`/`{% block %}`, `{% include %}`) work the same way. Custom
filters (beyond `safe`), `{% elif %}`, `{% empty %}`, and loop variables
(`forloop.counter`) aren't implemented. See [templates.md](./templates.md#what's-not-implemented)
for the full list.

### The admin is read-only

Django's admin gives you full CRUD, auth, search, and filtering out of the
box. jangojs's admin is a dashboard + read-only tables — a debugging aid,
not a content-management tool. See [admin.md](./admin.md#what-you-dont-get).

### No class-based views, no forms framework, no signals

Views are plain functions. There's no `ModelForm`, no `ListView`/`DetailView`
base classes, and no signals (`post_save`, etc.) to hook into. If you're
used to leaning on those, the closest equivalent here is just writing the
logic directly in your view function.

## What's the same in spirit

- The project/app split (`INSTALLED_APPS`, one `models.js`/`views.js`/`urls.js`
  per app) encourages the same modularity Django does.
- `path()`/`include()` and the QuerySet API are close enough that muscle
  memory mostly transfers.
- Middleware is a request/response pipeline, same mental model as Django
  middleware, just without the separate `process_request`/`process_response`
  method split — one function wraps `next()`.

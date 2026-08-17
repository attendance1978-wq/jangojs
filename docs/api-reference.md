# API reference

Everything below is exported from `core/index.js` unless noted otherwise —
`const jangojs = require('./core/index')` gives you all of it in one object,
or `require` the individual module shown per section.

## `core/orm/model.js` — `Model`, `QuerySet`

### `class Model`

```js
class Post extends Model {
  static fields = { title: new CharField(), /* ... */ };
}
```

| Member | Signature | Description |
|---|---|---|
| `constructor` | `new Model(data = {})` | Builds an unsaved instance from a plain object. Declared fields are copied from `data`; `id` is copied if present. |
| `static objects` | getter → `QuerySet` | Entry point for querying: `Model.objects.filter(...)`. |
| `static register()` | `() => Model` | Forces field resolution + registration with the migration/admin registry immediately (see [models.md](./models.md#why-modelregister-exists)). Returns the class for chaining. |
| `static tableName` | optional static string | Override the default `${ClassName.toLowerCase()}s` table name by setting this. |
| `.save()` | `() => this` | Inserts (if `this.id` is unset) or updates (if set). Mutates `this.id` on insert. |
| `.delete()` | `() => void` | Removes this row from storage by `id`. |
| `.toJSON()` | `() => object` | Plain object with every declared field — used implicitly by `JSON.stringify` and explicitly by `JsonResponse`. |

### `class QuerySet`

Obtained via `Model.objects`, never constructed directly. All methods
except the terminal ones return a new `QuerySet` (queries are immutable —
chaining doesn't mutate the original).

| Method | Signature | Description |
|---|---|---|
| `.filter(criteria)` | `(object) => QuerySet` | AND-combined equality/comparison filters. Keys: `field` or `field__<lookup>` (`eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `contains`). |
| `.orderBy(field)` | `(string) => QuerySet` | Ascending by default; prefix `-` for descending. |
| `.limit(n)` | `(number) => QuerySet` | Caps the result count. |
| `.all()` | `() => Model[]` | Runs the query, returns model instances. **Terminal.** |
| `.first()` | `() => Model \| null` | Like `.limit(1).all()[0]`, or `null`. **Terminal.** |
| `.get(criteria?)` | `(object?) => Model` | Throws if the (optionally filtered) query doesn't match exactly one row. **Terminal.** |
| `.count()` | `() => number` | Row count without materializing models. **Terminal.** |
| `.delete()` | `() => number` | Deletes every matching row; returns the count removed. **Terminal.** |
| `[Symbol.iterator]` | — | `QuerySet` is iterable: `for (const p of Post.objects.all())`. |

## `core/orm/fields.js`

All field classes extend `Field` and accept `{ nullable, default, unique }`
(plus their own extras below). See [models.md](./models.md#field-types) for
the full behavior table.

| Class | Extra options |
|---|---|
| `CharField` | `maxLength` |
| `TextField` | — |
| `IntegerField` | — |
| `BooleanField` | — |
| `DateTimeField` | `autoNow`, `autoNowAdd` |
| `ForeignKey(relatedModelFn, opts)` | first positional arg is `() => Model` |

## `core/orm/db.js`

Usually only touched via `createApp(settings)`, but available directly:

| Export | Signature | Description |
|---|---|---|
| `connect(filePath)` | `(string) => Database` | Opens (or creates) the flat-file store. `filePath` of `':memory:'` skips disk persistence. |
| `getDb()` | `() => Database` | Returns the current connection; throws if `connect()` hasn't run yet. |
| `Database` | class | `.all(table)`, `.insert(table, row)`, `.update(table, id, patch)`, `.deleteWhere(table, predicate)`, `.ensureTable(name)` — the primitives `Model`/`QuerySet` are built on. |

## `core/orm/migrations.js`

| Export | Signature | Description |
|---|---|---|
| `registerModel(ModelClass)` | `(Model) => void` | Adds a model to the registry (called automatically by `fieldsFor`/`Model.register()`). |
| `migrate()` | `() => string[]` | Ensures a table exists for every registered model; returns the list of model names it touched. |

## `core/router.js`

| Export | Signature | Description |
|---|---|---|
| `path(pattern, view, name?)` | → route entry | Declares one URL pattern. `pattern` supports `<int:x>`, `<str:x>`, `<slug:x>`, `<uuid:x>` converters. |
| `include(urlpatterns)` | `(array) => object` | Nests another array of patterns under the enclosing `path()`'s prefix. |
| `class Resolver` | `new Resolver(urlpatterns)` | `.resolve(urlPath)` → `{ view, params, name } \| null`; `.reverse(name, params)` → URL string. |

## `core/views.js`

| Export | Signature | Description |
|---|---|---|
| `HttpResponse(body, opts?)` | `opts: { status, headers, contentType }` | Builds a raw response descriptor. |
| `JsonResponse(data, opts?)` | `opts: { status, headers }` | `HttpResponse` with `data` JSON-stringified and the right content type. |
| `render(request, templateName, context?, status?)` | — | Renders a template from `request.app.templateDir` with `context`. |
| `redirect(url, status = 302)` | — | Builds a redirect response. |
| `notFound(message?)` | — | `HttpResponse(message, { status: 404 })`. |

## `core/server.js`

| Export | Signature | Description |
|---|---|---|
| `createApp(settings)` | `(object) => { listen(port, cb?), resolver }` | Connects the DB, builds the `Resolver`, wires up middleware, and returns an app object. `.listen()` also runs `migrate()` before binding the port. |

## `core/admin.js`

| Export | Signature | Description |
|---|---|---|
| `register(ModelClass, opts?)` | `opts: { listFields }` | Registers a model for the auto-admin. |
| `urls()` | `() => routeEntry[]` | Builds urlpatterns for everything registered so far — mount with `path('admin/', include(admin.urls()))`. |

## `core/template/engine.js`

| Export | Signature | Description |
|---|---|---|
| `render(templateName, context, templateDir)` | — | Renders a template file by name. (Views usually go through `core/views.js`'s `render()` instead, which supplies `templateDir` for you.) |
| `renderString(src, context, templateDir)` | — | Renders a template from a string instead of a file — useful for testing tag behavior. |
| `escapeHtml(str)` | `(string) => string` | The same escaping `{{ }}` uses internally. |

## `bin/manage.js` (CLI)

Run from inside a project directory (next to `settings.js`):

```bash
node ../bin/manage.js runserver [port]   # defaults to settings.PORT or 8000
node ../bin/manage.js migrate            # requires each INSTALLED_APPS' models.js, then migrates
```

# Models & the ORM

## Defining a model

```js
const { Model, CharField, TextField, BooleanField, DateTimeField } = require('../../core/index');

class Post extends Model {
  static fields = {
    title: new CharField({ maxLength: 200 }),
    body: new TextField(),
    published: new BooleanField({ default: false }),
    createdAt: new DateTimeField({ autoNowAdd: true }),
  };
}

Post.register(); // see "Why Model.register() exists" below

module.exports = { Post };
```

An auto-incrementing `id` field is always added for you — don't declare one.

### Field types

| Field | Options | Notes |
|---|---|---|
| `CharField` | `maxLength`, `nullable`, `default`, `unique` | `maxLength` is stored but not enforced (no length validation yet) |
| `TextField` | `nullable`, `default`, `unique` | Same as `CharField` minus `maxLength` |
| `IntegerField` | `nullable`, `default`, `unique` | Coerces to `Number` on save |
| `BooleanField` | `default` | Coerces to `true`/`false` on save |
| `DateTimeField` | `autoNow`, `autoNowAdd`, `default` | Stored as an ISO string, read back as a `Date`. `autoNow` stamps on every save; `autoNowAdd` stamps only when the field is unset |
| `ForeignKey` | `nullable`, `default` | First arg is `() => RelatedModel` (a function, so circular imports between models work) |

All fields accept `nullable` and `default`; `unique` is accepted but not
currently enforced (no uniqueness check runs on save — validate it
yourself if you need the guarantee).

### Why `Model.register()` exists

`static fields = {...}` is a plain JS class field — nothing runs when the
class is defined, so nothing tells `migrate()` or the admin that this model
exists until some code actually queries it. Calling `Post.register()`
right after the class definition forces that registration immediately, so:

```bash
node bin/manage.js migrate
```

picks the model up even though no query has run yet. If you skip
`register()`, the model still works — it just won't show up in `migrate()`
or `/admin/` until the first time you call `Post.objects...` somewhere.

## Querying — the QuerySet API

```js
Post.objects.all();
Post.objects.filter({ published: true });
Post.objects.filter({ title__contains: 'hello' });
Post.objects.filter({ views__gte: 100 }).orderBy('-createdAt').limit(5).all();
Post.objects.get({ id: 1 });         // throws if 0 or 2+ rows match
Post.objects.filter({ published: false }).count();
Post.objects.filter({ published: false }).delete();
```

`QuerySet` methods are chainable and lazy — nothing touches storage until
you call `.all()`, `.first()`, `.get()`, `.count()`, or `.delete()`, or
iterate the QuerySet directly (`for (const p of Post.objects.all())`).

### Filter lookups

`filter({ field: value })` does an equality check. Append `__<lookup>` to
the key for other comparisons:

| Lookup | Meaning |
|---|---|
| `field__eq` | equals (default, same as no suffix) |
| `field__ne` | not equal |
| `field__gt` / `field__gte` | greater than / or equal |
| `field__lt` / `field__lte` | less than / or equal |
| `field__contains` | substring match (string fields) |

Multiple keys in one `filter()` call are ANDed together; chain `.filter()`
calls for the same effect.

### Ordering

`.orderBy('field')` sorts ascending; prefix with `-` for descending:
`.orderBy('-createdAt')`.

### Saving

```js
const post = new Post({ title: 'Hi', body: '...' });
post.save();          // INSERT — fills in post.id

post.title = 'Updated';
post.save();          // UPDATE, because post.id is already set
```

`save()` looks at `this.id` to decide insert vs. update — there's no
separate `create()`/`update()` call.

### Deleting

```js
post.delete();                                    // delete a single instance
Post.objects.filter({ published: false }).delete(); // bulk delete, returns count removed
```

## The storage layer

`core/orm/db.js` is a hand-rolled flat-file store — no SQL, no native
bindings:

- Each "table" is a plain JS array of row objects.
- The whole database lives in memory once loaded, and the whole JSON file
  is rewritten (via `fs.writeFileSync`) after every insert/update/delete.
- Set `DATABASE_PATH: ':memory:'` in settings to skip the file entirely —
  useful for tests, since data resets every process start.

This is intentionally simple. It's fine for prototypes, demos, and small
apps. It is **not** a substitute for a real database once you have
concurrent writers, large tables, or need transactions — "rewrite the
entire file on every write" doesn't scale past that.

### `ForeignKey`

```js
class Comment extends Model {
  static fields = {
    post: new ForeignKey(() => Post),
    body: new TextField(),
  };
}
```

Assign a `Post` instance (or an id) to `comment.post`; `save()` stores it as
`post_id` internally. Reading `comment.post` back gives you the raw stored
value (an id), not an automatically-fetched `Post` instance — there's no
lazy-loading relation traversal yet. Fetch the related object yourself:

```js
const post = Post.objects.get({ id: comment.post });
```

## `toJSON()`

Every model instance has `.toJSON()`, which returns a plain object with
every declared field (handy for `JsonResponse(post.toJSON())` or
`JsonResponse(posts.map(p => p.toJSON()))`).

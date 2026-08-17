# Routing & views

## `urlpatterns`

```js
// blog/urls.js
const { path } = require('../../core/router');
const views = require('./views');

module.exports = [
  path('', views.postList, 'post-list'),
  path('posts/new/', views.postCreate, 'post-create'),
  path('posts/<int:id>/', views.postDetail, 'post-detail'),
];
```

`path(pattern, view, name?)` declares one route. `pattern` is a string with
optional `<type:name>` converters (see below); `view` is a function;
`name` is optional but needed if you want to `resolver.reverse(name, params)`.

### Nesting apps with `include()`

```js
// urls.js (root)
const { path, include } = require('./core/router');
const blogUrls = require('./blog/urls');

module.exports = [
  path('blog/', include(blogUrls)),   // blog's '' becomes '/blog/', 'posts/new/' becomes '/blog/posts/new/'
];
```

Prefixes compose: `include()` can nest inside `include()` arbitrarily deep.

### Path converters

| Converter | Matches | Cast to |
|---|---|---|
| `<int:name>` | one or more digits | `Number` |
| `<str:name>` | anything except `/` | `String` (default if you omit the type) |
| `<slug:name>` | letters, digits, `-`, `_` | `String` |
| `<uuid:name>` | a UUID shape | `String` |

Matched values land in `request.params`, already cast: `request.params.id`
is a `Number` for an `<int:id>` route, not a string.

## Views

A view is just `(request) => response` — synchronous or `async`, both work
since the server `await`s whatever comes back.

```js
function postDetail(request) {
  const post = Post.objects.filter({ id: request.params.id }).first();
  if (!post) return notFound('Post not found');
  return render(request, 'post_detail.html', { post });
}
```

### The `request` object

| Property | Contents |
|---|---|
| `request.method` | `'GET'`, `'POST'`, etc. |
| `request.path` | URL path, e.g. `/posts/3/` |
| `request.GET` | query string params, as a plain object |
| `request.POST` | parsed body — JSON if `Content-Type: application/json`, form fields if `application/x-www-form-urlencoded`, otherwise `{ raw: <string> }` |
| `request.params` | path converter matches, e.g. `{ id: 3 }` |
| `request.headers` | raw Node request headers |
| `request.app` | `{ templateDir, settings, resolver }` — mostly used internally by `render()` |

### Response helpers (`core/views.js`)

```js
const { render, redirect, JsonResponse, HttpResponse, notFound } = require('../../core/index');

render(request, 'template.html', { context });   // renders a template, Content-Type: text/html
redirect('/somewhere/');                          // 302 with a Location header
JsonResponse({ ok: true });                       // Content-Type: application/json
HttpResponse('plain text', { status: 201 });      // build a response by hand
notFound('Post not found');                       // shortcut for HttpResponse(..., { status: 404 })
```

Every helper returns a plain `{ status, headers, body }` object — you can
build one yourself instead of using the helpers if you need something
unusual.

## Middleware

```js
// settings.js
function logMiddleware(request, next) {
  const start = Date.now();
  return Promise.resolve(next()).then((response) => {
    console.log(`${request.method} ${request.path} -> ${response.status} (${Date.now() - start}ms)`);
    return response;
  });
}

module.exports = {
  MIDDLEWARE: [logMiddleware],
  // ...
};
```

Each middleware is `(request, next) => response`. `next()` calls the next
middleware in the array, or the matched view once the chain runs out.
Middleware runs in array order, wrapping the view like a Russian doll — the
first entry in `MIDDLEWARE` is outermost.

Common patterns:

```js
// Short-circuit before the view runs
function blockBots(request, next) {
  if (/bot/i.test(request.headers['user-agent'] || '')) {
    return { status: 403, headers: {}, body: 'Forbidden' };
  }
  return next();
}

// Modify the response after the view runs
function addHeader(request, next) {
  return Promise.resolve(next()).then((response) => ({
    ...response,
    headers: { ...response.headers, 'X-Powered-By': 'jangojs' },
  }));
}
```

## URL reversing

```js
const app = createApp(settings);
app.resolver.reverse('post-detail', { id: 3 }); // '/posts/3/'
```

Useful inside views that need to build a link/redirect without hardcoding
the path string.

## 404s

If no route matches, the server returns a plain-text 404 automatically —
you don't need a catch-all route for that. Use `notFound()` from a view
when a route matched but the specific record didn't (e.g. `postDetail`
above).

## Error handling

Any error thrown inside a view or middleware is caught by the server and
turned into a `500` response with the error message in the body — check
`bin/manage.js runserver`'s terminal output for the full stack trace during
development. There's no separate DEBUG-mode error page yet.

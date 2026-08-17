# Templates

`core/template/engine.js` implements the common subset of Django Template
Language / Jinja that most templates actually use. Templates are looked up
by filename inside `settings.TEMPLATE_DIR`.

## Variables — `{{ }}`

```html
<h1>{{ post.title }}</h1>
<p>By {{ post.author.name }}</p>
```

`{{ expr }}` resolves dotted paths against the context object you passed to
`render()`. Output is **HTML-escaped by default** — `&`, `<`, `>`, `"`, `'`
are all escaped, so it's safe to interpolate user-supplied strings without
thinking about it.

To skip escaping (only for content you trust — pre-sanitized HTML, etc.),
add the `safe` filter:

```html
{{ post.rendered_html|safe }}
```

`safe` is currently the only filter implemented.

## Conditionals — `{% if %}`

```html
{% if post.published %}
  <span class="badge">Live</span>
{% else %}
  <span class="badge">Draft</span>
{% endif %}
```

`{% if not post.published %}` negates the condition. Truthiness: an empty
array is falsy, everything else follows normal JS truthiness (`0`, `''`,
`null`, `undefined`, `false` are all falsy).

There's no `{% elif %}` yet — nest another `{% if %}` inside the `{% else %}`
block if you need more than two branches.

## Loops — `{% for %}`

```html
<ul>
{% for post in posts %}
  <li><a href="/posts/{{ post.id }}/">{{ post.title }}</a></li>
{% endfor %}
</ul>
```

`{% for x in list %}` iterates any array in the context. There's no
`{% empty %}` clause — pair it with `{% if posts %}...{% else %}No posts
yet.{% endif %}` around the loop for an empty-state message (see
`post_list.html` in the example project).

No loop counter (`forloop.counter`) yet either — track an index in JS and
pass it in the context if you need one.

## Layout inheritance — `{% extends %}` / `{% block %}`

`base.html`:

```html
<!doctype html>
<html>
<head><title>{% block title %}My Site{% endblock %}</title></head>
<body>
  <main>{% block content %}{% endblock %}</main>
</body>
</html>
```

`post_list.html`:

```html
{% extends "base.html" %}
{% block title %}Posts{% endblock %}
{% block content %}
  <p>...</p>
{% endblock %}
```

A child template with `{% extends %}` overrides whichever `{% block %}`
names it re-declares; blocks it doesn't mention fall back to the parent's
content. Extends chains (`grandchild extends child extends base`) work too.

## Partials — `{% include %}`

```html
{% include "partials/nav.html" %}
```

Renders another template file in place, sharing the current context.

## What's not implemented

Keep these in mind before assuming Django/Jinja syntax works verbatim:

- No custom filters beyond `safe` (no `date`, `truncatewords`, `default`, etc.)
- No `{% elif %}` — nest `{% if %}` instead
- No `{% empty %}` clause on `{% for %}` — use a surrounding `{% if %}`
- No loop variables (`forloop.counter`, `forloop.first`, ...)
- No template-level whitespace control — output preserves exactly what's
  between tags, so watch for stray blank lines if you're diffing output
- No macros/custom tags — this is a renderer for the tags above, not an
  extensible template language

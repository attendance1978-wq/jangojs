// jangojs/core/router.js
// Django-style urlpatterns: path('posts/<int:id>/', view, 'name'), include().
// Converts <type:name> converters into a regex and extracts typed params.

const CONVERTERS = {
  int: { pattern: '\\d+', cast: (v) => parseInt(v, 10) },
  str: { pattern: '[^/]+', cast: (v) => v },
  slug: { pattern: '[-\\w]+', cast: (v) => v },
  uuid: { pattern: '[0-9a-fA-F-]{36}', cast: (v) => v },
};

function compile(pattern) {
  const paramTypes = [];
  const regexStr = pattern.replace(/<(\w+):(\w+)>/g, (_, type, name) => {
    const converter = CONVERTERS[type] || CONVERTERS.str;
    paramTypes.push({ name, cast: converter.cast });
    return `(${converter.pattern})`;
  });
  return { regex: new RegExp(`^${regexStr}$`), paramTypes };
}

/** Declares a single route: path('posts/<int:id>/', view, 'post-detail') */
function path(pattern, view, name = null) {
  return { type: 'path', pattern, view, name };
}

/** Nests another app's urlpatterns under a prefix: path('blog/', include(blogUrls)) */
function include(urlpatterns) {
  return { type: 'include', urlpatterns };
}

/** Flattens nested path()/include() entries into a single ordered list with full patterns. */
function flatten(urlpatterns, prefix = '') {
  const flat = [];
  for (const entry of urlpatterns) {
    const fullPattern = prefix + entry.pattern;
    if (entry.view && entry.view.type === 'include') {
      flat.push(...flatten(entry.view.urlpatterns, fullPattern));
    } else if (entry.view === undefined && entry.type === 'path') {
      // path('prefix/', include(...)) form: view slot holds the include() result
      flat.push(entry);
    } else {
      flat.push({ ...entry, pattern: fullPattern });
    }
  }
  return flat;
}

class Resolver {
  constructor(urlpatterns) {
    this.routes = this._build(urlpatterns, '');
  }

  _build(urlpatterns, prefix) {
    const routes = [];
    for (const entry of urlpatterns) {
      const fullPattern = prefix + entry.pattern;
      if (entry.view && entry.view.type === 'include') {
        routes.push(...this._build(entry.view.urlpatterns, fullPattern));
      } else {
        const { regex, paramTypes } = compile(fullPattern);
        routes.push({ regex, paramTypes, view: entry.view, name: entry.name, pattern: fullPattern });
      }
    }
    return routes;
  }

  /** Resolves a URL path + method to { view, params } or null. */
  resolve(urlPath) {
    const clean = urlPath.split('?')[0].replace(/^\/+/, '');
    for (const route of this.routes) {
      const m = clean.match(route.regex);
      if (m) {
        const params = {};
        route.paramTypes.forEach((p, i) => { params[p.name] = p.cast(m[i + 1]); });
        return { view: route.view, params, name: route.name };
      }
    }
    return null;
  }

  reverse(name, params = {}) {
    const route = this.routes.find((r) => r.name === name);
    if (!route) throw new Error(`No URL pattern named '${name}'`);
    let url = route.pattern;
    url = url.replace(/<(\w+):(\w+)>/g, (_, __, paramName) => params[paramName]);
    return `/${url}`;
  }
}

module.exports = { path, include, Resolver };

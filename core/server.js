// jangojs/core/server.js
// Wires settings -> DB connection + URL resolver -> a plain node:http server.
// Mirrors Django's request cycle: parse request -> resolve URL -> run
// middleware -> call view -> write response.

const http = require('node:http');
const { URL } = require('node:url');
const { Resolver } = require('./router');
const { connect } = require('./orm/db');
const { migrate } = require('./orm/migrations');
const { notFound } = require('./views');

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      const contentType = req.headers['content-type'] || '';
      if (!data) return resolve({});
      try {
        if (contentType.includes('application/json')) return resolve(JSON.parse(data));
        if (contentType.includes('application/x-www-form-urlencoded')) {
          return resolve(Object.fromEntries(new URLSearchParams(data)));
        }
        resolve({ raw: data });
      } catch {
        resolve({});
      }
    });
  });
}

function createApp(settings) {
  connect(settings.DATABASE_PATH || ':memory:');
  const resolver = new Resolver(settings.ROOT_URLCONF);
  const middleware = settings.MIDDLEWARE || [];
  const appContext = { templateDir: settings.TEMPLATE_DIR, settings, resolver };

  async function handle(req, res) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const match = resolver.resolve(parsedUrl.pathname);
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await parseBody(req) : {};

    const request = {
      method: req.method,
      path: parsedUrl.pathname,
      GET: Object.fromEntries(parsedUrl.searchParams),
      POST: body,
      params: match ? match.params : {},
      headers: req.headers,
      app: appContext,
    };

    const runView = async () => {
      if (!match) return notFound(`No route matches ${request.path}`);
      return match.view(request);
    };

    // Chain middleware: each is (request, next) => response
    let index = -1;
    async function next() {
      index++;
      if (index < middleware.length) return middleware[index](request, next);
      return runView();
    }

    let response;
    try {
      response = await next();
    } catch (err) {
      console.error(err);
      response = { status: 500, headers: { 'Content-Type': 'text/plain' }, body: `Internal Server Error: ${err.message}` };
    }

    res.writeHead(response.status || 200, response.headers || {});
    res.end(response.body ?? '');
  }

  return {
    listen(port, cb) {
      migrate(); // auto-create tables for any registered models
      const server = http.createServer((req, res) => { handle(req, res); });
      server.listen(port, cb);
      return server;
    },
    resolver,
  };
}

module.exports = { createApp };

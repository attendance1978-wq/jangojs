// jangojs/core/admin.js
// A stripped-down django.contrib.admin: register a model and get a
// read-only HTML listing for free at /admin/<model>/. No auth, no editing —
// a starting point, not a security boundary.

const { path } = require('./router');
const { HttpResponse } = require('./views');
const { escapeHtml } = require('./template/engine');

const registered = [];

function register(ModelClass, { listFields } = {}) {
  registered.push({ ModelClass, listFields: listFields || null });
}

function renderTable(ModelClass, listFields) {
  const rows = ModelClass.objects.all();
  const fields = listFields || (rows[0] ? Object.keys(rows[0].toJSON()) : ['id']);
  const header = fields.map((f) => `<th>${escapeHtml(f)}</th>`).join('');
  const body = rows
    .map((row) => {
      const data = row.toJSON();
      return `<tr>${fields.map((f) => `<td>${escapeHtml(data[f])}</td>`).join('')}</tr>`;
    })
    .join('');
  return `<table border="1" cellpadding="6" cellspacing="0">
    <thead><tr>${header}</tr></thead>
    <tbody>${body || `<tr><td colspan="${fields.length}">No records</td></tr>`}</tbody>
  </table>`;
}

function dashboardView() {
  const links = registered
    .map(({ ModelClass }) => `<li><a href="/admin/${ModelClass.name.toLowerCase()}/">${ModelClass.name} (${ModelClass.objects.count()})</a></li>`)
    .join('');
  return HttpResponse(
    `<h1>jangojs admin</h1><ul>${links}</ul>`,
    { contentType: 'text/html' },
  );
}

function modelListView(entry) {
  return () => HttpResponse(
    `<h1>${entry.ModelClass.name}</h1><p><a href="/admin/">&larr; back</a></p>${renderTable(entry.ModelClass, entry.listFields)}`,
    { contentType: 'text/html' },
  );
}

/** Builds urlpatterns for everything registered via admin.register(). Mount with path('admin/', include(admin.urls())). */
function urls() {
  const patterns = [path('', dashboardView, 'admin-index')];
  for (const entry of registered) {
    patterns.push(path(`${entry.ModelClass.name.toLowerCase()}/`, modelListView(entry), `admin-${entry.ModelClass.name.toLowerCase()}`));
  }
  return patterns;
}

module.exports = { register, urls };

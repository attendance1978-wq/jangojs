// jangojs/core/views.js
// Views are plain functions: (request) => response. These helpers build the
// response descriptors the server knows how to write out, mirroring
// Django's django.shortcuts (render, redirect) and JsonResponse.

const templateEngine = require('./template/engine');

function HttpResponse(body, { status = 200, headers = {}, contentType = 'text/plain' } = {}) {
  return { status, headers: { 'Content-Type': contentType, ...headers }, body };
}

function JsonResponse(data, { status = 200, headers = {} } = {}) {
  return {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  };
}

/** render(request, 'posts/detail.html', { post }) */
function render(request, templateName, context = {}, status = 200) {
  const html = templateEngine.render(templateName, context, request.app.templateDir);
  return HttpResponse(html, { status, contentType: 'text/html' });
}

function redirect(url, status = 302) {
  return { status, headers: { Location: url }, body: '' };
}

function notFound(message = 'Not Found') {
  return HttpResponse(message, { status: 404 });
}

module.exports = { HttpResponse, JsonResponse, render, redirect, notFound };

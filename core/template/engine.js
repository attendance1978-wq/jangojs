// jangojs/core/template/engine.js
// A small Django-Template-Language-alike: {{ var.attr }}, {% if %}/{% else %},
// {% for x in list %}, {% extends "base.html" %} + {% block name %}.
// Auto-escapes {{ }} output; use {{ var|safe }} to opt out.

const fs = require('node:fs');
const path = require('node:path');

const TAG_RE = /\{%\s*(.*?)\s*%\}|\{\{\s*(.*?)\s*\}\}/g;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolvePath(context, expr) {
  return expr.split('.').reduce((acc, key) => (acc === undefined || acc === null ? undefined : acc[key]), context);
}

// --- Tokenize into a flat list, then build a tree for {% %} block tags ---
function tokenize(src) {
  const tokens = [];
  let lastIndex = 0;
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(src))) {
    if (m.index > lastIndex) tokens.push({ type: 'text', value: src.slice(lastIndex, m.index) });
    if (m[1] !== undefined) tokens.push({ type: 'tag', value: m[1] });
    else tokens.push({ type: 'expr', value: m[2] });
    lastIndex = TAG_RE.lastIndex;
  }
  if (lastIndex < src.length) tokens.push({ type: 'text', value: src.slice(lastIndex) });
  return tokens;
}

function buildTree(tokens) {
  let i = 0;

  function parseNodes(stopTags) {
    const nodes = [];
    while (i < tokens.length) {
      const tok = tokens[i];
      if (tok.type === 'text') { nodes.push({ kind: 'text', value: tok.value }); i++; continue; }
      if (tok.type === 'expr') { nodes.push({ kind: 'expr', value: tok.value }); i++; continue; }
      // tag
      const [command, ...rest] = tok.value.split(/\s+/);
      if (stopTags.includes(command)) return { nodes, stoppedAt: command };
      i++;
      if (command === 'if') {
        const condition = tok.value.slice(3).trim();
        const body = parseNodes(['else', 'endif']);
        let elseBody = null;
        if (body.stoppedAt === 'else') { i++; elseBody = parseNodes(['endif']); i++; }
        else { i++; }
        nodes.push({ kind: 'if', condition, body: body.nodes, elseBody: elseBody ? elseBody.nodes : null });
      } else if (command === 'for') {
        // for item in items
        const parts = tok.value.slice(4).trim().split(/\s+in\s+/);
        const varName = parts[0].trim();
        const iterable = parts[1].trim();
        const body = parseNodes(['endfor']);
        i++;
        nodes.push({ kind: 'for', varName, iterable, body: body.nodes });
      } else if (command === 'block') {
        const name = rest[0];
        const body = parseNodes(['endblock']);
        i++;
        nodes.push({ kind: 'block', name, body: body.nodes });
      } else if (command === 'extends') {
        const templateName = rest.join(' ').replace(/["']/g, '');
        nodes.push({ kind: 'extends', template: templateName });
      } else if (command === 'include') {
        const templateName = rest.join(' ').replace(/["']/g, '');
        nodes.push({ kind: 'include', template: templateName });
      } else {
        // unknown tag — ignore
      }
    }
    return { nodes, stoppedAt: null };
  }

  return parseNodes([]).nodes;
}

function evalCondition(condition, context) {
  const negate = condition.startsWith('not ');
  const expr = negate ? condition.slice(4).trim() : condition;
  const value = resolvePath(context, expr);
  const truthy = Array.isArray(value) ? value.length > 0 : !!value;
  return negate ? !truthy : truthy;
}

function renderNodes(nodes, context, blocks) {
  let out = '';
  for (const node of nodes) {
    if (node.kind === 'text') out += node.value;
    else if (node.kind === 'expr') {
      const [rawExpr, filter] = node.value.split('|').map((s) => s.trim());
      const value = resolvePath(context, rawExpr);
      out += filter === 'safe' ? String(value ?? '') : escapeHtml(value ?? '');
    } else if (node.kind === 'if') {
      out += evalCondition(node.condition, context)
        ? renderNodes(node.body, context, blocks)
        : node.elseBody ? renderNodes(node.elseBody, context, blocks) : '';
    } else if (node.kind === 'for') {
      const list = resolvePath(context, node.iterable) || [];
      for (const item of list) {
        out += renderNodes(node.body, { ...context, [node.varName]: item }, blocks);
      }
    } else if (node.kind === 'block') {
      // A child template's block overrides the parent's — blocks map holds overrides.
      const override = blocks && blocks[node.name];
      out += override ? renderNodes(override, context, blocks) : renderNodes(node.body, context, blocks);
    } else if (node.kind === 'include') {
      out += renderFile(node.template, context, blocks && blocks.__templateDir);
    }
  }
  return out;
}

function collectBlocks(nodes, out = {}) {
  for (const node of nodes) {
    if (node.kind === 'block') out[node.name] = node.body;
  }
  return out;
}

function renderFile(templateName, context, templateDir) {
  const filePath = path.join(templateDir, templateName);
  const src = fs.readFileSync(filePath, 'utf-8');
  return renderString(src, context, templateDir);
}

function renderString(src, context, templateDir) {
  const tree = buildTree(tokenize(src));
  const extendsNode = tree.find((n) => n.kind === 'extends');
  if (extendsNode) {
    const childBlocks = collectBlocks(tree);
    childBlocks.__templateDir = templateDir;
    const parentPath = path.join(templateDir, extendsNode.template);
    const parentSrc = fs.readFileSync(parentPath, 'utf-8');
    return renderStringWithBlocks(parentSrc, context, templateDir, childBlocks);
  }
  return renderNodes(tree, context, { __templateDir: templateDir });
}

function renderStringWithBlocks(src, context, templateDir, blocks) {
  const tree = buildTree(tokenize(src));
  const extendsNode = tree.find((n) => n.kind === 'extends');
  if (extendsNode) {
    // Grandparent template — merge: child blocks win, but keep walking up the chain.
    const parentPath = path.join(templateDir, extendsNode.template);
    const parentSrc = fs.readFileSync(parentPath, 'utf-8');
    return renderStringWithBlocks(parentSrc, context, templateDir, blocks);
  }
  return renderNodes(tree, context, blocks);
}

/** Renders a template file by name, looked up under templateDir, with the given context. */
function render(templateName, context = {}, templateDir) {
  return renderFile(templateName, context, templateDir);
}

module.exports = { render, renderString, escapeHtml };

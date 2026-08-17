// example_project/urls.js — the root URLconf, like Django's project urls.py
const { path, include } = require('../core/router');
const admin = require('../core/admin');
const blogUrls = require('./blog/urls');

// Loading models registers them with admin/migrations before urls resolve.
require('./blog/models');
require('./blog/admin');

module.exports = [
  path('admin/', include(admin.urls())),
  path('', include(blogUrls)),
];

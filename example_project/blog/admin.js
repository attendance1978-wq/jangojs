// example_project/blog/admin.js — like a Django app's admin.py
const admin = require('../../core/admin');
const { Post } = require('./models');

admin.register(Post, { listFields: ['id', 'title', 'published', 'createdAt'] });

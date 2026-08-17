// example_project/blog/urls.js — like a Django app's urls.py
const { path } = require('../../core/router');
const views = require('./views');

module.exports = [
  path('', views.postList, 'post-list'),
  path('posts/new/', views.postCreate, 'post-create'),
  path('posts/<int:id>/', views.postDetail, 'post-detail'),
  path('api/posts/', views.postListJson, 'post-list-json'),
];

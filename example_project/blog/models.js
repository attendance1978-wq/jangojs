// example_project/blog/models.js — like a Django app's models.py
const { Model, CharField, TextField, BooleanField, DateTimeField } = require('../../core/index');

class Post extends Model {
  static fields = {
    title: new CharField({ maxLength: 200 }),
    body: new TextField(),
    published: new BooleanField({ default: false }),
    createdAt: new DateTimeField({ autoNowAdd: true }),
  };
}

Post.register();

module.exports = { Post };

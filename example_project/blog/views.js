// example_project/blog/views.js — like a Django app's views.py
const { render, redirect, notFound, JsonResponse } = require('../../core/index');
const { Post } = require('./models');

function postList(request) {
  const posts = Post.objects.filter({ published: true }).orderBy('-createdAt').all();
  return render(request, 'post_list.html', { posts });
}

function postDetail(request) {
  const post = Post.objects.filter({ id: request.params.id }).first();
  if (!post) return notFound('Post not found');
  return render(request, 'post_detail.html', { post });
}

function postCreate(request) {
  if (request.method === 'POST') {
    const post = new Post({ title: request.POST.title, body: request.POST.body, published: true });
    post.save();
    return redirect(`/posts/${post.id}/`);
  }
  return render(request, 'post_form.html', {});
}

// A JSON API endpoint alongside the HTML views, like DRF would add.
function postListJson() {
  const posts = Post.objects.orderBy('-createdAt').all();
  return JsonResponse(posts.map((p) => p.toJSON()));
}

module.exports = { postList, postDetail, postCreate, postListJson };

const test = require('node:test');
const assert = require('node:assert/strict');
const { connect } = require('../core/orm/db');
const { migrate } = require('../core/orm/migrations');
const { Model } = require('../core/orm/model');
const { CharField, IntegerField, BooleanField } = require('../core/orm/fields');
const { path, include, Resolver } = require('../core/router');

connect(':memory:');

class Widget extends Model {
  static fields = {
    name: new CharField({ maxLength: 100 }),
    stock: new IntegerField({ default: 0 }),
    active: new BooleanField({ default: true }),
  };
}
Widget.register();
migrate();

test('save() inserts and assigns an id', () => {
  const w = new Widget({ name: 'Gizmo', stock: 5 });
  w.save();
  assert.ok(w.id > 0);
});

test('save() again updates the existing row', () => {
  const w = new Widget({ name: 'Gadget', stock: 1 });
  w.save();
  const id = w.id;
  w.stock = 99;
  w.save();
  assert.equal(w.id, id);
  const reloaded = Widget.objects.get({ id });
  assert.equal(reloaded.stock, 99);
});

test('filter() + orderBy() + all()', () => {
  new Widget({ name: 'A', stock: 10 }).save();
  new Widget({ name: 'B', stock: 20 }).save();
  const results = Widget.objects.filter({ stock__gte: 10 }).orderBy('-stock').all();
  assert.ok(results.length >= 2);
  assert.ok(results[0].stock >= results[1].stock);
});

test('count() and delete()', () => {
  const before = Widget.objects.count();
  const w = new Widget({ name: 'Temp', stock: 1 });
  w.save();
  assert.equal(Widget.objects.count(), before + 1);
  w.delete();
  assert.equal(Widget.objects.count(), before);
});

test('router resolves params and reverses names', () => {
  const view = () => {};
  const urls = [
    path('widgets/', view, 'widget-list'),
    path('widgets/<int:id>/', view, 'widget-detail'),
  ];
  const resolver = new Resolver(urls);
  const match = resolver.resolve('/widgets/42/');
  assert.equal(match.params.id, 42);
  assert.equal(match.name, 'widget-detail');
  assert.equal(resolver.reverse('widget-detail', { id: 7 }), '/widgets/7/');
});

test('router supports include() with prefixes', () => {
  const view = () => {};
  const nested = [path('detail/', view, 'nested-detail')];
  const urls = [path('app/', include(nested))];
  const resolver = new Resolver(urls);
  assert.ok(resolver.resolve('/app/detail/'));
  assert.equal(resolver.resolve('/nowhere/'), null);
});

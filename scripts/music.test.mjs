import test from 'node:test';
import assert from 'node:assert/strict';
import { adjacentTrack, formatAudioTime } from '../src/music-transport.js';
import { windingCapacity, windingRadius, tapeTangentAngle } from '../src/cassette/tape-geometry.js';

test('full tape fits either reel and stays clear of both guide rollers', () => {
  const hub = .615, max = 2.02, total = windingCapacity(hub, max);
  for (const progress of [0, .001, .1, .25, .5, .75, .9, .999, 1]) {
    const left = windingRadius(total * (1 - progress), hub), right = windingRadius(total * progress, hub);
    assert.ok(left <= max + 1e-9 && right <= max + 1e-9);
    assert.ok(Math.hypot(.37, 2.72) > Math.max(left, right) + .085);
    assert.ok(Math.abs(Math.PI * (left ** 2 + right ** 2 - 2 * hub ** 2) - total) < 1e-8);
    for (const [side, radius] of [[-1, left], [1, right]]) {
      const c = { x: side * 2.15, z: -.3 }, g = { x: side * 1.78, z: 2.42 };
      const r = radius - .015, gr = .1, angle = tapeTangentAngle(c, r, g, side, gr);
      const nx = Math.cos(angle), nz = Math.sin(angle);
      const dx = g.x + nx * gr - (c.x + nx * r), dz = g.z + nz * gr - (c.z + nz * r);
      assert.ok(Math.abs(dx * nx + dz * nz) < 1e-8, 'free tape span must meet both circles tangentially');
    }
  }
});

test('music transport wraps both ends of the selected playlist', () => {
  const queue = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(adjacentTrack(queue, 'a', -1).id, 'c');
  assert.equal(adjacentTrack(queue, 'c', 1).id, 'a');
  assert.equal(adjacentTrack(queue, 'b', -1).id, 'a');
  assert.equal(adjacentTrack(queue, 'outside', 1).id, 'a');
  assert.equal(adjacentTrack(queue, 'outside', -1).id, 'c');
  assert.equal(adjacentTrack([], 'a'), null);
  assert.equal(adjacentTrack([{ id: 'a' }], 'a').id, 'a');
});
test('shuffle avoids the current track; previous remains deterministic', () => {
  const queue = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(adjacentTrack(queue, 'b', 1, true, () => 0).id, 'a');
  assert.equal(adjacentTrack(queue, 'b', 1, true, () => .99).id, 'c');
  assert.equal(adjacentTrack(queue, 'b', -1, true).id, 'a');
  assert.equal(adjacentTrack([{ id: 'a' }], 'a', 1, true).id, 'a');
});
test('audio times handle missing metadata, paused seeks and longer tracks', () => {
  assert.equal(formatAudioTime(NaN), '00:00');
  assert.equal(formatAudioTime(Infinity), '00:00');
  assert.equal(formatAudioTime(-10), '00:00');
  assert.equal(formatAudioTime(75.9), '01:15');
  assert.equal(formatAudioTime(3601), '60:01');
});

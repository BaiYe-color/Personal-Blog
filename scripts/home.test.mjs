import test from 'node:test';
import assert from 'node:assert/strict';
import { WheelStepGate, compassDirection, nearestAngle } from '../src/home.js';

test('large wheel gestures and their momentum only turn one layer', () => {
  const gate = new WheelStepGate();
  assert.equal(gate.consume(1600, 0), 1);
  for (let time = 50; time <= 1500; time += 50) assert.equal(gate.consume(120, time), 0);
  assert.equal(gate.consume(80, 1800), 1);
});
test('small trackpad deltas accumulate and direction changes reset them', () => {
  const gate = new WheelStepGate();
  assert.equal(gate.consume(20, 0), 0);
  assert.equal(gate.consume(-20, 50), 0);
  assert.equal(gate.consume(-20, 100), -1);
});
test('transition lock rejects fast repeated gestures, then accepts a fresh gesture', () => {
  const gate = new WheelStepGate();
  assert.equal(gate.consume(100, 0), 1);
  assert.equal(gate.consume(100, 300), 0);
  assert.equal(gate.consume(100, 1000), 1);
});
test('compass angles map clockwise to north, east, south, west', () => {
  assert.deepEqual([0, 90, 180, 270, 360, -90, -180].map(compassDirection), [0, 1, 2, 3, 0, 3, 2]);
  assert.equal(compassDirection(44), 0);
  assert.equal(compassDirection(46), 1);
});
test('needle takes the short path across north in both directions', () => {
  assert.equal(nearestAngle(270, 0), 360);
  assert.equal(nearestAngle(0, 270), -90);
  assert.equal(nearestAngle(-350, 0), -360);
});

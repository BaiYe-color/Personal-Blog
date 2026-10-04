import test from 'node:test';
import assert from 'node:assert/strict';
import { beijingClock, geometricWord } from '../src/home-clock.js';

test('Beijing midnight rolls to the next date independently of browser timezone', () => {
  const before = beijingClock(new Date('2026-09-30T15:59:59Z'));
  const after = beijingClock(new Date('2026-09-30T16:00:00Z'));
  assert.equal(before.dateKey, '2026-09-30'); assert.equal(before.time, '11:59 PM');
  assert.equal(after.dateKey, '2026-10-01'); assert.equal(after.time, '12:00 AM');
  assert.equal(after.month, 'OCTOBER'); assert.equal(after.festival, '国庆节');
  assert.equal(after.dateTime, '2026-10-01T00:00:00+08:00');
});
test('12-hour noon and a normal day have correct display values', () => {
  const value = beijingClock(new Date('2026-10-04T04:05:00Z'));
  assert.equal(value.day, '04'); assert.equal(value.time, '12:05 PM'); assert.equal(value.festival, '');
});
test('lunar festivals and variable length New Year Eve are detected', () => {
  assert.equal(beijingClock(new Date('2026-02-16T04:00:00Z')).festival, '除夕');
  assert.equal(beijingClock(new Date('2026-02-17T04:00:00Z')).festival, '春节');
  assert.equal(beijingClock(new Date('2026-09-25T04:00:00Z')).festival, '中秋节');
  assert.equal(beijingClock(new Date('2020-10-01T04:00:00Z')).festival, '国庆节 · 中秋节');
});
test('solar-term festival and site-specific anniversaries can be displayed', () => {
  assert.equal(beijingClock(new Date('2026-04-05T04:00:00Z')).festival, '清明节');
  assert.equal(beijingClock(new Date('2026-10-04T04:00:00Z'), { '2026-10-04': '小站生日' }).festival, '小站生日');
});
test('all twelve English month names have a complete local glyph set', () => {
  for (let month = 0; month < 12; month++) {
    const name = beijingClock(new Date(Date.UTC(2026, month, 4))).month;
    assert.equal((geometricWord(name).match(/<path /g) || []).length, name.length);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import calendar from '../data/calendar.json' with { type: 'json' };
import questions from '../data/questions.json' with { type: 'json' };
import {
  getCloseDateKey,
  getComboPercent,
  getQuizCloseAt,
  getSpeedBonusPercent,
  isConsecutiveQuizDate,
  isQuizOpen,
} from '../src/rules.js';
import { validateData } from '../src/validate-data.js';
import { getQuizProgress } from '../src/data.js';

test('question bank matches the complete calendar', () => {
  assert.deepEqual(validateData(calendar, questions), []);
  assert.equal(Object.keys(questions).length, 50);
  assert.equal(Object.values(questions).reduce((sum, quiz) => sum + quiz.questions.length, 0), 305);
});

test('normal quiz closes next day and Friday quiz closes Monday', () => {
  const normal = calendar.schedule.find((entry) => entry.date === '2026-07-16');
  const friday = calendar.schedule.find((entry) => entry.date === '2026-07-17');
  assert.equal(getCloseDateKey(normal), '2026-07-17');
  assert.equal(getCloseDateKey(friday), '2026-07-20');
  assert.equal(getQuizCloseAt(friday, 'Asia/Bangkok').toISOString(), '2026-07-20T09:59:59.000Z');
  assert.equal(isQuizOpen(friday, 'Asia/Bangkok', new Date('2026-07-20T09:59:59Z')), true);
  assert.equal(isQuizOpen(friday, 'Asia/Bangkok', new Date('2026-07-20T10:00:00Z')), false);
});

test('combo continues across weekends and configured holidays', () => {
  assert.equal(isConsecutiveQuizDate('2026-07-17', '2026-07-20', calendar.schedule), true);
  assert.equal(isConsecutiveQuizDate('2026-07-27', '2026-07-30', calendar.schedule), true);
  assert.equal(isConsecutiveQuizDate('2026-07-24', '2026-07-30', calendar.schedule), false);
});

test('speed and combo tiers come from calendar configuration', () => {
  assert.equal(getSpeedBonusPercent(60, calendar.speed_bonus), 100);
  assert.equal(getSpeedBonusPercent(61, calendar.speed_bonus), 75);
  assert.equal(getSpeedBonusPercent(43201, calendar.speed_bonus), 0);
  assert.equal(getComboPercent(1, calendar.combo_bonus), 0);
  assert.equal(getComboPercent(5, calendar.combo_bonus), 15);
  assert.equal(getComboPercent(30, calendar.combo_bonus), 30);
});

test('validator reports malformed questions', () => {
  const broken = structuredClone(questions);
  broken['2026-07-15'].questions[0].choices.pop();
  assert.match(validateData(calendar, broken).join('\n'), /must have exactly 4 choices/);
});

test('quiz progress counts active quiz days and excludes holidays', () => {
  assert.deepEqual(getQuizProgress('2026-07-15'), { current: 1, total: 50, remaining: 49 });
  assert.deepEqual(getQuizProgress('2026-07-30'), { current: 10, total: 50, remaining: 40 });
  assert.equal(getQuizProgress('2026-07-28'), null);
  assert.deepEqual(getQuizProgress('2026-09-25'), { current: 50, total: 50, remaining: 0 });
});

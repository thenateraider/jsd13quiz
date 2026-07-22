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
import { buildQuestion } from '../src/quiz-ui.js';

test('question bank matches the complete calendar', () => {
  assert.deepEqual(validateData(calendar, questions), []);
  assert.equal(Object.keys(questions).length, 55);
  assert.equal(Object.values(questions).reduce((sum, quiz) => sum + quiz.questions.length, 0), 345);
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
  assert.deepEqual(getQuizProgress('2026-07-15'), { current: 1, total: 55, remaining: 54 });
  assert.deepEqual(getQuizProgress('2026-07-30'), { current: 10, total: 55, remaining: 45 });
  assert.equal(getQuizProgress('2026-07-28'), null);
  assert.deepEqual(getQuizProgress('2026-09-25'), { current: 50, total: 55, remaining: 5 });
  assert.deepEqual(getQuizProgress('2026-10-02'), { current: 55, total: 55, remaining: 0 });
});

test('refreshed question prompts are unique from 22 July onward', () => {
  const prompts = Object.entries(questions)
    .filter(([date]) => date >= '2026-07-22')
    .flatMap(([, quiz]) => quiz.questions.map((question) => question.prompt));
  assert.equal(new Set(prompts).size, prompts.length);
});

test('refreshed question bank does not recycle generic answer choices', () => {
  const choices = Object.entries(questions)
    .filter(([date]) => date >= '2026-07-22')
    .flatMap(([, quiz]) => quiz.questions.flatMap((question) => question.choices));
  const banned = [
    'เลือกวิธีที่คุ้นเคยที่สุดทันที โดยไม่อ่าน requirement',
    'ตรวจเฉพาะ happy path แล้วถือว่างานเสร็จ',
    'ข้ามการ review เพราะโค้ดรันบนเครื่องผู้เขียนได้',
  ];
  for (const choice of banned) assert.equal(choices.includes(choice), false);
});

test('every refreshed question has four distinct choices', () => {
  for (const [date, quiz] of Object.entries(questions)) {
    if (date < '2026-07-22') continue;
    for (const question of quiz.questions) {
      assert.equal(new Set(question.choices).size, 4, `${date}: duplicated choice in one question`);
    }
  }
});

test('refreshed questions contain no generic concept-definition fallbacks', () => {
  const fallbackPatterns = [
    /แนวคิด .+ ที่ต้องเชื่อมกับ requirement/,
    /คำอธิบาย .+ ที่ชี้ส่วนประกอบ/,
    /ข้อตกลงเรื่อง .+ ที่ระบุผู้รับผิดชอบ/,
    /การจัดการ .+ จากหลักฐาน/,
    /การทำ .+ แบบทำซ้ำได้/,
    /การสื่อสารเรื่อง .+ ด้วยข้อเท็จจริง/,
    /ข้อกำหนดที่ทำให้ทีมตกลงขอบเขตของ/,
    /การเตรียม .+ ให้มีลำดับ/,
  ];
  for (const [date, quiz] of Object.entries(questions)) {
    if (date < '2026-07-22') continue;
    for (const question of quiz.questions) {
      const text = [question.prompt, ...question.choices, question.explanation].join('\n');
      for (const pattern of fallbackPatterns) {
        assert.doesNotMatch(text, pattern, `${date}: generic fallback found`);
      }
    }
  }
});

test('question UI keeps full choices in embed and uses short answer buttons', () => {
  const longHtml = '<main><section><h1>ข้อความตัวอย่างที่ยาวเกินความยาวของปุ่ม Discord</h1></section></main>';
  const payload = buildQuestion('2026-07-15', 0, {
    prompt: 'เลือกโค้ดที่ถูกต้อง',
    choices: [longHtml, '<div>', '<span>', '<b>'],
    points: 20,
  }, 5);
  assert.match(payload.embeds[0].data.fields[0].value, /```html/);
  assert.match(payload.embeds[0].data.fields[0].value, /ข้อความตัวอย่าง/);
  assert.match(payload.embeds[0].data.fields[0].value, /────────────/);
  assert.doesNotMatch(payload.embeds[0].data.fields[3].value, /────────────/);
  assert.deepEqual(payload.components[0].components.map((button) => button.data.label), ['A', 'B', 'C', 'D']);
});

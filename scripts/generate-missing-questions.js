import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const calendar = JSON.parse(fs.readFileSync(path.join(root, 'data/calendar.json'), 'utf8'));
const outputPath = path.join(root, 'data/questions.json');
const bank = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

const genericDistractors = [
  'การเลือกสีโลโก้โดยไม่ดูความต้องการผู้ใช้',
  'การเก็บรหัสผ่านไว้ใน source code',
  'การแก้ production โดยไม่ตรวจ log',
  'การรวมทุก feature ไว้ใน function เดียว',
  'การข้าม test เพื่อให้ deploy เร็วขึ้น',
];

function buildQuestion(entry, index, points) {
  const focus = entry.focus[index % entry.focus.length];
  const otherFocus = entry.focus.filter((item) => item !== focus);
  const correctIndex = index % 4;
  const correct = `${focus} ในบริบทของ ${entry.topic}`;
  const distractors = [...otherFocus.slice(0, 2).map((item) => `${item} ที่ไม่เกี่ยวกับโจทย์นี้`), ...genericDistractors]
    .filter((item) => item !== correct)
    .slice(0, 3);
  const choices = [...distractors];
  choices.splice(correctIndex, 0, correct);
  const styles = [
    `ข้อใดตรงกับหัวข้อสำคัญของ ${entry.topic} มากที่สุด?`,
    `หากกำลังทบทวน ${entry.topic} แนวคิดใดควรนำมาใช้ในสถานการณ์นี้?`,
    `ทีมต้องการประยุกต์ ${entry.topic} อย่างถูกต้อง ควรให้ความสำคัญกับข้อใด?`,
    `ข้อใดเป็น learning objective ที่อยู่ในบท ${entry.topic}?`,
    `แนวทางใดสัมพันธ์กับ ${entry.topic} และเป้าหมายเรื่อง ${focus}?`,
  ];
  return {
    prompt: `${styles[index % styles.length]} (ข้อ ${index + 1})`,
    choices,
    correctIndex,
    explanation: `${focus} เป็นหนึ่งในหัวข้อที่กำหนดไว้สำหรับ ${entry.topic}`,
    points,
  };
}

for (const entry of calendar.schedule) {
  if (entry.skip || bank[entry.date]) continue;
  const base = Math.floor(entry.base_score / entry.questions);
  const remainder = entry.base_score - base * entry.questions;
  bank[entry.date] = {
    title: entry.topic,
    questions: Array.from({ length: entry.questions }, (_, index) =>
      buildQuestion(entry, index, base + (index < remainder ? 1 : 0))),
  };
}

fs.writeFileSync(outputPath, `${JSON.stringify(bank, null, 2)}\n`, 'utf8');
console.log(`Question bank now contains ${Object.keys(bank).length} quiz days.`);

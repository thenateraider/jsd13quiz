import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(dirname, '../data');

export const calendar = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'calendar.json'), 'utf8'),
);

export const questionBank = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'questions.json'), 'utf8'),
);

export function getCalendarEntry(dateKey) {
  return calendar.schedule.find((entry) => entry.date === dateKey) ?? null;
}

export function getQuiz(dateKey) {
  return questionBank[dateKey] ?? null;
}

export function getQuizProgress(dateKey) {
  const activeDates = calendar.schedule.filter((entry) => !entry.skip).map((entry) => entry.date);
  const index = activeDates.indexOf(dateKey);
  if (index === -1) return null;
  return {
    current: index + 1,
    total: activeDates.length,
    remaining: activeDates.length - index - 1,
  };
}

export function saveQuiz(dateKey, quiz) {
  questionBank[dateKey] = quiz;
  fs.writeFileSync(
    path.join(dataDir, 'questions.json'),
    `${JSON.stringify(questionBank, null, 2)}\n`,
    'utf8',
  );
}

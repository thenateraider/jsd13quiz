import { pathToFileURL } from 'node:url';
import { calendar, questionBank } from './data.js';

export function validateData(calendarData = calendar, questions = questionBank) {
  const errors = [];
  const seen = new Set();
  for (const entry of calendarData.schedule ?? []) {
    if (seen.has(entry.date)) errors.push(`${entry.date}: duplicate calendar date`);
    seen.add(entry.date);
    const quiz = questions[entry.date];
    if (entry.skip) {
      if (quiz) errors.push(`${entry.date}: holiday must not have a quiz`);
      continue;
    }
    if (!quiz || !Array.isArray(quiz.questions)) {
      errors.push(`${entry.date}: missing quiz`);
      continue;
    }
    if (!quiz.title?.trim()) errors.push(`${entry.date}: missing title`);
    if (quiz.questions.length !== entry.questions) {
      errors.push(`${entry.date}: expected ${entry.questions} questions, got ${quiz.questions.length}`);
    }
    let points = 0;
    quiz.questions.forEach((question, index) => {
      const label = `${entry.date} question ${index + 1}`;
      if (!question.prompt?.trim()) errors.push(`${label}: missing prompt`);
      if (!question.explanation?.trim()) errors.push(`${label}: missing explanation`);
      if (!Array.isArray(question.choices) || question.choices.length !== 4) {
        errors.push(`${label}: must have exactly 4 choices`);
      }
      if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) {
        errors.push(`${label}: invalid correctIndex`);
      }
      if (!Number.isFinite(question.points) || question.points <= 0) errors.push(`${label}: invalid points`);
      points += Number(question.points) || 0;
    });
    if (points !== entry.base_score) errors.push(`${entry.date}: expected ${entry.base_score} points, got ${points}`);
  }
  for (const date of Object.keys(questions)) {
    if (!seen.has(date)) errors.push(`${date}: quiz date is not in calendar`);
  }
  return errors;
}

export function assertValidData(calendarData = calendar, questions = questionBank) {
  const errors = validateData(calendarData, questions);
  if (errors.length) throw new Error(`Invalid trivia data:\n- ${errors.join('\n- ')}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const errors = validateData();
  if (errors.length) {
    console.error(`Data validation failed (${errors.length}):\n- ${errors.join('\n- ')}`);
    process.exitCode = 1;
  } else {
    console.log(`Data valid: ${calendar.schedule.filter((entry) => !entry.skip).length} quizzes checked.`);
  }
}

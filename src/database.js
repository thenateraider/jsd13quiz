import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calendar, getCalendarEntry } from './data.js';
import { getComboPercent, isConsecutiveQuizDate } from './rules.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(dirname, '../data/trivia.sqlite');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS quiz_posts (
    date_key TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    published_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quiz_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_key TEXT NOT NULL,
    user_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    current_index INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    earned_base INTEGER NOT NULL DEFAULT 0,
    finished_at TEXT,
    UNIQUE(date_key, user_id)
  );

  CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_key TEXT NOT NULL,
    user_id TEXT NOT NULL,
    question_index INTEGER NOT NULL,
    selected_index INTEGER NOT NULL,
    is_correct INTEGER NOT NULL,
    base_points INTEGER NOT NULL,
    answered_at TEXT NOT NULL,
    UNIQUE(date_key, user_id, question_index)
  );

  CREATE TABLE IF NOT EXISTS user_stats (
    user_id TEXT PRIMARY KEY,
    total_xp INTEGER NOT NULL DEFAULT 0,
    current_combo INTEGER NOT NULL DEFAULT 0,
    longest_combo INTEGER NOT NULL DEFAULT 0,
    last_passed_date TEXT,
    total_correct INTEGER NOT NULL DEFAULT 0,
    total_answered INTEGER NOT NULL DEFAULT 0
  );
`);

const sessionColumns = new Set(db.pragma('table_info(quiz_sessions)').map((column) => column.name));
for (const [name, definition] of [
  ['total_questions', 'INTEGER'], ['passed', 'INTEGER'], ['perfect', 'INTEGER'],
  ['total_xp', 'INTEGER'], ['extra_xp', 'INTEGER NOT NULL DEFAULT 0'],
]) {
  if (!sessionColumns.has(name)) db.exec(`ALTER TABLE quiz_sessions ADD COLUMN ${name} ${definition}`);
}

export function saveQuizPost(dateKey, channelId, messageId, publishedAt) {
  db.prepare(`
    INSERT INTO quiz_posts(date_key, channel_id, message_id, published_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(date_key) DO UPDATE SET
      channel_id = excluded.channel_id,
      message_id = excluded.message_id,
      published_at = excluded.published_at
  `).run(dateKey, channelId, messageId, publishedAt);
}

export function getQuizPost(dateKey) {
  return db.prepare('SELECT * FROM quiz_posts WHERE date_key = ?').get(dateKey);
}

export function getOrCreateSession(dateKey, userId) {
  db.prepare(`
    INSERT OR IGNORE INTO quiz_sessions(date_key, user_id, started_at)
    VALUES (?, ?, ?)
  `).run(dateKey, userId, new Date().toISOString());

  return db.prepare(`
    SELECT * FROM quiz_sessions WHERE date_key = ? AND user_id = ?
  `).get(dateKey, userId);
}

export function recordAnswer({ dateKey, userId, questionIndex, selectedIndex, isCorrect, basePoints }) {
  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO answers(
        date_key, user_id, question_index, selected_index,
        is_correct, base_points, answered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      dateKey, userId, questionIndex, selectedIndex,
      isCorrect ? 1 : 0, basePoints, new Date().toISOString(),
    );

    db.prepare(`
      UPDATE quiz_sessions
      SET current_index = current_index + 1,
          correct_count = correct_count + ?,
          earned_base = earned_base + ?
      WHERE date_key = ? AND user_id = ?
    `).run(isCorrect ? 1 : 0, isCorrect ? basePoints : 0, dateKey, userId);
  });

  transaction();
  return getOrCreateSession(dateKey, userId);
}

export function finishSession({ dateKey, userId, totalQuestions, speedBonusPercent, elapsedSeconds }) {
  const session = getOrCreateSession(dateKey, userId);
  if (session.finished_at) {
    return db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId);
  }

  const passed = (session.correct_count / totalQuestions) * 100 >= 60;
  const perfect = session.correct_count === totalQuestions;

  let stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId);
  if (!stats) {
    db.prepare('INSERT INTO user_stats(user_id) VALUES (?)').run(userId);
    stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId);
  }

  let nextCombo = stats.current_combo;
  if (passed) {
    const isConsecutive =
      !stats.last_passed_date ||
      isConsecutiveQuizDate(stats.last_passed_date, dateKey, calendar.schedule);
    nextCombo = isConsecutive ? stats.current_combo + 1 : 1;
  } else {
    nextCombo = 0;
  }

  const speedXp = Math.round(session.earned_base * speedBonusPercent / 100);
  const beforeCombo = session.earned_base + speedXp;
  const comboXp = passed
    ? Math.round(beforeCombo * getComboPercent(nextCombo, calendar.combo_bonus) / 100)
    : 0;
  const perfectXp = perfect
    ? Math.round(session.earned_base * calendar.extra_bonuses.perfect_quiz_percent / 100)
    : 0;

  const entry = getCalendarEntry(dateKey);
  const earlierPerfect = db.prepare(`
    SELECT 1 FROM quiz_sessions
    WHERE date_key = ? AND finished_at IS NOT NULL AND perfect = 1 LIMIT 1
  `).get(dateKey);
  const previous = db.prepare(`
    SELECT passed FROM quiz_sessions
    WHERE user_id = ? AND date_key < ? AND finished_at IS NOT NULL
    ORDER BY date_key DESC LIMIT 1
  `).get(userId, dateKey);
  const weekDates = calendar.schedule
    .filter((item) => !item.skip && item.week === entry.week && item.date <= dateKey)
    .map((item) => item.date);
  const completedThisWeek = db.prepare(`
    SELECT date_key, passed, perfect FROM quiz_sessions
    WHERE user_id = ? AND date_key IN (${weekDates.map(() => '?').join(',') || "''"}) AND finished_at IS NOT NULL
  `).all(userId, ...weekDates);
  const priorByDate = new Map(completedThisWeek.map((item) => [item.date_key, item]));
  priorByDate.set(dateKey, { passed: passed ? 1 : 0, perfect: perfect ? 1 : 0 });
  const weekComplete = entry.weekly_final && weekDates.every((date) => priorByDate.get(date)?.passed);
  const weekPerfect = entry.weekly_final && weekDates.every((date) => priorByDate.get(date)?.perfect);

  const bonuses = {
    firstFullScore: perfect && !earlierPerfect ? calendar.extra_bonuses.first_full_score_xp : 0,
    fridaySurvivor: weekComplete ? calendar.extra_bonuses.friday_survivor_xp : 0,
    weeklyPerfect: weekPerfect ? calendar.extra_bonuses.weekly_perfect_xp : 0,
    comeback: passed && previous?.passed === 0 ? calendar.extra_bonuses.comeback_xp : 0,
    fastAndAccurate: passed && session.correct_count / totalQuestions >= 0.8 && elapsedSeconds <= 300
      ? calendar.extra_bonuses.fast_and_accurate_xp : 0,
  };
  const extraXp = Object.values(bonuses).reduce((sum, value) => sum + value, 0);
  const totalXp = session.earned_base + speedXp + comboXp + perfectXp + extraXp;

  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE quiz_sessions SET finished_at = ?, total_questions = ?, passed = ?, perfect = ?,
        total_xp = ?, extra_xp = ? WHERE date_key = ? AND user_id = ?
    `).run(new Date().toISOString(), totalQuestions, passed ? 1 : 0, perfect ? 1 : 0,
      totalXp, extraXp, dateKey, userId);

    db.prepare(`
      UPDATE user_stats
      SET total_xp = total_xp + ?,
          current_combo = ?,
          longest_combo = MAX(longest_combo, ?),
          last_passed_date = CASE WHEN ? THEN ? ELSE last_passed_date END,
          total_correct = total_correct + ?,
          total_answered = total_answered + ?
      WHERE user_id = ?
    `).run(
      totalXp,
      nextCombo,
      nextCombo,
      passed ? 1 : 0,
      dateKey,
      session.correct_count,
      totalQuestions,
      userId,
    );
  });

  transaction();

  return {
    stats: db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId),
    result: {
      passed,
      perfect,
      baseXp: session.earned_base,
      speedXp,
      comboXp,
      perfectXp,
      extraXp,
      bonuses,
      totalXp,
      correct: session.correct_count,
      total: totalQuestions,
      combo: nextCombo,
    },
  };
}

export function getProfile(userId) {
  return db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId) ?? {
    user_id: userId,
    total_xp: 0,
    current_combo: 0,
    longest_combo: 0,
    total_correct: 0,
    total_answered: 0,
  };
}

export function getUserRank(userId) {
  return db.prepare(`
    SELECT rank FROM (
      SELECT user_id, RANK() OVER (ORDER BY total_xp DESC, total_correct DESC) AS rank
      FROM user_stats
    ) WHERE user_id = ?
  `).get(userId)?.rank ?? null;
}

export function getLeaderboard(limit = null) {
  const sql = `
    SELECT *, RANK() OVER (ORDER BY total_xp DESC, total_correct DESC) AS rank
    FROM user_stats ORDER BY total_xp DESC, total_correct DESC
  `;
  return limit === null ? db.prepare(sql).all() : db.prepare(`${sql} LIMIT ?`).all(limit);
}

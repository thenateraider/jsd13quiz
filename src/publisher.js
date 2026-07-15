import { getCalendarEntry, getQuiz, getQuizProgress } from './data.js';
import { getQuizPost, saveQuizPost } from './database.js';
import { buildPublicQuiz } from './quiz-ui.js';

export async function publishQuiz(client, channelId, dateKey, { force = false } = {}) {
  const entry = getCalendarEntry(dateKey);
  if (!entry) throw new Error(`Calendar entry not found for ${dateKey}`);
  if (entry.skip) return { skipped: true, reason: entry.topic };

  const quiz = getQuiz(dateKey);
  if (!quiz?.questions?.length) {
    throw new Error(`Question bank is empty for ${dateKey}`);
  }

  const existingPost = getQuizPost(dateKey);
  if (!force && existingPost) {
    return { skipped: true, reason: 'already-posted' };
  }

  const channel = await client.channels.fetch(channelId);
  if (!channel?.isTextBased()) throw new Error('QUIZ_CHANNEL_ID is not a text channel');

  const message = await channel.send(buildPublicQuiz(entry, quiz, getQuizProgress(dateKey)));
  // Reposting must not reset the speed-bonus clock.
  saveQuizPost(dateKey, channel.id, message.id, existingPost?.published_at ?? new Date().toISOString());

  return { skipped: false, message };
}

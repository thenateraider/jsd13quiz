import { EmbedBuilder } from 'discord.js';
import { config } from './config.js';
import { calendar, getCalendarEntry, getQuiz, questionBank, saveQuiz } from './data.js';
import {
  finishSession,
  getLeaderboard,
  getOrCreateSession,
  getProfile,
  getQuizPost,
  getUserRank,
  recordAnswer,
} from './database.js';
import { publishQuiz } from './publisher.js';
import { buildQuestion } from './quiz-ui.js';
import { elapsedSeconds, getDateKey } from './time.js';
import { getQuizCloseAt, getSpeedBonusPercent, isQuizOpen } from './rules.js';
import { validateData } from './validate-data.js';

function resultEmbed(result) {
  return new EmbedBuilder()
    .setTitle(result.passed ? '✅ ผ่าน Daily Quiz!' : '❌ ยังไม่ผ่าน')
    .setDescription([
      `ตอบถูก: **${result.correct}/${result.total}**`,
      `Base XP: **${result.baseXp}**`,
      `Speed Bonus: **+${result.speedXp}**`,
      `Combo Bonus: **+${result.comboXp}**`,
      `Perfect Bonus: **+${result.perfectXp}**`,
      `Extra Bonus: **+${result.extraXp}**`,
      `รวมรอบนี้: **${result.totalXp} XP**`,
      `🔥 Current Combo: **${result.combo} วัน**`,
      `🏅 อันดับปัจจุบัน: **${result.rank ? `#${result.rank}` : 'ยังไม่มีอันดับ'}**`,
    ].join('\n'));
}

export async function handleInteraction(interaction) {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'profile') {
      const stats = getProfile(interaction.user.id);
      const rank = getUserRank(interaction.user.id);
      const accuracy = stats.total_answered
        ? Math.round(stats.total_correct / stats.total_answered * 100)
        : 0;

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`📊 Profile — ${interaction.user.displayName}`)
            .setDescription([
              `XP: **${stats.total_xp}**`,
              `🔥 Current Combo: **${stats.current_combo}**`,
              `🏅 Longest Combo: **${stats.longest_combo}**`,
              `🎯 Accuracy: **${accuracy}%**`,
              `🏅 อันดับปัจจุบัน: **${rank ? `#${rank}` : 'ยังไม่มีอันดับ'}**`,
            ].join('\n')),
        ],
        ephemeral: true,
      });
    }

    if (interaction.commandName === 'leaderboard') {
      const rows = getLeaderboard();
      const lines = rows.length
        ? rows.map((row) => `${row.rank}. <@${row.user_id}> — **${row.total_xp} XP** 🔥${row.current_combo}`)
        : ['ยังไม่มีคะแนน'];
      const pages = [];
      let page = '';
      for (const line of lines) {
        if (page && page.length + line.length + 1 > 3800) {
          pages.push(page);
          page = '';
        }
        page += `${page ? '\n' : ''}${line}`;
      }
      pages.push(page);
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle('🏆 JSD13 Leaderboard — ทุกคน').setDescription(pages[0])],
      });
      for (let index = 1; index < pages.length; index += 1) {
        await interaction.followUp({
          embeds: [new EmbedBuilder().setTitle(`🏆 JSD13 Leaderboard (${index + 1}/${pages.length})`).setDescription(pages[index])],
        });
      }
      return;
    }

    if (interaction.commandName === 'quiz-today') {
      const dateKey = getDateKey(config.timezone);
      const post = getQuizPost(dateKey);
      if (!post) {
        return interaction.reply({ content: 'วันนี้ยังไม่มี Quiz ที่ถูกโพสต์', ephemeral: true });
      }

      return interaction.reply({
        content: `เปิด Quiz วันนี้: https://discord.com/channels/${interaction.guildId}/${post.channel_id}/${post.message_id}`,
        ephemeral: true,
      });
    }

    if (interaction.commandName === 'quiz-post') {
      const dateKey = interaction.options.getString('date', true);
      const repost = interaction.options.getBoolean('repost') ?? false;
      await interaction.deferReply({ ephemeral: true });

      try {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error('วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD');
        const result = await publishQuiz(
          interaction.client,
          config.quizChannelId,
          dateKey,
          { force: repost },
        );
        return interaction.editReply(
          result.skipped ? `ข้าม: ${result.reason}` : `โพสต์ Quiz ${dateKey} แล้ว`,
        );
      } catch (error) {
        return interaction.editReply(`โพสต์ไม่สำเร็จ: ${error.message}`);
      }
    }

    if (interaction.commandName === 'quiz-import') {
      const dateKey = interaction.options.getString('date', true);
      const attachment = interaction.options.getAttachment('file', true);
      await interaction.deferReply({ ephemeral: true });
      try {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error('วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD');
        if (!getCalendarEntry(dateKey) || getCalendarEntry(dateKey).skip) throw new Error('วันที่นี้ไม่ใช่วัน Quiz');
        if (attachment.size > 1_000_000) throw new Error('ไฟล์ต้องมีขนาดไม่เกิน 1 MB');
        const response = await fetch(attachment.url);
        if (!response.ok) throw new Error(`ดาวน์โหลดไฟล์ไม่สำเร็จ (${response.status})`);
        const imported = JSON.parse(await response.text());
        const quiz = imported[dateKey] ?? imported;
        const candidate = { ...questionBank, [dateKey]: quiz };
        const errors = validateData(calendar, candidate);
        if (errors.length) throw new Error(errors.slice(0, 8).join('\n'));
        saveQuiz(dateKey, quiz);
        return interaction.editReply(`นำเข้า Quiz ${dateKey} สำเร็จ (${quiz.questions.length} ข้อ)`);
      } catch (error) {
        return interaction.editReply(`นำเข้าไม่สำเร็จ: ${error.message}`);
      }
    }
  }

  if (!interaction.isButton()) return;

  const [namespace, action, dateKey, questionIndexRaw, selectedIndexRaw] =
    interaction.customId.split(':');

  if (namespace !== 'quiz') return;
  const quiz = getQuiz(dateKey);
  const entry = getCalendarEntry(dateKey);

  if (!quiz?.questions?.length) {
    return interaction.reply({ content: 'ไม่พบชุดคำถามของวันนี้', ephemeral: true });
  }

  if (!entry || !isQuizOpen(entry, config.timezone)) {
    const closedAt = entry ? getQuizCloseAt(entry, config.timezone).toLocaleString('th-TH', { timeZone: config.timezone }) : '';
    return interaction.reply({ content: `Quiz นี้ปิดรับคำตอบแล้ว${closedAt ? ` (${closedAt})` : ''}`, ephemeral: true });
  }

  if (action === 'start') {
    const session = getOrCreateSession(dateKey, interaction.user.id);

    if (session.finished_at) {
      return interaction.reply({ content: 'คุณทำ Quiz วันนี้เสร็จแล้ว', ephemeral: true });
    }

    const index = session.current_index;
    const question = quiz.questions[index];

    return interaction.reply(buildQuestion(dateKey, index, question, quiz.questions.length));
  }

  if (action === 'answer') {
    const questionIndex = Number(questionIndexRaw);
    const selectedIndex = Number(selectedIndexRaw);
    const session = getOrCreateSession(dateKey, interaction.user.id);

    if (session.finished_at) {
      return interaction.reply({ content: 'Quiz นี้ถูกส่งเรียบร้อยแล้ว', ephemeral: true });
    }

    if (questionIndex !== session.current_index) {
      return interaction.reply({
        content: 'คำตอบนี้เก่าหรือถูกกดซ้ำ กรุณาใช้คำถามล่าสุด',
        ephemeral: true,
      });
    }

    const question = quiz.questions[questionIndex];
    const isCorrect = selectedIndex === question.correctIndex;

    try {
      const updated = recordAnswer({
        dateKey,
        userId: interaction.user.id,
        questionIndex,
        selectedIndex,
        isCorrect,
        basePoints: question.points,
      });

      const feedback = isCorrect
        ? `✅ ถูกต้อง — ${question.explanation}`
        : `❌ ยังไม่ถูก — ${question.explanation}`;

      if (updated.current_index < quiz.questions.length) {
        const next = quiz.questions[updated.current_index];
        const payload = buildQuestion(
          dateKey,
          updated.current_index,
          next,
          quiz.questions.length,
        );

        payload.content = feedback;
        return interaction.update(payload);
      }

      const post = getQuizPost(dateKey);
      const seconds = post
        ? elapsedSeconds(post.published_at)
        : elapsedSeconds(updated.started_at);
      const speedBonusPercent = getSpeedBonusPercent(seconds, calendar.speed_bonus);

      const completed = finishSession({
        dateKey,
        userId: interaction.user.id,
        totalQuestions: quiz.questions.length,
        speedBonusPercent,
        elapsedSeconds: seconds,
      });
      completed.result.rank = getUserRank(interaction.user.id);

      return interaction.update({
        content: feedback,
        embeds: [resultEmbed(completed.result)],
        components: [],
      });
    } catch (error) {
      if (String(error.message).includes('UNIQUE constraint failed')) {
        return interaction.reply({
          content: 'คำถามนี้ถูกตอบไปแล้ว กรุณาใช้คำถามล่าสุด',
          ephemeral: true,
        });
      }
      throw error;
    }
  }
}

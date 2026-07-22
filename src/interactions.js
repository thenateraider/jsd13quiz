import { EmbedBuilder } from 'discord.js';
import { config } from './config.js';
import { calendar, getCalendarEntry, getQuiz, questionBank, saveQuiz } from './data.js';
import {
  finishSession,
  getAnswers,
  getLeaderboard,
  getOrCreateSession,
  getProfile,
  getQuizPost,
  getSession,
  getUserRank,
  recordAnswer,
} from './database.js';
import { publishQuiz } from './publisher.js';
import { buildQuestion } from './quiz-ui.js';
import { elapsedSeconds, getDateKey } from './time.js';
import {
  getComboPercent,
  getQuizCloseAt,
  getSpeedBonusPercent,
  isQuizOpen,
} from './rules.js';
import { validateData } from './validate-data.js';

function buildLeaderboardEmbed(rows) {
  const rankIcon = (rank) => ['🥇 ', '🥈 ', '🥉 '][rank - 1] ?? '';
  const lines = rows.map((row) => {
    const comboPercent = getComboPercent(row.current_combo, calendar.combo_bonus);
    const accuracy = row.total_answered
      ? Math.round(row.total_correct / row.total_answered * 100)
      : 0;
    return `${rankIcon(row.rank)}**#${row.rank}** <@${row.user_id}>\n> ⭐ **${row.total_xp} XP**  •  🎯 **${accuracy}%**  •  🔥**${row.current_combo} วัน** (**+${comboPercent}% XP**)`;
  });

  return new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('🏆 JSD#13 Leaderboard')
    .setDescription([
      '### 📖 วิธีอ่าน Leaderboard',
      '🥇🥈🥉 **Top 3**  •  ⭐ **XP สะสม**',
      '🎯 **Accuracy** = เปอร์เซ็นต์คำตอบที่ตอบถูกทั้งหมด',
      '🔥 **Combo** = จำนวนวันที่ผ่าน Quiz ต่อเนื่อง',
      '➕ **เปอร์เซ็นต์** = Bonus XP ที่ได้รับจาก Combo',
      '',
      '### 📊 อันดับผู้เล่น',
      ...lines,
    ].join('\n'))
    .setFooter({ text: `ผู้เล่นทั้งหมด ${rows.length} คน` });
}

function accuracyBar(accuracy) {
  const filled = Math.round(accuracy / 10);
  return `${'🟩'.repeat(filled)}${'⬛'.repeat(10 - filled)}`;
}

function buildProfileEmbed(interaction, stats, rank, accuracy) {
  const rankText = rank ? `#${rank}` : 'ยังไม่มีอันดับ';
  const comboPercent = getComboPercent(stats.current_combo, calendar.combo_bonus);
  const longestComboPercent = getComboPercent(stats.longest_combo, calendar.combo_bonus);

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({
      name: interaction.user.displayName,
      iconURL: interaction.user.displayAvatarURL(),
    })
    .setTitle('📊 PLAYER PROFILE')
    .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
    .setDescription(`🏆 **อันดับปัจจุบัน ${rankText}**`)
    .addFields(
      {
        name: '⭐ XP สะสม',
        value: `## ${stats.total_xp}`,
        inline: true,
      },
      {
        name: '🔥 Combo ปัจจุบัน',
        value: `## ${stats.current_combo} วัน\n**+${comboPercent}% XP**`,
        inline: true,
      },
      {
        name: '🏅 Combo สูงสุด',
        value: `## ${stats.longest_combo} วัน\nสูงสุด **+${longestComboPercent}% XP**`,
        inline: true,
      },
      {
        name: `🎯 Accuracy — ${accuracy}%`,
        value: `${accuracyBar(accuracy)}\nตอบถูก **${stats.total_correct}** จาก **${stats.total_answered}** ข้อ`,
      },
    )
    .setFooter({ text: 'Combo = จำนวนวันที่ผ่าน Quiz ต่อเนื่อง • วันหยุดไม่ทำให้ Combo ขาด' });
}

function buildHelpEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🤖 JSD13 Trivia — วิธีใช้งาน')
    .setDescription('ตอบ Quiz ประจำวัน เก็บ XP ทำ Combo และแข่งขันกับเพื่อนใน Leaderboard!')
    .addFields(
      {
        name: '🎮 เริ่มเล่น',
        value: [
          '`/quiz-today` เปิดโพสต์ Quiz ของวันนี้',
          '`/quiz-status` เช็กเวลาและสถานะการเล่นของคุณ',
          'กดปุ่ม **เริ่มทำ Quiz** ใต้โพสต์ แล้วเลือกคำตอบ A–D',
        ].join('\n'),
      },
      {
        name: '📊 คะแนนและอันดับ',
        value: [
          '`/profile` ดู XP, อันดับ, Combo และ Accuracy',
          '`/leaderboard` ดูอันดับผู้เล่นทั้งหมด',
          '`/rules` ดูกติกาและ Bonus ที่ได้รับ',
        ].join('\n'),
      },
      {
        name: '💡 เคล็ดลับ',
        value: 'ตอบเร็วเพื่อรับ Speed Bonus และเล่นผ่านต่อเนื่องเพื่อเพิ่ม Combo Bonus 🔥',
      },
    )
    .setFooter({ text: 'คำตอบและผลลัพธ์ของ Quiz จะแสดงแบบส่วนตัว' });
}

function formatDuration(seconds) {
  if (seconds === null) return 'หลังจาก 12 ชั่วโมง';
  if (seconds < 60) return `ภายใน ${seconds} วินาที`;
  if (seconds < 3600) return `ภายใน ${seconds / 60} นาที`;
  return `ภายใน ${seconds / 3600} ชั่วโมง`;
}

function buildRulesEmbed() {
  const speedTiers = calendar.speed_bonus
    .map((tier) => `⚡ ${formatDuration(tier.max_elapsed_seconds)} — **+${tier.bonus_percent}%**`)
    .join('\n');
  const comboTiers = calendar.combo_bonus
    .map((tier) => `🔥 ${tier.minimum_days} วัน — **+${tier.bonus_percent}%**`)
    .join('\n');
  const extras = calendar.extra_bonuses;

  return new EmbedBuilder()
    .setColor(0xF39C12)
    .setTitle('📜 กติกาและระบบคะแนน')
    .setDescription(`ต้องตอบถูกอย่างน้อย **${calendar.pass_threshold_percent}%** จึงจะผ่านและรักษา Combo`)
    .addFields(
      {
        name: '⭐ XP พื้นฐาน',
        value: 'ตอบถูกจะได้รับ XP ตามคะแนนของแต่ละข้อ ตอบผิดไม่ได้ XP ของข้อนั้น',
      },
      {
        name: '⚡ Speed Bonus',
        value: speedTiers,
        inline: true,
      },
      {
        name: '🔥 Combo Bonus',
        value: comboTiers,
        inline: true,
      },
      {
        name: '🎁 Bonus พิเศษ',
        value: [
          `💯 ตอบถูกทุกข้อ — **+${extras.perfect_quiz_percent}%** ของ Base XP`,
          `🥇 Full Score คนแรก — **+${extras.first_full_score_xp} XP**`,
          `🛡️ ผ่านครบสัปดาห์ — **+${extras.friday_survivor_xp} XP**`,
          `✨ Perfect ครบสัปดาห์ — **+${extras.weekly_perfect_xp} XP**`,
          `🔄 กลับมาผ่านหลังไม่ผ่าน — **+${extras.comeback_xp} XP**`,
          `🚀 ถูกอย่างน้อย 80% ภายใน 5 นาที — **+${extras.fast_and_accurate_xp} XP**`,
        ].join('\n'),
      },
      {
        name: '🗓️ การรักษา Combo',
        value: 'วันเสาร์–อาทิตย์และวันหยุดที่กำหนดไว้จะไม่ทำให้ Combo ขาด',
      },
    )
    .setFooter({ text: 'XP รวม = Base + Speed + Combo + Perfect + Bonus พิเศษ' });
}

function buildQuizStatusEmbed(dateKey, entry, quiz, post, session) {
  const closeAt = entry ? getQuizCloseAt(entry, config.timezone) : null;
  const open = entry && !entry.skip && quiz?.questions?.length && isQuizOpen(entry, config.timezone);
  let status = '⚪ วันนี้ไม่มี Quiz';
  let color = 0x95A5A6;

  if (entry && !entry.skip && !post) {
    status = '🟡 Quiz วันนี้ยังไม่ถูกโพสต์';
    color = 0xF1C40F;
  } else if (open && post) {
    status = '🟢 Quiz กำลังเปิด';
    color = 0x2ECC71;
  } else if (entry && !entry.skip && post) {
    status = '🔴 Quiz ปิดรับคำตอบแล้ว';
    color = 0xE74C3C;
  }

  let playerStatus = '⚪ ยังไม่ได้เริ่ม';
  if (session?.finished_at) {
    playerStatus = `${session.passed ? '✅ ผ่านแล้ว' : '❌ ยังไม่ผ่าน'}\n⭐ ได้รับ **${session.total_xp ?? 0} XP** • ตอบถูก **${session.correct_count}/${session.total_questions}**`;
  } else if (session) {
    playerStatus = `🟡 กำลังทำอยู่ • ข้อ **${session.current_index + 1}/${quiz.questions.length}**`;
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`📅 Quiz Status — ${dateKey}`)
    .setDescription(`## ${status}`)
    .addFields(
      {
        name: '📚 หัวข้อ',
        value: entry?.topic ?? 'ไม่มี Quiz ในวันนี้',
        inline: true,
      },
      {
        name: '👤 สถานะของคุณ',
        value: playerStatus,
        inline: true,
      },
    );

  if (entry && !entry.skip && closeAt) {
    const unix = Math.floor(closeAt.getTime() / 1000);
    embed.addFields({
      name: '⏰ ปิดรับคำตอบ',
      value: `<t:${unix}:F>\n<t:${unix}:R>`,
    });
  }
  if (post) {
    embed.addFields({
      name: '🔗 ไปยัง Quiz',
      value: `[เปิด Quiz วันนี้](https://discord.com/channels/${config.guildId}/${post.channel_id}/${post.message_id})`,
    });
  }

  return embed;
}

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

function answerReviewEmbeds(quiz, answers) {
  const answerByQuestion = new Map(answers.map((answer) => [answer.question_index, answer]));
  const lines = quiz.questions.map((question, index) => {
    const answer = answerByQuestion.get(index);
    if (!answer) return `⚪ **ข้อ ${index + 1}** — ไม่มีคำตอบ`;
    if (answer.is_correct) return `✅ **ข้อ ${index + 1}** — ตอบถูก`;

    const selected = question.choices[answer.selected_index] ?? 'ไม่พบตัวเลือก';
    const correct = question.choices[question.correctIndex];
    return [
      `❌ **ข้อ ${index + 1}** — ${question.prompt}`,
      `คุณตอบ: **${String(selected)}**`,
      `คำตอบที่ถูก: **${String(correct)}**`,
      `เหตุผล: ${question.explanation}`,
    ].join('\n');
  });

  const groups = [];
  let current = '';
  for (const line of lines) {
    const candidate = current ? `${current}\n\n${line}` : line;
    if (candidate.length > 3800 && current) {
      groups.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }
  if (current) groups.push(current);

  return groups.map((description, index) => new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(index === 0 ? '📝 สรุปคำตอบรายข้อ' : '📝 สรุปคำตอบ (ต่อ)')
    .setDescription(description));
}

export async function handleInteraction(interaction) {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'help') {
      return interaction.reply({ embeds: [buildHelpEmbed()], ephemeral: true });
    }

    if (interaction.commandName === 'rules') {
      return interaction.reply({ embeds: [buildRulesEmbed()], ephemeral: true });
    }

    if (interaction.commandName === 'quiz-status') {
      const dateKey = getDateKey(config.timezone);
      const entry = getCalendarEntry(dateKey);
      const quiz = getQuiz(dateKey);
      const post = getQuizPost(dateKey);
      const session = getSession(dateKey, interaction.user.id);
      return interaction.reply({
        embeds: [buildQuizStatusEmbed(dateKey, entry, quiz, post, session)],
        ephemeral: true,
      });
    }

    if (interaction.commandName === 'profile') {
      const stats = getProfile(interaction.user.id);
      const rank = getUserRank(interaction.user.id);
      const accuracy = stats.total_answered
        ? Math.round(stats.total_correct / stats.total_answered * 100)
        : 0;

      return interaction.reply({
        embeds: [buildProfileEmbed(interaction, stats, rank, accuracy)],
        ephemeral: true,
      });
    }

    if (interaction.commandName === 'leaderboard') {
      const rows = getLeaderboard();
      if (!rows.length) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setTitle('🏆 JSD13 Leaderboard').setDescription('ยังไม่มีคะแนน')],
        });
      }

      await interaction.reply({
        embeds: [buildLeaderboardEmbed(rows)],
      });
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
      return interaction.reply({
        content: 'คุณทำ Quiz วันนี้เสร็จแล้ว — ดูสรุปคำตอบย้อนหลังได้ด้านล่าง',
        embeds: answerReviewEmbeds(quiz, getAnswers(dateKey, interaction.user.id)),
        ephemeral: true,
      });
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
        embeds: [
          resultEmbed(completed.result),
          ...answerReviewEmbeds(quiz, getAnswers(dateKey, interaction.user.id)),
        ],
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

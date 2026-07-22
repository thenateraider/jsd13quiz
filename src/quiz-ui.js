import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';

const labels = ['A', 'B', 'C', 'D'];

function displayChoice(choice) {
  const text = String(choice);
  return /<[^>]+>/.test(text) ? `\`\`\`html\n${text}\n\`\`\`` : text;
}

export function buildPublicQuiz(entry, quiz, progress) {
  const progressText = progress.remaining === 0
    ? `📊 **Quiz วันที่ ${progress.current}/${progress.total} • วันสุดท้าย**`
    : `📊 **Quiz วันที่ ${progress.current}/${progress.total} • เหลืออีก ${progress.remaining} วัน Quiz ถึงวันสุดท้าย**`;
  const embed = new EmbedBuilder()
    .setTitle(`🎓 JSD13 Daily Challenge — ${quiz.title}`)
    .setDescription([
      `📅 **${entry.date}**`,
      `📚 Week ${entry.week}: ${entry.topic}`,
      `⭐ Difficulty: **${entry.difficulty}**`,
      `❓ ${quiz.questions.length} Questions`,
      `🏆 Base Score: **${entry.base_score} XP**`,
      progressText,
      '',
      '⚡ ตอบเร็วมี Speed Bonus สูงสุด +100%',
      '🔥 ผ่านอย่างน้อย 60% เพื่อรักษา Combo',
    ].join('\n'));

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`quiz:start:${entry.date}`)
      .setLabel('เริ่มทำ Quiz')
      .setEmoji('🚀')
      .setStyle(ButtonStyle.Primary),
  );

  return { embeds: [embed], components: [row] };
}

export function buildQuestion(dateKey, questionIndex, question, total) {
  const embed = new EmbedBuilder()
    .setTitle(`คำถาม ${questionIndex + 1}/${total}`)
    .setDescription(question.prompt)
    .addFields(question.choices.map((choice, index) => ({
      name: `${labels[index]}.`,
      value: `${displayChoice(choice)}${index < question.choices.length - 1 ? '\n────────────' : ''}`,
    })))
    .setFooter({ text: `คะแนนพื้นฐาน ${question.points} XP` });

  const row = new ActionRowBuilder().addComponents(
    question.choices.map((choice, index) =>
      new ButtonBuilder()
        .setCustomId(`quiz:answer:${dateKey}:${questionIndex}:${index}`)
        .setLabel(labels[index])
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return { embeds: [embed], components: [row], ephemeral: true };
}

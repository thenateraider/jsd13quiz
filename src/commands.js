import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('profile')
    .setDescription('ดู XP, Combo และ Accuracy ของคุณ'),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('ดูอันดับคะแนนสูงสุด'),

  new SlashCommandBuilder()
    .setName('quiz-today')
    .setDescription('เปิด Quiz ของวันนี้'),

  new SlashCommandBuilder()
    .setName('quiz-post')
    .setDescription('ให้แอดมินสั่งโพสต์ Quiz ตามวันที่')
    .addStringOption((option) =>
      option
        .setName('date')
        .setDescription('วันที่รูปแบบ YYYY-MM-DD')
        .setRequired(true),
    )
    .addBooleanOption((option) =>
      option
        .setName('repost')
        .setDescription('ยืนยันการโพสต์ซ้ำหากวันที่นี้เคยถูกโพสต์แล้ว'),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('quiz-import')
    .setDescription('นำเข้าหรือแก้ชุดคำถามของวันที่จากไฟล์ JSON')
    .addStringOption((option) =>
      option.setName('date').setDescription('วันที่รูปแบบ YYYY-MM-DD').setRequired(true),
    )
    .addAttachmentOption((option) =>
      option.setName('file').setDescription('ไฟล์ JSON ของ Quiz').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
].map((command) => command.toJSON());

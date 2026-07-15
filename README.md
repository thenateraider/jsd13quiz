# JSD13 Discord Daily Trivia Bot

Discord bot สำหรับ Junior Software Developer Programme Cohort 13

## ฟีเจอร์ใน Starter

- ส่ง Quiz อัตโนมัติ จันทร์–ศุกร์ เวลา 17:00 Asia/Bangkok
- แสดงสถานะ `Quiz วันที่ x/50` และจำนวนวัน Quiz ที่เหลือถึงวันสุดท้าย (ไม่นับวันหยุด)
- อ่านปฏิทินจาก `data/calendar.json`
- ปุ่มเริ่มทำ Quiz และตัวเลือก A–D แบบส่วนตัว
- เก็บคำตอบและคะแนนด้วย SQLite
- Speed Bonus หลังโพสต์คำถาม
- Combo จากวันที่ผ่าน Quiz ติดต่อกัน
- Perfect Bonus
- `/profile`
- `/leaderboard`
- `/quiz-today`
- `/quiz-post date:YYYY-MM-DD`
- `/quiz-import date:YYYY-MM-DD file:quiz.json` (Manage Server)
- มีคำถามตัวอย่างครบวันที่ 15–17 กรกฎาคม 2026

## 1. สิ่งที่ต้องติดตั้ง

- Node.js 20 หรือใหม่กว่า
- Discord account และ server ที่คุณมีสิทธิ์ Manage Server

ตรวจสอบ:

```bash
node -v
npm -v
```

## 2. สร้าง Discord Application

1. เปิด Discord Developer Portal
2. กด **New Application**
3. ตั้งชื่อ เช่น `JSD13 Daily Trivia`
4. เข้าเมนู **Bot**
5. กด Reset Token แล้วคัดลอก Token
6. ห้ามส่ง Token ให้คนอื่นและห้าม commit `.env`
7. เปิดเมนู **OAuth2 > URL Generator**
8. Scopes:
   - `bot`
   - `applications.commands`
9. Bot Permissions:
   - View Channels
   - Send Messages
   - Embed Links
   - Read Message History
10. เปิด URL ที่สร้าง แล้วเชิญบอทเข้า Server

บอทนี้ใช้เฉพาะ interaction จึงไม่จำเป็นต้องเปิด Message Content Intent

## 3. หา ID ที่ต้องใช้

เปิด Discord:

1. User Settings > Advanced > Developer Mode
2. คลิกขวา Server > Copy Server ID = `GUILD_ID`
3. คลิกขวา Channel สำหรับ Quiz > Copy Channel ID = `QUIZ_CHANNEL_ID`
4. Developer Portal > General Information > Application ID = `CLIENT_ID`

## 4. ติดตั้งโปรเจกต์

```bash
npm install
```

คัดลอก environment:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

กรอก `.env`:

```env
DISCORD_TOKEN=ใส่_bot_token
CLIENT_ID=ใส่_application_id
GUILD_ID=ใส่_server_id
QUIZ_CHANNEL_ID=ใส่_channel_id
TIMEZONE=Asia/Bangkok
DATABASE_PATH=
```

## 5. ลงทะเบียน Slash Commands

```bash
npm run deploy:commands
```

ควรเห็น:

```text
Deployed 5 guild commands.
```

## 6. เปิดบอท

โหมดพัฒนา:

```bash
npm run dev
```

หรือโหมดปกติ:

```bash
npm start
```

ควรเห็น:

```text
Logged in as ...
[scheduler] Active at 17:00 Monday-Friday (Asia/Bangkok)
```

## 7. ทดสอบโดยไม่ต้องรอ 17:00

ใน Discord ใช้:

```text
/quiz-post date:2026-07-15
```

จากนั้นกด **เริ่มทำ Quiz**

> คำสั่ง `/quiz-post` ต้องมีสิทธิ์ Manage Server

## 8. เพิ่มคำถามวันอื่น

แก้ `data/questions.json`

รูปแบบ:

```json
{
  "2026-07-20": {
    "title": "CSS Fundamentals",
    "questions": [
      {
        "prompt": "คำถาม...",
        "choices": ["A", "B", "C", "D"],
        "correctIndex": 0,
        "explanation": "คำอธิบายหลังตอบ",
        "points": 20
      }
    ]
  }
}
```

กฎสำคัญ:

- `correctIndex` เริ่มจาก 0
- A = 0, B = 1, C = 2, D = 3
- ควรมีตัวเลือก 4 ข้อ
- คะแนนรวมควรตรงกับ `base_score` ใน calendar
- วันปกติ 5 ข้อ
- วันศุกร์ 10 ข้อ
- วันศุกร์สุดท้าย 25 กันยายน 10 ข้อ

## 9. การคิดคะแนนใน Starter

- ตอบถูกจึงได้รับ base points ของข้อนั้น
- Speed Bonus คำนวณจากเวลาที่โพสต์ Quiz ถึงเวลาทำเสร็จ
- ผ่านเมื่อถูกอย่างน้อย 60%
- ผ่านต่อเนื่องทำให้ Combo เพิ่ม
- Perfect Quiz ได้โบนัส 20%
- Speed Bonus:
  - ≤1 นาที +100%
  - ≤5 นาที +75%
  - ≤15 นาที +50%
  - ≤30 นาที +35%
  - ≤1 ชั่วโมง +25%
  - ≤3 ชั่วโมง +15%
  - ≤6 ชั่วโมง +10%
  - ≤12 ชั่วโมง +5%
  - >12 ชั่วโมง +0%

## 10. สถานะความพร้อมก่อนใช้จริง

Starter นี้พร้อมทดสอบ แต่ควรเพิ่มต่อ:

ทำแล้ว: ระบบปิดรับคำตอบ, กติกาวันศุกร์, Holiday-aware Combo, Extra Bonus,
data validation, ป้องกันโพสต์ซ้ำ, backup และ automated tests

สิ่งที่ขึ้นกับการใช้งานจริงและ infrastructure:

1. ตรวจทานเนื้อหาคำถามที่สร้างจาก calendar โดยผู้สอนก่อนเปิดใช้
2. ใช้ `/quiz-import` สำหรับเพิ่มหรือเขียนทับชุดคำถามของวัน โดยระบบจะ validate ก่อนบันทึก
3. Deploy บน VPS/Railway/Render ที่ process ทำงานตลอดเวลาและมี persistent disk
4. ตั้ง scheduled backup และทดลอง restore ตามรอบการดูแลระบบ

## 11. เครื่องมือดูแลข้อมูล

ตรวจ calendar และคลังคำถามทั้งหมดก่อน deploy:

```bash
npm run validate:data
```

เติมชุดคำถามที่ยังขาดจาก `topic` และ `focus` ใน calendar (จะไม่เขียนทับชุดเดิม):

```bash
npm run questions:fill
```

สำรอง SQLite แบบ online backup ที่ปลอดภัยกับ WAL:

```bash
npm run backup
```

ไฟล์จะอยู่ใน `data/backups/` และไม่ถูก commit โดย Git

รัน automated tests:

```bash
npm test
```

### เงื่อนไข Extra Bonus

- First Full Score +30 XP: ผู้เล่นคนแรกที่ตอบถูกทุกข้อของ Quiz วันนั้น
- Friday Survivor +50 XP: ผ่าน Quiz ที่เปิดจริงครบทุกวันของสัปดาห์ เมื่อจบ Weekly Final
- Weekly Perfect +100 XP: ตอบถูกทุกข้อของ Quiz ที่เปิดจริงครบทั้งสัปดาห์
- Comeback +20 XP: Quiz ครั้งก่อนหน้าไม่ผ่าน และครั้งปัจจุบันผ่าน
- Fast & Accurate +40 XP: ตอบถูกอย่างน้อย 80% และทำเสร็จภายใน 5 นาทีหลังโพสต์

Quiz วันปกติปิดเวลา 16:59:59 ของวันถัดไป ส่วน Quiz วันศุกร์ปิดเวลา
16:59:59 ของวันจันทร์ตาม `TIMEZONE` การโพสต์ซ้ำไม่เริ่มเวลา Speed Bonus ใหม่

## โครงสร้าง

```text
jsd13-discord-trivia-bot/
├─ data/
│  ├─ calendar.json
│  └─ questions.json
├─ src/
│  ├─ commands.js
│  ├─ config.js
│  ├─ data.js
│  ├─ database.js
│  ├─ deploy-commands.js
│  ├─ index.js
│  ├─ interactions.js
│  ├─ publisher.js
│  ├─ quiz-ui.js
│  ├─ scheduler.js
│  └─ time.js
├─ .env.example
├─ .gitignore
├─ package.json
└─ README.md
```

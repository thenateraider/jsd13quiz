import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const calendarPath = path.join(root, 'data/calendar.json');
const outputPath = path.join(root, 'data/questions.json');
const calendar = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
const bank = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
const refreshFrom = process.env.REFRESH_FROM ?? null;

const promptStyles = [
  (topic, focus) => `ข้อใดอธิบายบทบาทของ “${focus}” ในหัวข้อ ${topic} ได้ถูกต้องที่สุด?`,
  (topic, focus) => `ทีมกำลังทำงานเรื่อง ${topic} และต้องตัดสินใจเกี่ยวกับ “${focus}” ควรเริ่มอย่างไร?`,
  (topic, focus) => `ระหว่าง code review ในหัวข้อ ${topic} ข้อสังเกตใดเกี่ยวกับ “${focus}” มีเหตุผลที่สุด?`,
  (topic, focus) => `หากผลลัพธ์ของ “${focus}” ไม่เป็นไปตามที่คาดในงาน ${topic} ขั้นตอนแรกที่เหมาะสมคืออะไร?`,
  (topic, focus) => `ข้อใดเป็นหลักฐานที่ดีที่สุดว่าทีมประยุกต์ “${focus}” ในงาน ${topic} อย่างเข้าใจ?`,
  (topic, focus) => `สถานการณ์ใดสะท้อนการใช้ “${focus}” ใน ${topic} ได้เหมาะสมที่สุด?`,
  (topic, focus) => `ก่อนส่งงาน ${topic} ทีมควรตรวจอะไรเกี่ยวกับ “${focus}” มากที่สุด?`,
  (topic, focus) => `ถ้าต้องอธิบาย “${focus}” ในหัวข้อ ${topic} ให้เพื่อนร่วมทีมฟัง คำอธิบายใดน่าเชื่อถือที่สุด?`,
  (topic, focus) => `แนวทางใดช่วยลดความเสี่ยงเมื่อใช้ “${focus}” ในงาน ${topic}?`,
  (topic, focus) => `โจทย์ของผู้ใช้เปลี่ยนระหว่างทำ ${topic} ทีมควรจัดการ “${focus}” อย่างไร?`,
  (topic, focus) => `ข้อใดเป็นการตัดสินใจที่ตรวจสอบย้อนกลับได้เกี่ยวกับ “${focus}” ใน ${topic}?`,
  (topic, focus) => `เมื่อจับคู่ requirement กับ “${focus}” ใน ${topic} ข้อใดควรเกิดขึ้น?`,
  (topic, focus) => `ทีมพบข้อผิดพลาดที่เกี่ยวข้องกับ “${focus}” ใน ${topic} วิธีแก้ใดรอบคอบที่สุด?`,
  (topic, focus) => `ข้อใดแยกการใช้ “${focus}” ที่ดีออกจากการใช้ตามความเคยชินในหัวข้อ ${topic}?`,
  (topic, focus) => `หลังทำ ${topic} เสร็จ ทีมควรสรุปบทเรียนเรื่อง “${focus}” แบบใด?`,
  (topic, focus) => `หากมีเวลาจำกัดในงาน ${topic} ทีมควรให้ความสำคัญกับ “${focus}” อย่างไร?`,
  (topic, focus) => `ตัวเลือกใดทำให้การตัดสินใจเรื่อง “${focus}” ใน ${topic} วัดผลได้?`,
  (topic, focus) => `ข้อใดเป็นคำถามที่ควรถามก่อนลงมือใช้ “${focus}” ใน ${topic}?`,
  (topic, focus) => `ทีมสองคนเห็นต่างเรื่อง “${focus}” ใน ${topic} ควรหาข้อสรุปด้วยวิธีใด?`,
  (topic, focus) => `ข้อใดเป็นผลลัพธ์ที่คาดหวังได้จากการใช้ “${focus}” ใน ${topic} อย่างถูกต้อง?`,
];

const goodPractices = [
  (focus) => `ระบุเป้าหมายของ ${focus} ให้ชัด แล้วตรวจผลด้วยตัวอย่างหรือ test ที่ทำซ้ำได้`,
  (focus) => `เชื่อม ${focus} กับ requirement ของผู้ใช้ พร้อมบันทึกเหตุผลของการตัดสินใจ`,
  (focus) => `ทดลอง ${focus} ในขอบเขตเล็ก ตรวจผลจริง แล้วค่อยปรับหรือขยาย`,
  (focus) => `แยกความรับผิดชอบของ ${focus} ให้ชัด และตรวจทั้งกรณีปกติกับกรณีผิดพลาด`,
  (focus) => `ใช้ข้อมูลจากโค้ด test log หรือ feedback เพื่อยืนยันว่า ${focus} แก้โจทย์ได้จริง`,
];

const distractors = [
  'เลือกวิธีที่คุ้นเคยที่สุดทันที โดยไม่อ่าน requirement',
  'เปลี่ยนหลายส่วนพร้อมกันและไม่บันทึกว่าแก้อะไรไปบ้าง',
  'ตรวจเฉพาะ happy path แล้วถือว่างานเสร็จ',
  'คัดลอกวิธีจากโปรเจกต์อื่นมาใช้โดยไม่ดูบริบท',
  'ซ่อน error เพื่อให้หน้าจอดูเหมือนทำงานได้',
  'รวมทุกความรับผิดชอบไว้จุดเดียวเพื่อให้ไฟล์น้อยลง',
  'ข้ามการ review เพราะโค้ดรันบนเครื่องผู้เขียนได้',
  'ตัดสินจากความเห็นของคนเดียวโดยไม่ทดลองกับข้อมูลจริง',
];

const codeQuestions = [
  {
    match: /Responsive|CSS/i,
    prompt: 'โค้ดใดทำให้ layout เปลี่ยนเป็น 2 คอลัมน์เมื่อ viewport กว้างอย่างน้อย 768px?',
    choices: ['@media (min-width: 768px) { .grid { grid-template-columns: 1fr 1fr; } }', '@media (max-height: 768px) { .grid { display: none; } }', '.grid { width: 768px !important; }', '<media min-width="768">'],
    correctIndex: 0,
    explanation: 'media query แบบ min-width เหมาะกับ mobile-first และกฎภายในจะทำงานเมื่อ viewport กว้างตั้งแต่ 768px ขึ้นไป',
  },
  {
    match: /Conditionals|Loops/i,
    prompt: 'โค้ดใดคืนค่าเฉพาะเลขคู่จาก nums โดยไม่แก้ Array เดิม?',
    choices: ['nums.filter((n) => n % 2 === 0)', 'nums.map((n) => n % 2)', 'nums.forEach((n) => n === 2)', 'nums.push(2)'],
    correctIndex: 0,
    explanation: 'filter สร้าง Array ใหม่จากสมาชิกที่ callback คืนค่า true และเงื่อนไข n % 2 === 0 ตรวจเลขคู่',
  },
  {
    match: /Objects|Higher-Order|Advanced JavaScript/i,
    prompt: 'ผลลัพธ์ของ `[1, 2, 3].reduce((sum, n) => sum + n, 0)` คืออะไร?',
    choices: ['6', '[1, 2, 3]', '3', 'undefined'],
    correctIndex: 0,
    explanation: 'reduce เริ่ม accumulator ที่ 0 แล้วบวก 1, 2 และ 3 ตามลำดับ จึงได้ 6',
  },
  {
    match: /Asynchronous JavaScript/i,
    prompt: 'โค้ดใดจัดการทั้งผลสำเร็จและ error ของ Promise ด้วย async/await ได้เหมาะสม?',
    choices: ['try { const data = await load(); } catch (error) { handle(error); }', 'const data = await load().error;', 'await try load();', 'const data = load(); if (data.error) throw data;'],
    correctIndex: 0,
    explanation: 'await ควรอยู่ใน async function และใช้ try/catch เพื่อรับ rejection หรือ error ที่เกิดระหว่างรอผล',
  },
  {
    match: /Prototype|OOP|Code Reading/i,
    prompt: 'ใน `class User { constructor(name) { this.name = name; } }` คำว่า `this.name` หมายถึงอะไร?',
    choices: ['property ของ instance ที่กำลังถูกสร้าง', 'ตัวแปร global ชื่อ name', 'property ของ Array', 'ชื่อ class ใหม่'],
    correctIndex: 0,
    explanation: 'this อ้างถึง instance ปัจจุบัน และ constructor กำหนดค่า parameter name ให้ property name ของ instance นั้น',
  },
  {
    match: /DOM/i,
    prompt: 'โค้ดใดผูก click handler ให้ปุ่มที่มี id="save"?',
    choices: ["document.querySelector('#save').addEventListener('click', save)", "document.getElement('save').on('click', save)", "document.querySelector('save').click = save()", "window.addEventListener('#save', save)"],
    correctIndex: 0,
    explanation: 'querySelector ใช้ # สำหรับ id และ addEventListener รับชื่อ event กับ callback โดยไม่เรียก callback ทันที',
  },
  {
    match: /React Router/i,
    prompt: 'React Router route ใดรับค่า userId จาก path `/users/42`?',
    choices: ["<Route path=\"/users/:userId\" element={<User />} />", "<Route path=\"/users/userId\" value={42} />", "<Link parameter=\"userId\" />", "<Router get=\"/users/{userId}\" />"],
    correctIndex: 0,
    explanation: ':userId ประกาศ dynamic segment ซึ่ง component User อ่านได้ด้วย useParams()',
  },
  {
    match: /Context API/i,
    prompt: 'โค้ดใดอ่านค่าจาก ThemeContext ภายใน function component?',
    choices: ['const theme = useContext(ThemeContext)', 'const theme = ThemeContext.value()', 'const theme = useState(ThemeContext)', 'const theme = props.useContext()'],
    correctIndex: 0,
    explanation: 'useContext รับ context object และคืนค่าจาก Provider ที่ใกล้ component ที่สุด',
  },
  {
    match: /Axios|Web Integration/i,
    prompt: 'โค้ด Axios ใดส่ง POST พร้อม object ไปที่ `/api/users`?',
    choices: ["axios.post('/api/users', { name: 'Mina' })", "axios.get('/api/users', { name: 'Mina' })", "axios.post({ url: '/api/users' }).name('Mina')", "axios('/api/users').send.post('Mina')"],
    correctIndex: 0,
    explanation: 'axios.post รับ URL เป็น argument แรกและ request body เป็น argument ที่สอง',
  },
  {
    match: /useEffect|Async Integration/i,
    prompt: 'ใน useEffect ที่ subscribe event ควรคืนค่าอะไรเพื่อป้องกัน listener ค้าง?',
    choices: ['ฟังก์ชัน cleanup ที่ unsubscribe event', 'ค่า true', 'Promise จาก setState', 'component JSX อีกตัว'],
    correctIndex: 0,
    explanation: 'React เรียก cleanup ก่อน effect ทำงานใหม่และเมื่อ component unmount จึงใช้ยกเลิก subscription ได้',
  },
  {
    match: /Optimization/i,
    prompt: 'เมื่อใดการใช้ useMemo จึงสมเหตุสมผลที่สุด?',
    choices: ['เมื่อ calculation มีต้นทุนสูงและ dependencies เปลี่ยนไม่บ่อย', 'กับค่าคงที่ทุกตัวเสมอ', 'เพื่อแทน useEffect ทุกกรณี', 'เพื่อหยุด event propagation'],
    correctIndex: 0,
    explanation: 'useMemo cache ผลคำนวณระหว่าง render และคำนวณใหม่เมื่อ dependency เปลี่ยน จึงควรใช้เมื่อประโยชน์มากกว่าต้นทุนการ memoize',
  },
  {
    match: /JSX|React Recap|React Project|React Assessment/i,
    prompt: 'ใน React โค้ดใดอัปเดต count จากค่าล่าสุดอย่างปลอดภัยเมื่อ update อาจถูกรวมเป็น batch?',
    choices: ['setCount((current) => current + 1)', 'count = count + 1', 'setCount(count++)', 'useState(count + 1)'],
    correctIndex: 0,
    explanation: 'functional updater รับ state ล่าสุดจาก React จึงไม่พึ่งค่าจาก closure เก่า',
  },
  {
    match: /Node|Express|Middleware|Backend|API Design|Error Handling/i,
    prompt: 'Express route ใดอ่าน id จาก URL `/users/42` ได้ถูกต้อง?',
    choices: ["app.get('/users/:id', (req, res) => res.json({ id: req.params.id }))", "app.get('/users/id', (req) => req.id)", "app.use('/users/{id}', res.send(id))", "app.get('/users', req.params(42))"],
    correctIndex: 0,
    explanation: ':id ประกาศ route parameter และ Express เก็บค่าจริงไว้ใน req.params.id',
  },
  {
    match: /MongoDB|Mongoose/i,
    prompt: 'คำสั่ง Mongoose ใดค้นหา user หนึ่งคนจาก email?',
    choices: ['User.findOne({ email })', 'User.selectOne(email)', 'User.get(email).first()', 'User.query(email).single()'],
    correctIndex: 0,
    explanation: 'findOne รับ filter object และคืน document แรกที่ตรงเงื่อนไข หรือ null ถ้าไม่พบ',
  },
  {
    match: /PostgreSQL|Database/i,
    prompt: 'query แบบ parameterized ใดช่วยลดความเสี่ยง SQL injection?',
    choices: ["pool.query('SELECT * FROM users WHERE id = $1', [id])", "pool.query('SELECT * FROM users WHERE id = ' + id)", 'pool.query(`SELECT * FROM users WHERE id = ${id}`)', "pool.query('SELECT * FROM users WHERE id = id')"],
    correctIndex: 0,
    explanation: '$1 แยกโครงสร้าง SQL ออกจากค่าที่รับเข้ามา และ driver จะส่ง id เป็น parameter',
  },
  {
    match: /Testing/i,
    prompt: 'assertion ใดตรวจว่า status code ของ response เท่ากับ 200?',
    choices: ['assert.equal(response.status, 200)', 'assert(response.status = 200)', 'response.status => 200', 'assert.status(200 = response)'],
    correctIndex: 0,
    explanation: 'assert.equal เปรียบเทียบ actual กับ expected โดยไม่เปลี่ยนค่าของ response.status',
  },
];

function buildQuestion(entry, index, points) {
  if (index === 1) {
    const code = codeQuestions.find((item) => item.match.test(entry.topic));
    if (code) return { ...code, prompt: `${code.prompt} — ${entry.topic}`, points };
  }

  const focus = entry.focus[index % entry.focus.length];
  const correctIndex = (index * 3 + entry.week) % 4;
  const correct = goodPractices[index % goodPractices.length](focus);
  const wrong = [0, 1, 2].map((offset) => distractors[(index * 2 + offset) % distractors.length]);
  const choices = [...wrong];
  choices.splice(correctIndex, 0, correct);
  return {
    prompt: promptStyles[(entry.week * 3 + index) % promptStyles.length](entry.topic, focus),
    choices,
    correctIndex,
    explanation: `คำตอบนี้ถูกเพราะการใช้ ${focus} ต้องผูกกับเป้าหมายของงาน มีหลักฐานตรวจสอบผล และแก้ไขได้อย่างเป็นขั้นตอน ไม่ใช่ตัดสินจากความเคยชินเพียงอย่างเดียว`,
    points,
  };
}

for (const entry of calendar.schedule) {
  if (entry.skip) continue;
  if (!refreshFrom && bank[entry.date]) continue;
  if (refreshFrom && entry.date < refreshFrom) continue;
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

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

const exactDefinitions = new Map(`
media queries|กฎ CSS ที่เปิดใช้ style ตามเงื่อนไขของ viewport หรืออุปกรณ์
relative units|หน่วยอย่าง rem, em, %, vw ที่คำนวณขนาดเทียบกับค่าอ้างอิง
mobile-first design|ออกแบบจอเล็กก่อนแล้วเพิ่มความสามารถเมื่อพื้นที่หน้าจอกว้างขึ้น
fluid images|รูปภาพที่ย่อขยายตามพื้นที่ว่างโดยไม่ล้น container
user needs|ปัญหาและเป้าหมายจริงของผู้ใช้ที่งานออกแบบต้องตอบสนอง
prototype|แบบจำลองสำหรับทดลองแนวคิดและรับ feedback ก่อนสร้างของจริง
usability|ระดับที่ผู้ใช้ทำงานสำเร็จได้ง่าย ถูกต้อง และไม่สับสน
problem decomposition|แบ่งปัญหาใหญ่เป็นปัญหาย่อยที่เข้าใจและแก้ทีละส่วนได้
HTML|ภาษามาร์กอัปที่กำหนดโครงสร้างและความหมายของเนื้อหาเว็บ
CSS|ภาษาที่ควบคุมการนำเสนอ layout สี และรูปแบบของเอกสาร
responsive design|การออกแบบที่ปรับ layout และเนื้อหาให้เหมาะกับหลายขนาดหน้าจอ
UX/UI|UX ดูประสบการณ์ตลอดงาน ส่วน UI ดูองค์ประกอบที่ผู้ใช้โต้ตอบและมองเห็น
orientation to detail|ตรวจรายละเอียดเทียบ requirement อย่างเป็นระบบก่อนส่งงาน
documentation|ข้อมูลอ้างอิงที่อธิบาย API วิธีใช้ ข้อจำกัด และตัวอย่างที่เชื่อถือได้
technology evaluation|เปรียบเทียบเครื่องมือจาก requirement ข้อจำกัด ต้นทุน และความเสี่ยง
branching|แยกแนวการพัฒนาออกจาก branch หลักเพื่อทำและตรวจการเปลี่ยนแปลง
pull requests|คำขอรวม commit ที่เปิดให้ทีม review พูดคุย และตรวจ CI ก่อน merge
merge conflicts|ความขัดแย้งเมื่อ Git รวมการแก้ตำแหน่งเดียวกันโดยอัตโนมัติไม่ได้
team conventions|ข้อตกลงร่วมเรื่อง branch commit review และรูปแบบโค้ด
if/else|โครงสร้างควบคุมที่เลือกเส้นทางทำงานตามค่าความจริงของเงื่อนไข
loops|โครงสร้างที่ทำชุดคำสั่งซ้ำตามจำนวนหรือจนกว่าเงื่อนไขจะเปลี่ยน
nested data|object หรือ array ที่เก็บ object/array อีกชั้นและเข้าถึงเป็นลำดับ path
array transformations|การสร้างผลลัพธ์ใหม่จากสมาชิก เช่น map filter และ reduce
immutability basics|สร้างค่าใหม่แทนการแก้ object หรือ array ต้นฉบับโดยตรง
spread syntax|syntax ... ที่กระจายสมาชิกหรือ property เพื่อประกอบ array/object ใหม่
map|สร้าง array ใหม่ขนาดเท่าเดิมจากค่าที่ callback คืนให้สมาชิกแต่ละตัว
filter|สร้าง array ใหม่เฉพาะสมาชิกที่ callback คืนค่า true
reduce|รวมสมาชิกทั้งหมดเป็นผลลัพธ์เดียวด้วย accumulator
callbacks|ฟังก์ชันที่ส่งให้โค้ดอีกส่วนเรียกในเวลาหรือเงื่อนไขที่กำหนด
iteration protocols|ข้อตกลง Symbol.iterator ที่ทำให้ค่าใช้กับ for...of ได้
event loop|กลไกที่นำ callback จาก queue มาทำเมื่อ call stack ว่าง
promises|object แทนผล async ที่มีสถานะ pending fulfilled หรือ rejected
async/await|syntax สำหรับรอ Promise ใน async function และจัดลำดับโค้ดให้อ่านง่าย
error handling|การตรวจ ส่งต่อ และตอบสนองข้อผิดพลาดโดยไม่ซ่อนสาเหตุ
mutation|การเปลี่ยนค่าภายใน object หรือ array เดิมแทนการสร้างค่าใหม่
prototype chain|ลำดับ object ที่ JavaScript ไล่ค้นหา property เมื่อ instance ไม่มีเอง
classes|syntax สำหรับสร้าง constructor และ methods ที่ใช้ร่วมกันผ่าน prototype
encapsulation|ซ่อนรายละเอียดภายในและเปิด interface เท่าที่ผู้เรียกจำเป็นต้องใช้
inheritance|การให้ class หรือ object รับพฤติกรรมจากต้นแบบแล้วเพิ่มหรือปรับได้
DOM tree|โครงสร้าง object แบบต้นไม้ที่ browser สร้างจากเอกสาร HTML
selectors|รูปแบบที่ใช้ค้นหา element ตาม tag class id attribute หรือความสัมพันธ์
events|สัญญาณจากการโต้ตอบหรือ browser ที่ listener สามารถรับแล้วทำงานต่อ
element manipulation|อ่าน สร้าง แก้ หรือลบ node และ attribute ใน DOM
JSX|syntax คล้าย HTML ที่ถูกแปลงเป็นคำสั่งสร้าง React element
components|หน่วย UI ที่รับ input และคืน element tree เพื่อนำกลับมาใช้ซ้ำ
props|ข้อมูลแบบอ่านอย่างเดียวที่ parent ส่งให้ child component
component composition|ประกอบ UI ใหญ่จาก component เล็กผ่าน props และ children
useState|Hook ที่เก็บ state ของ component และให้ setter เพื่อขอ render ใหม่
effects|งานที่ประสาน React กับระบบภายนอกหลัง commit เช่น subscription
dependency arrays|รายการค่าที่กำหนดว่า effect หรือ memo ต้องคำนวณใหม่เมื่อใด
cleanup|ฟังก์ชันที่ยกเลิก timer listener หรือ subscription ก่อน effect รอบใหม่/unmount
data fetching|การร้องขอข้อมูลพร้อมจัดการ loading success error และการยกเลิก
routes|กฎจับคู่ URL กับ UI หรือ handler ที่ต้องทำงาน
links|การนำทางที่เปลี่ยน URL โดยไม่จำเป็นต้องโหลดเอกสารใหม่ทั้งหน้า
parameters|ส่วนแปรผันใน path เช่น :userId ซึ่งอ่านค่าจริงจาก URL ได้
nested routing|route ลูกที่ render ภายใน layout หรือ route แม่ผ่านตำแหน่ง outlet
providers|component ที่กำหนดค่า context ให้ descendant ใต้ต้นไม้
consumers|component ที่อ่านค่าปัจจุบันจาก context ที่ใกล้ที่สุด
shared state|ข้อมูลที่หลาย component ต้องอ่านหรือแก้จากแหล่งเดียวกัน
context trade-offs|ลด prop drilling แต่การเปลี่ยนค่าอาจทำให้ consumer หลายตัว render
HTTP methods|คำกริยาอย่าง GET POST PUT PATCH DELETE ที่สื่อเจตนาของ request
requests|ข้อความจาก client ที่ประกอบด้วย method URL headers และอาจมี body
responses|ผลจาก server ที่มี status headers และ body
API integration|เชื่อม UI กับ API พร้อมแปลงข้อมูลและจัดการสถานะทุกเส้นทาง
memoization|เก็บผลจาก input เดิมเพื่อหลีกเลี่ยงการคำนวณซ้ำที่มีต้นทุน
rendering|กระบวนการที่ React เรียก component เพื่อคำนวณ UI จาก props และ state
React.memo|ข้าม render ของ component เมื่อ props เทียบแบบตื้นแล้วไม่เปลี่ยน
useMemo|เก็บผลการคำนวณและคำนวณใหม่เมื่อ dependency เปลี่ยน
useCallback|เก็บ reference ของฟังก์ชันและสร้างใหม่เมื่อ dependency เปลี่ยน
user stories|ความต้องการสั้นในมุมผู้ใช้ที่ระบุบทบาท เป้าหมาย และคุณค่า
task breakdown|แบ่ง story เป็นงานเล็กที่ประมาณ ทำ มอบหมาย และติดตามได้
definition of done|เกณฑ์ร่วมที่งานทุกชิ้นต้องผ่านก่อนถือว่าเสร็จ
loading state|สถานะที่บอกว่าคำขอยังไม่เสร็จและป้องกันการแสดงข้อมูลเก่าเป็นผลใหม่
error state|สถานะที่เก็บและสื่อความล้มเหลวพร้อมแนวทาง retry ที่เหมาะสม
race conditions|ผลลัพธ์ขึ้นกับลำดับเวลาของงาน async จนคำขอเก่าอาจทับคำขอใหม่
client-server|การแบ่งผู้ร้องขอบริการออกจากระบบที่ประมวลผลและดูแลข้อมูล
REST|แนวออกแบบ API รอบ resource ใช้ HTTP semantics และ request ไม่พึ่ง session ก่อนหน้า
resources|สิ่งในโดเมนที่ API ตั้งชื่อด้วยคำนามและมี representation
status codes|รหัสสามหลักที่สื่อผลระดับ protocol เช่น 200 201 400 404 500
runtime|สภาพแวดล้อมที่โหลดและประมวลผล JavaScript นอก browser เช่น Node.js
modules|หน่วยโค้ดที่ export/import ค่าเพื่อแยกความรับผิดชอบและ reuse
npm|เครื่องมือจัดการ package scripts และ dependency metadata ใน package.json
environment variables|ค่ากำหนดจาก environment เพื่อแยก config/secret ออกจาก source code
route parameters|ค่าที่จับจากส่วน dynamic ของ URL และอยู่ใน req.params
middleware chain|ลำดับฟังก์ชันที่ประมวลผล request ก่อนถึง handler หรือ response
next|ฟังก์ชัน Express ที่ส่งการควบคุมไป middleware ถัดไปหรือ error handler
validation|ตรวจรูปแบบ ชนิด และข้อกำหนดของข้อมูลก่อนนำไปใช้หรือบันทึก
error middleware|Express middleware สี่พารามิเตอร์ที่รวมการแปลง error เป็น response
operational errors|ความล้มเหลวที่คาดได้ระหว่างทำงาน เช่น input ไม่ถูกหรือบริการล่ม
central handlers|จุดกลางที่กำหนดรูปแบบ response และ logging ของ error ให้สม่ำเสมอ
logging|บันทึกเหตุการณ์พร้อมเวลา ระดับ และ context เพื่อวิเคราะห์ระบบ
documents|record แบบ BSON ที่เก็บ field และโครงสร้างซ้อนใน MongoDB
schemas|ข้อกำหนดรูปร่าง ชนิด validation และค่าเริ่มต้นของ document
models|ตัวแทน collection ที่สร้างจาก schema และมี API สำหรับ query/document
queries|คำสั่งอ่านหรือเปลี่ยนข้อมูลตาม filter projection sort และเงื่อนไข
SQL queries|คำสั่งเชิงประกาศสำหรับเลือก เพิ่ม แก้ หรือลบข้อมูลในฐานข้อมูลสัมพันธ์
relationships|ความเชื่อมโยงระหว่างตารางผ่าน primary key และ foreign key
images|แม่แบบ immutable ที่รวม filesystem และคำสั่งสำหรับสร้าง container
containers|process ที่รันจาก image โดยแยก filesystem/network ตาม configuration
Dockerfile|ไฟล์คำสั่งแบบเป็นชั้นสำหรับ build Docker image ที่ทำซ้ำได้
ports|หมายเลขปลายทางเครือข่ายที่ mapping ระหว่าง host กับ container ได้
authentication|การพิสูจน์ว่าผู้ร้องขอเป็นใคร
authorization|การตัดสินว่าตัวตนที่พิสูจน์แล้วมีสิทธิ์ทำ action ใด
sessions|สถานะการล็อกอินฝั่ง server ที่ client อ้างด้วย session identifier
tokens|หลักฐานที่ client ส่งมากับ request และ server ตรวจลายเซ็น/อายุได้
role-based access|กำหนด permission ตามบทบาทและตรวจสิทธิ์ที่ server
unit tests|ทดสอบหน่วยเล็กแบบแยก dependency เพื่อระบุต้นเหตุได้เร็ว
integration tests|ทดสอบหลายส่วนทำงานร่วมกัน เช่น route service และ database
assertions|คำสั่งเปรียบเทียบ actual กับ expected แล้วทำให้ test ล้มเมื่อไม่ตรง
mocking|แทน dependency ด้วยตัวควบคุมได้เพื่อจำลองผลและตรวจ interaction
test database|ฐานข้อมูลแยกสำหรับ test ที่ reset และสร้างข้อมูลตั้งต้นซ้ำได้
acceptance criteria|เงื่อนไขตรวจสอบได้ที่ระบุว่า story ยอมรับว่าเสร็จเมื่อใด
regression testing|รัน test เดิมเพื่อยืนยันว่าการเปลี่ยนใหม่ไม่ทำพฤติกรรมเก่าพัง
code review|ตรวจความถูกต้อง ความอ่านง่าย test ความปลอดภัย และผลกระทบก่อน merge
branch protection|กฎบังคับ review checks หรือห้าม push ตรงเข้า branch สำคัญ
merge strategy|วิธีรวมประวัติ เช่น merge commit squash หรือ rebase ตามข้อตกลงทีม
rollback|ย้อนกลับไป release ที่ทราบว่าเสถียรเมื่อการแก้สดมีความเสี่ยงกว่า
health checks|endpoint หรือ probe ที่รายงานว่า process พร้อมรับงานและ dependency จำเป็นใช้ได้
STAR answers|เล่า Situation Task Action Result เพื่อให้หลักฐานพฤติกรรมครบและกระชับ
API design|กำหนด resource endpoint contract error และ versioning ให้ client ใช้ได้สม่ำเสมอ
API flows|ลำดับตั้งแต่ client ส่ง request ผ่าน validation และ business logic จน server ส่ง response
API testing|ส่ง request เข้า endpoint แล้วตรวจ status headers body และผลข้างเคียง
Axios|HTTP client ที่คืน Promise และรองรับ configuration interceptor กับการแปลง request/response
Context API|กลไก React สำหรับส่งค่าผ่าน Provider ไปยัง descendant โดยไม่ส่ง props ทุกชั้น
Docker|แพลตฟอร์มสร้าง image และรัน application ใน container ที่กำหนด environment ได้เหมือนกัน
Flexbox|ระบบ layout หนึ่งมิติที่จัดแนวและกระจายพื้นที่ของ item ตามแกนหลักและแกนขวาง
HTML document structure|โครงสร้าง doctype html head และ body ที่จัดเอกสารเว็บอย่างถูกลำดับ
JSD responsibilities|พัฒนา ทดสอบ review และดูแลซอฟต์แวร์ร่วมกับทีมตาม requirement และมาตรฐานงาน
Node.js|JavaScript runtime บน V8 สำหรับรันโปรแกรมนอก browser และเข้าถึงระบบไฟล์หรือเครือข่าย
MongoDB|ฐานข้อมูล document ที่เก็บข้อมูลเป็น BSON ภายใน collection และ query ด้วย filter
OOP|แนวทางจัดโปรแกรมรอบ object ที่รวม state กับ behavior และสื่อสารผ่าน interface
optimization|ปรับ performance จากผลวัดจริง โดยลดงานที่แพงโดยไม่เปลี่ยนพฤติกรรมที่ถูกต้อง
PostgreSQL|ฐานข้อมูลเชิงสัมพันธ์ที่รองรับ SQL constraint transaction และความสอดคล้องของข้อมูล
PostgreSQL vs MongoDB|PostgreSQL ใช้ตารางและความสัมพันธ์ ส่วน MongoDB เก็บ document BSON ที่ยืดหยุ่น
React Router|ไลบรารีที่จับคู่ URL กับ React UI และรองรับ navigation กับ nested route
acceptance tests|การทดสอบจาก acceptance criteria เพื่อยืนยันว่าพฤติกรรมที่ผู้ใช้ต้องการทำงานครบ
architecture explanation|การอธิบาย component ขอบเขต dependency และเหตุผลของการออกแบบระบบ
arrays|โครงสร้างข้อมูลแบบมีลำดับ ใช้ index เริ่มที่ศูนย์และเก็บสมาชิกหลายค่า
async JavaScript|การจัดการงานที่เสร็จภายหลังโดยไม่ block call stack เช่น Promise และ event
async integration|เชื่อมงาน asynchronous เข้ากับ UI โดยดูแล loading error cancellation และข้อมูลล่าสุด
authentication and authorization|พิสูจน์ตัวตนก่อน แล้วตรวจสิทธิ์ของตัวตนนั้นก่อนอนุญาต action
border|เส้นรอบ content และ padding ซึ่งมีความหนา รูปแบบ และสีเป็นส่วนของ box model
BSM challenge|แบบฝึกใช้พฤติกรรมและ mindset กับสถานการณ์จริง พร้อมสะท้อนหลักฐานและสิ่งที่จะปรับ
cache|พื้นที่เก็บผลลัพธ์ชั่วคราวเพื่อลดการคำนวณหรือร้องขอซ้ำ โดยต้องมีกติกา invalidation
cascade|กฎที่ browser ใช้เลือก declaration จาก origin importance specificity และลำดับที่เขียน
component responsibilities|ขอบเขตงานที่ component หนึ่งควรรับผิดชอบ พร้อม input output ที่ชัดเจน
communication practicum|การฝึกสื่อสารในสถานการณ์จำลอง พร้อมรับ feedback เรื่องความชัดเจน การฟัง และผลกระทบ
data flow|เส้นทางที่ข้อมูลเดินทางและถูกแปลงจาก input ผ่านส่วนต่าง ๆ ไปยัง output
database integration|การเชื่อม application กับฐานข้อมูลผ่าน connection query transaction และการจัดการ error
debugging|กระบวนการทำซ้ำเพื่อสร้างอาการ เก็บหลักฐาน แยกสาเหตุ แก้ และทดสอบป้องกันซ้ำ
debugging object-oriented code|ติดตาม state ของ instance การเรียก method และ prototype เพื่อหาต้นเหตุ
debugging patterns|รูปแบบตรวจ bug เช่น reproduce ลดขอบเขต ตั้งสมมติฐาน และยืนยันด้วยหลักฐาน
demo flow|ลำดับการสาธิตที่เริ่มจากปัญหา ผ่าน use case สำคัญ และจบด้วยผลลัพธ์ภายในเวลาที่กำหนด
demo readiness|สถานะที่ demo data ระบบ environment บทพูด และแผนสำรองผ่านการซ้อมแล้ว
demo storyline|เรื่องเล่าที่เชื่อมปัญหาผู้ใช้ วิธีแก้ และคุณค่าของผลิตภัณฑ์ตลอดการสาธิต
developer role|หน้าที่สร้างคุณค่าผ่านซอฟต์แวร์ พร้อมสื่อสาร ทดสอบ รับ feedback และรับผิดชอบผลกระทบ
display|property CSS ที่กำหนดชนิดกล่องและพฤติกรรม layout เช่น block inline flex หรือ grid
environment configuration|ค่าเฉพาะ environment เช่น URL port และ secret ที่แยกออกจาก source code
errors|เหตุการณ์ล้มเหลวที่ต้องมี context ส่งต่ออย่างถูกต้อง และแปลงเป็นผลลัพธ์ที่เหมาะสม
expectation management|ตกลงขอบเขต เวลา ความเสี่ยง และอัปเดตการเปลี่ยนแปลงก่อนเกิดความเข้าใจไม่ตรงกัน
fallback plan|ขั้นตอนสำรองที่ระบุ trigger ผู้ตัดสินใจ และวิธีกลับสู่สถานะที่ใช้งานได้
fallback planning|เตรียมทางเลือกสำหรับ demo หรือ release พร้อมเงื่อนไขว่าจะสลับใช้เมื่อใด
feedback|ข้อมูลเฉพาะพฤติกรรมและผลกระทบที่ให้ทันเวลา พร้อมข้อเสนอแนะซึ่งนำไปทำต่อได้
full-stack architecture|ภาพรวมการทำงานร่วมกันของ client API database authentication และ deployment
functional requirements|พฤติกรรมหรือความสามารถที่ระบบต้องทำ เช่น ผู้ใช้สร้างและยกเลิก order ได้
functions|ชุดคำสั่งที่เรียกซ้ำได้ รับ parameter และอาจคืนผลลัพธ์ผ่าน return
Git collaboration|การทำงานร่วมผ่าน branch commit pull request review และกติกาการ merge
Git team workflow|ลำดับร่วมตั้งแต่สร้าง branch ทำ commit เปิด PR ตรวจ CI review และ merge
group project practices|ข้อตกลงทีมเรื่อง scope งานย่อย ownership communication review และ definition of done
handling questions|ฟังคำถามให้ครบ ทวนประเด็น ตอบด้วยหลักฐาน และยอมรับตรงไปตรงมาหากต้องตรวจเพิ่ม
higher-order functions|ฟังก์ชันที่รับฟังก์ชันเป็น argument หรือคืนฟังก์ชันเป็นผลลัพธ์
HTTP errors|การแทนความล้มเหลวของ request ด้วย status ที่เหมาะสมและ response body ที่ปลอดภัย
identity|ข้อมูลที่ระบุ principal หลังผ่านการพิสูจน์ตัวตน เช่น user id และ account
learning sources|แหล่งเรียนรู้ที่ตรวจผู้เขียน วันที่ version ตัวอย่าง และเอกสารอ้างอิงได้
links and forms|ลิงก์ใช้ a กับ href เพื่อนำทาง ส่วน form รวบรวมและส่งข้อมูลจาก control
logs|บันทึกเหตุการณ์แบบมีเวลา severity request id และ context โดยไม่เปิดเผย secret
margin|พื้นที่โปร่งด้านนอก border ใช้สร้างระยะห่างระหว่างกล่อง
padding|พื้นที่ระหว่าง content กับ border ซึ่งขยายพื้นหลังและขนาดกล่องตาม box model
non-functional requirements|คุณภาพหรือข้อจำกัดของระบบ เช่น performance security availability และ accessibility
objects and arrays|object เก็บค่าตาม key ส่วน array เก็บค่าตามลำดับและ index
permissions|สิทธิ์ย่อยที่ระบุว่า principal สามารถอ่าน สร้าง แก้ หรือลบ resource ใด
presentation run-through|การซ้อมนำเสนอเต็มลำดับพร้อมจับเวลา ส่งต่อผู้พูด และบันทึกจุดที่ต้องแก้
priorities|ลำดับความสำคัญของงานจากคุณค่า urgency dependency effort และความเสี่ยง
project teamwork|การแบ่ง ownership ประสาน dependency เปิดเผย blocker และ review ผลงานร่วมกัน
project workflow|ลำดับนำงานจาก backlog ผ่าน development review testing ไปสู่ done หรือ release
project quality|ระดับที่งานตรง requirement ผ่าน test อ่านและดูแลได้ ปลอดภัย และพร้อมส่งมอบ
properties|คู่ key-value ของ object ซึ่งเข้าถึงได้ด้วย dot notation หรือ bracket notation
release preparation|ตรวจ version changelog migration configuration monitoring และ rollback ก่อนปล่อย
release readiness|หลักฐานว่า build test security config monitoring และ rollback พร้อมสำหรับ release
request|ข้อมูลที่ client ส่งเข้า server ประกอบด้วย method URL headers parameters และ body
request testing|สร้าง HTTP request ใน test แล้วตรวจ response และผลที่เกิดกับ dependency
response|ข้อมูลที่ server ส่งกลับ client ประกอบด้วย status headers และ body
review comments|feedback บน diff ที่ระบุปัญหา เหตุผล ระดับความสำคัญ และแนวแก้ที่หารือได้
risk|เหตุการณ์ไม่แน่นอนที่ประเมิน likelihood impact owner mitigation และ contingency
routing|การเลือก component หรือ handler จาก URL และเงื่อนไขการนำทาง
scope|ขอบเขตสิ่งที่รวมและไม่รวมในงาน เพื่อควบคุมเวลาและความคาดหวัง
secure delivery|ส่งมอบผ่าน pipeline ที่ปกป้อง secret ตรวจ dependency จำกัดสิทธิ์ และย้อนกลับได้
seed data|ข้อมูลตั้งต้นที่สร้างซ้ำได้สำหรับ development test หรือ demo โดยไม่ใช้ข้อมูลจริงอ่อนไหว
semantic elements|element อย่าง header nav main article ที่สื่อความหมายของโครงสร้างเนื้อหา
specificity|คะแนน selector ที่ช่วยตัดสิน declaration เมื่อกฎใน cascade แข่งขันกัน
state|ข้อมูลที่เปลี่ยนตามเวลาและมีผลต่อพฤติกรรมหรือ UI ของ application
status assertions|ตรวจว่า endpoint คืน HTTP status ตรงตาม contract ในแต่ละกรณี
system boundaries|เส้นแบ่งว่าส่วนใดอยู่ในระบบ ใครเป็นระบบภายนอก และสื่อสารผ่าน interface ใด
task ownership|กำหนดผู้รับผิดชอบผลลัพธ์ ผู้ช่วย dependency และเวลาที่ต้องอัปเดตสถานะ
team roles|การแบ่งหน้าที่ระหว่างสมาชิกโดยยังมีเป้าหมายร่วมและแผนส่งต่องานชัดเจน
team workflow|ขั้นตอนร่วมในการเลือกงาน พัฒนา review test merge และสื่อสาร blocker
technical communication|อธิบายปัญหา หลักฐาน ทางเลือก trade-off และ next step ให้เหมาะกับผู้ฟัง
test cases|ชุด precondition input action และ expected result สำหรับพฤติกรรมหนึ่งกรณี
testing|กระบวนการหาหลักฐานว่าซอฟต์แวร์ทำตามที่คาดและเผยความเสี่ยงจากกรณีผิดพลาด
testing strategy|แผนเลือกสัดส่วน unit integration end-to-end และ non-functional test ตามความเสี่ยง
trade-offs|การเลือกที่ได้ประโยชน์บางด้านและยอมเสียอีกด้านโดยบันทึกเหตุผลกับข้อจำกัด
useEffect|React Hook สำหรับ synchronize component กับระบบภายนอกหลัง render พร้อม cleanup
`.trim().split('\n').map((line) => line.split('|')));

function definitionOf(focus) {
  if (exactDefinitions.has(focus)) return exactDefinitions.get(focus);
  if (/requirement|criteria|scope|priorit/i.test(focus)) return `ข้อกำหนดที่ทำให้ทีมตกลงขอบเขตของ ${focus} และตรวจผลได้เป็นรูปธรรม`;
  if (/demo|presentation|question|storyline/i.test(focus)) return `การเตรียม ${focus} ให้มีลำดับ เป้าหมาย เวลา และทางสำรองที่ซ้อมได้จริง`;
  if (/workflow|collaboration|team|role|ownership/i.test(focus)) return `ข้อตกลงเรื่อง ${focus} ที่ระบุผู้รับผิดชอบ จุดส่งต่องาน และวิธีตรวจร่วมกัน`;
  if (/deploy|release|readiness|delivery|configuration/i.test(focus)) return `การทำ ${focus} แบบทำซ้ำได้ มีการตรวจสุขภาพระบบและย้อนกลับเมื่อผิดพลาด`;
  if (/debug|error|risk|fallback|trade-off/i.test(focus)) return `การจัดการ ${focus} จากหลักฐาน แยกสาเหตุทีละตัว และบันทึกเหตุผลของทางเลือก`;
  if (/architecture|boundary|flow|responsibilit/i.test(focus)) return `คำอธิบาย ${focus} ที่ชี้ส่วนประกอบ การไหลของข้อมูล และขอบเขตความรับผิดชอบ`;
  if (/feedback|communication|expectation/i.test(focus)) return `การสื่อสารเรื่อง ${focus} ด้วยข้อเท็จจริง ผลกระทบ และ next step ที่ตกลงร่วมกัน`;
  return `แนวคิด ${focus} ที่ต้องเชื่อมกับ requirement มีผลตรวจสอบได้ และระบุข้อจำกัดชัดเจน`;
}

const exactExamples = new Map(`
media queries|หน้า product ใช้หนึ่งคอลัมน์บนมือถือ และเปลี่ยนเป็นสามคอลัมน์เมื่อจอกว้างเกิน 900px
relative units|กำหนด padding เป็น 1.5rem และความกว้าง card เป็น 80% แทนค่าพิกเซลตายตัว
mobile-first design|เขียน style สำหรับจอเล็กเป็นค่าเริ่มต้น แล้วใช้ min-width เพิ่ม layout สำหรับ tablet
fluid images|ตั้ง max-width: 100% และ height: auto ให้รูปย่อเมื่อ container แคบลง
prototype|สร้าง wireframe ที่กดเปลี่ยนหน้าจอได้เพื่อทดลองกับผู้ใช้ก่อนเขียนระบบจริง
usability|จับเวลาว่าผู้ใช้ใหม่ค้นหาและชำระสินค้าได้สำเร็จโดยไม่ต้องมีคนช่วยหรือไม่
problem decomposition|แยกฟีเจอร์ checkout เป็นตะกร้า ที่อยู่ การชำระเงิน และใบยืนยัน
branching|นักพัฒนาสร้าง feature/cart แยกจาก main แล้วเปิด review ก่อนรวมงาน
pull requests|ทีมดู diff รัน CI และให้ reviewer อนุมัติก่อนรวม commit เข้า main
merge conflicts|Git หยุด merge เพราะสอง branch แก้บรรทัดเดียวกันและต้องให้คนเลือกผลสุดท้าย
map|แปลง array ของสินค้าเป็น array ของชื่อสินค้าโดยจำนวนสมาชิกเท่าเดิม
filter|เลือกเฉพาะ order ที่ status เป็น paid แล้วคืนเป็น array ใหม่
reduce|รวมยอด price ของสินค้าทุกชิ้นเป็นตัวเลข total ค่าเดียว
event loop|callback ของ timer รอจน synchronous call stack ทำงานเสร็จก่อนจึงถูกเรียก
promises|ฟังก์ชันคืน object ที่ภายหลังอาจสำเร็จเป็นข้อมูลหรือ rejected เป็น error
async/await|ฟังก์ชัน async หยุดเฉพาะลำดับภายในเพื่อรอ Promise แล้วทำบรรทัดถัดไป
mutation|เรียก user.roles.push('admin') แล้ว object user เดิมถูกเปลี่ยน
spread syntax|สร้าง updatedUser ด้วย {...user, name: 'Mai'} โดยไม่แก้ user เดิม
prototype chain|instance อ่าน method ที่ไม่มีเป็น own property แต่พบใน prototype ของ constructor
encapsulation|class เปิด method withdraw แต่ไม่ให้โค้ดภายนอกแก้ balance โดยตรง
DOM tree|browser แทน html body และ button เป็น node ที่มีความสัมพันธ์ parent-child
events|เมื่อผู้ใช้กดปุ่ม browser ส่ง click ให้ listener ที่ลงทะเบียนไว้
JSX|component return markup ที่แทรก expression JavaScript ด้วยวงเล็บปีกกา
props|Parent ส่ง user เป็น attribute ให้ Profile และ Profile อ่านค่าโดยไม่แก้ต้นฉบับ
useState|เมื่อเรียก setter React เก็บค่าใหม่และ schedule ให้ component render อีกครั้ง
dependency arrays|effect ที่ระบุ userId จะทำใหม่เมื่อค่า userId เปลี่ยน
cleanup|component ยกเลิก interval และ remove listener ก่อนถูกถอดจากหน้าจอ
routes|URL /products/42 ถูกจับคู่ให้แสดง ProductPage
links|ผู้ใช้กดเมนูแล้ว URL เปลี่ยนผ่าน client-side navigation โดยหน้าไม่ reload ทั้งเอกสาร
parameters|ProductPage อ่านค่า 42 จาก path /products/:productId
providers|ThemeProvider ครอบ app และส่งค่า theme ให้ component ลูกทุกระดับ
shared state|cartCount ถูกอ่านทั้ง Navbar และ Checkout จากแหล่งข้อมูลเดียวกัน
HTTP methods|client ใช้ GET อ่านสินค้าและ POST สร้าง order ใหม่
requests|browser ส่ง method URL authorization header และ JSON body ไป server
responses|server คืน 201 พร้อม Location header และข้อมูล resource ที่สร้างแล้ว
memoization|เก็บผลการกรองรายการขนาดใหญ่ไว้และคำนวณใหม่เฉพาะเมื่อรายการหรือ filter เปลี่ยน
useMemo|component cache ผล expensiveCalculation ตาม dependency ที่กำหนด
useCallback|Parent รักษา reference ของ handler เพื่อไม่ให้ child ที่ memoized render โดยไม่จำเป็น
user stories|เขียนว่า “ในฐานะสมาชิก ฉันต้องการรีเซ็ตรหัสผ่าน เพื่อกลับเข้าใช้งานบัญชีได้”
definition of done|story จะปิดได้เมื่อ acceptance tests ผ่าน review แล้ว และ deploy สู่ staging สำเร็จ
race conditions|คำขอค้นหาคำเก่าตอบช้ากว่าและกลับมาทับผลของคำค้นหาล่าสุด
REST|ออกแบบ /orders เป็น resource และใช้ status code สื่อผลของแต่ละ operation
status codes|API คืน 404 เมื่อไม่พบ id และคืน 201 เมื่อสร้างข้อมูลสำเร็จ
modules|ไฟล์หนึ่ง export ฟังก์ชันและอีกไฟล์ import ไปใช้โดยไม่พึ่งตัวแปร global
environment variables|DATABASE_URL ถูกส่งจาก deployment environment โดยไม่ commit ลง Git
route parameters|Express route /users/:id อ่าน id จริงจาก req.params.id
middleware chain|request ผ่าน logger authentication และ validation ตามลำดับก่อนถึง controller
next|middleware ตรวจเสร็จแล้วเรียกฟังก์ชันเพื่อส่ง request ให้ตัวถัดไป
validation|API ปฏิเสธ email ผิดรูปแบบก่อนเรียก database
documents|MongoDB เก็บ user หนึ่งรายการเป็น BSON ที่มี address object ซ้อนอยู่
schemas|Mongoose กำหนดว่า email ต้องเป็น String required และ unique
models|เรียก User.findOne ผ่าน object ที่สร้างจาก userSchema
SQL queries|ใช้ SELECT พร้อม WHERE และ parameter เพื่ออ่านแถวที่ต้องการ
relationships|orders.user_id อ้าง foreign key ไป users.id
images|build artifact แบบอ่านอย่างเดียวที่บรรจุ runtime dependency และ application
containers|เริ่ม process จาก image โดยส่ง environment และ map port ตอน run
Dockerfile|ระบุ base image COPY RUN และ CMD เพื่อให้ build application ซ้ำได้
authentication|ระบบตรวจ password hash แล้วระบุได้ว่าผู้ร้องขอคือ user คนใด
authorization|ระบบรู้ตัวตนแล้วตรวจเพิ่มว่า role นี้ลบข้อมูลได้หรือไม่
sessions|server เก็บสถานะ login และ browser ส่ง session id ใน cookie
tokens|client แนบ bearer credential ที่ server ตรวจ signature และ expiration
unit tests|ทดสอบ calculateTotal โดยแทน payment service และ database ด้วยของจำลอง
integration tests|ส่ง request เข้า route จริงและตรวจว่าข้อมูลถูกเขียนใน test database
assertions|test เปรียบเทียบ response.status ที่ได้จริงกับ 201 ที่คาดหวัง
mocking|แทน email provider เพื่อกำหนดผลตอบกลับและตรวจว่าถูกเรียกด้วยข้อมูลใด
code review|reviewer ตรวจ logic test security และผลกระทบจาก diff ก่อนอนุมัติ
branch protection|repository ปฏิเสธ push เข้า main และบังคับ PR กับ checks ที่ผ่าน
rollback|release ใหม่ error สูงผิดปกติ ทีมจึงสลับกลับ version ก่อนหน้าที่เสถียร
health checks|platform เรียก /health เพื่อดูว่า process พร้อมรับ traffic หรือยัง
STAR answers|ผู้สมัครเล่าบริบท หน้าที่ สิ่งที่ลงมือทำ และผลลัพธ์ที่วัดได้ตามลำดับ
`.trim().split('\n').map((line) => line.split('|')));

function exampleOf(focus) {
  return exactExamples.get(focus) ?? definitionOf(focus);
}

const codeQuestions = [
  {
    match: /^Responsive Web Design$/i,
    prompt: 'โค้ดใดทำให้ layout เปลี่ยนเป็น 2 คอลัมน์เมื่อ viewport กว้างอย่างน้อย 768px?',
    choices: ['@media (min-width: 768px) { .grid { grid-template-columns: 1fr 1fr; } }', '@media (max-height: 768px) { .grid { display: none; } }', '.grid { width: 768px !important; }', '<media min-width="768">'],
    correctIndex: 0,
    explanation: 'media query แบบ min-width เหมาะกับ mobile-first และกฎภายในจะทำงานเมื่อ viewport กว้างตั้งแต่ 768px ขึ้นไป',
  },
  {
    match: /^Week 5 Final: Git Teamwork \+ Conditionals & Loops$/i,
    prompt: 'โค้ดใดคืนค่าเฉพาะเลขคู่จาก nums โดยไม่แก้ Array เดิม?',
    choices: ['nums.filter((n) => n % 2 === 0)', 'nums.map((n) => n % 2)', 'nums.forEach((n) => n === 2)', 'nums.push(2)'],
    correctIndex: 0,
    explanation: 'filter สร้าง Array ใหม่จากสมาชิกที่ callback คืนค่า true และเงื่อนไข n % 2 === 0 ตรวจเลขคู่',
  },
  {
    match: /^Git & GitHub Team Workflow$/i,
    prompt: 'หลังสร้าง branch `feature/login` แล้ว คำสั่งใดส่ง branch นี้ขึ้น remote พร้อมตั้ง upstream?',
    choices: ['git push -u origin feature/login', 'git pull origin feature/login', 'git merge -u feature/login', 'git branch --remote feature/login'],
    correctIndex: 0,
    explanation: 'git push ส่ง commit ไป remote และ -u ตั้ง upstream ทำให้ครั้งต่อไปใช้ git push/git pull โดยไม่ต้องระบุชื่อซ้ำ',
  },
  {
    match: /^Higher-Order Functions & Iterables$/i,
    prompt: 'ผลลัพธ์ของ `[1, 2, 3].reduce((sum, n) => sum + n, 0)` คืออะไร?',
    choices: ['6', '[1, 2, 3]', '3', 'undefined'],
    correctIndex: 0,
    explanation: 'reduce เริ่ม accumulator ที่ 0 แล้วบวก 1, 2 และ 3 ตามลำดับ จึงได้ 6',
  },
  {
    match: /^Asynchronous JavaScript$/i,
    prompt: 'โค้ดใดจัดการทั้งผลสำเร็จและ error ของ Promise ด้วย async/await ได้เหมาะสม?',
    choices: ['try { const data = await load(); } catch (error) { handle(error); }', 'const data = await load().error;', 'await try load();', 'const data = load(); if (data.error) throw data;'],
    correctIndex: 0,
    explanation: 'await ควรอยู่ใน async function และใช้ try/catch เพื่อรับ rejection หรือ error ที่เกิดระหว่างรอผล',
  },
  {
    match: /^OOP Recap & Code Reading$/i,
    prompt: 'ใน `class User { constructor(name) { this.name = name; } }` คำว่า `this.name` หมายถึงอะไร?',
    choices: ['property ของ instance ที่กำลังถูกสร้าง', 'ตัวแปร global ชื่อ name', 'property ของ Array', 'ชื่อ class ใหม่'],
    correctIndex: 0,
    explanation: 'this อ้างถึง instance ปัจจุบัน และ constructor กำหนดค่า parameter name ให้ property name ของ instance นั้น',
  },
  {
    match: /^DOM Fundamentals$/i,
    prompt: 'โค้ดใดผูก click handler ให้ปุ่มที่มี id="save"?',
    choices: ["document.querySelector('#save').addEventListener('click', save)", "document.getElement('save').on('click', save)", "document.querySelector('save').click = save()", "window.addEventListener('#save', save)"],
    correctIndex: 0,
    explanation: 'querySelector ใช้ # สำหรับ id และ addEventListener รับชื่อ event กับ callback โดยไม่เรียก callback ทันที',
  },
  {
    match: /^React Router$/i,
    prompt: 'React Router route ใดรับค่า userId จาก path `/users/42`?',
    choices: ["<Route path=\"/users/:userId\" element={<User />} />", "<Route path=\"/users/userId\" value={42} />", "<Link parameter=\"userId\" />", "<Router get=\"/users/{userId}\" />"],
    correctIndex: 0,
    explanation: ':userId ประกาศ dynamic segment ซึ่ง component User อ่านได้ด้วย useParams()',
  },
  {
    match: /^React Context API$/i,
    prompt: 'โค้ดใดอ่านค่าจาก ThemeContext ภายใน function component?',
    choices: ['const theme = useContext(ThemeContext)', 'const theme = ThemeContext.value()', 'const theme = useState(ThemeContext)', 'const theme = props.useContext()'],
    correctIndex: 0,
    explanation: 'useContext รับ context object และคืนค่าจาก Provider ที่ใกล้ component ที่สุด',
  },
  {
    match: /^Axios & Web Integration$/i,
    prompt: 'โค้ด Axios ใดส่ง POST พร้อม object ไปที่ `/api/users`?',
    choices: ["axios.post('/api/users', { name: 'Mina' })", "axios.get('/api/users', { name: 'Mina' })", "axios.post({ url: '/api/users' }).name('Mina')", "axios('/api/users').send.post('Mina')"],
    correctIndex: 0,
    explanation: 'axios.post รับ URL เป็น argument แรกและ request body เป็น argument ที่สอง',
  },
  {
    match: /^React useEffect$/i,
    prompt: 'ใน useEffect ที่ subscribe event ควรคืนค่าอะไรเพื่อป้องกัน listener ค้าง?',
    choices: ['ฟังก์ชัน cleanup ที่ unsubscribe event', 'ค่า true', 'Promise จาก setState', 'component JSX อีกตัว'],
    correctIndex: 0,
    explanation: 'React เรียก cleanup ก่อน effect ทำงานใหม่และเมื่อ component unmount จึงใช้ยกเลิก subscription ได้',
  },
  {
    match: /^React Optimization$/i,
    prompt: 'เมื่อใดการใช้ useMemo จึงสมเหตุสมผลที่สุด?',
    choices: ['เมื่อ calculation มีต้นทุนสูงและ dependencies เปลี่ยนไม่บ่อย', 'กับค่าคงที่ทุกตัวเสมอ', 'เพื่อแทน useEffect ทุกกรณี', 'เพื่อหยุด event propagation'],
    correctIndex: 0,
    explanation: 'useMemo cache ผลคำนวณระหว่าง render และคำนวณใหม่เมื่อ dependency เปลี่ยน จึงควรใช้เมื่อประโยชน์มากกว่าต้นทุนการ memoize',
  },
  {
    match: /^React JSX & Components$/i,
    prompt: 'ใน React โค้ดใดอัปเดต count จากค่าล่าสุดอย่างปลอดภัยเมื่อ update อาจถูกรวมเป็น batch?',
    choices: ['setCount((current) => current + 1)', 'count = count + 1', 'setCount(count++)', 'useState(count + 1)'],
    correctIndex: 0,
    explanation: 'functional updater รับ state ล่าสุดจาก React จึงไม่พึ่งค่าจาก closure เก่า',
  },
  {
    match: /^Express.js Fundamentals$/i,
    prompt: 'Express route ใดอ่าน id จาก URL `/users/42` ได้ถูกต้อง?',
    choices: ["app.get('/users/:id', (req, res) => res.json({ id: req.params.id }))", "app.get('/users/id', (req) => req.id)", "app.use('/users/{id}', res.send(id))", "app.get('/users', req.params(42))"],
    correctIndex: 0,
    explanation: ':id ประกาศ route parameter และ Express เก็บค่าจริงไว้ใน req.params.id',
  },
  {
    match: /^MongoDB & Mongoose$/i,
    prompt: 'คำสั่ง Mongoose ใดค้นหา user หนึ่งคนจาก email?',
    choices: ['User.findOne({ email })', 'User.selectOne(email)', 'User.get(email).first()', 'User.query(email).single()'],
    correctIndex: 0,
    explanation: 'findOne รับ filter object และคืน document แรกที่ตรงเงื่อนไข หรือ null ถ้าไม่พบ',
  },
  {
    match: /^PostgreSQL Integration$/i,
    prompt: 'query แบบ parameterized ใดช่วยลดความเสี่ยง SQL injection?',
    choices: ["pool.query('SELECT * FROM users WHERE id = $1', [id])", "pool.query('SELECT * FROM users WHERE id = ' + id)", 'pool.query(`SELECT * FROM users WHERE id = ${id}`)', "pool.query('SELECT * FROM users WHERE id = id')"],
    correctIndex: 0,
    explanation: '$1 แยกโครงสร้าง SQL ออกจากค่าที่รับเข้ามา และ driver จะส่ง id เป็น parameter',
  },
  {
    match: /^API Testing$/i,
    prompt: 'assertion ใดตรวจว่า status code ของ response เท่ากับ 200?',
    choices: ['assert.equal(response.status, 200)', 'assert(response.status = 200)', 'response.status => 200', 'assert.status(200 = response)'],
    correctIndex: 0,
    explanation: 'assert.equal เปรียบเทียบ actual กับ expected โดยไม่เปลี่ยนค่าของ response.status',
  },
];

function buildQuestion(entry, index, points) {
  const matchingCodeQuestions = codeQuestions.filter((item) => item.match.test(entry.topic));
  if (index === 1) {
    const code = matchingCodeQuestions[0];
    if (code) return { ...code, prompt: `${code.prompt} — ${entry.topic}`, points };
  }

  const weekFocus = calendar.schedule
    .filter((item) => item.week === entry.week && !item.skip)
    .flatMap((item) => item.focus);
  const availableFocus = entry.weekly_final
    ? [...new Set(weekFocus)]
    : [...new Set(entry.focus)];
  const conceptIndex = matchingCodeQuestions.length && index > 1 ? index - 1 : index;
  const focus = availableFocus[conceptIndex % availableFocus.length];
  const correctIndex = (index * 3 + entry.week) % 4;
  const correct = definitionOf(focus);
  const topicSupplements = {
    'Responsive Web Design': ['fluid images'],
    'Objects & Arrays 2': ['spread syntax'],
  };
  const reviewFocus = entry.weekly_final
    ? weekFocus
    : [...entry.focus, ...(topicSupplements[entry.topic] ?? [])];
  const relatedFocus = [...new Set([...entry.focus, ...reviewFocus])]
    .filter((item, position, items) => item !== focus && items.indexOf(item) === position)
    .filter((item) => definitionOf(item) !== correct);
  const dateSeed = Number(entry.date.replaceAll('-', ''));
  const wrong = Array.from({ length: 3 }, (_, offset) =>
    definitionOf(relatedFocus[(dateSeed + index * 3 + offset) % relatedFocus.length]));
  const definitionChoices = [...wrong];
  definitionChoices.splice(correctIndex, 0, correct);
  const exampleDistractors = Array.from({ length: 3 }, (_, offset) =>
    exampleOf(relatedFocus[(dateSeed + index * 5 + offset) % relatedFocus.length]));
  const exampleChoices = [...exampleDistractors];
  exampleChoices.splice(correctIndex, 0, exampleOf(focus));
  const termDistractors = relatedFocus
    .filter((item) => item !== focus)
    .slice((dateSeed + index) % Math.max(relatedFocus.length - 3, 1))
    .concat(relatedFocus)
    .filter((item, position, items) => item !== focus && items.indexOf(item) === position)
    .slice(0, 3);
  while (termDistractors.length < 3) termDistractors.push(`แนวคิดอื่น ${termDistractors.length + 1}`);
  const termChoices = [...termDistractors];
  termChoices.splice(correctIndex, 0, focus);
  const knowledgePrompts = [
    `ข้อใดอธิบาย “${focus}” ในบท ${entry.topic} ได้ถูกต้อง?`,
    `ในบท ${entry.topic} ถ้าเพื่อนถามความหมายของ “${focus}” คำตอบใดแม่นยำที่สุด?`,
    `ข้อใดจับคู่หน้าที่ของ “${focus}” กับบท ${entry.topic} ได้ถูกต้อง?`,
    `ก่อนนำ “${focus}” ไปใช้ใน ${entry.topic} ข้อใดคือความเข้าใจพื้นฐานที่ถูกต้อง?`,
    `ข้อความใดแยก “${focus}” จากแนวคิดอื่นในบท ${entry.topic} ได้ชัดที่สุด?`,
  ];
  const questionMode = (index + Math.floor(conceptIndex / availableFocus.length)) % 3;
  const choices = questionMode === 0
    ? termChoices
    : questionMode === 1 ? definitionChoices : exampleChoices;
  return {
    prompt: questionMode === 0
      ? `สถานการณ์นี้ใช้แนวคิดใดในบท ${entry.topic}: “${exampleOf(focus)}”?`
      : questionMode === 1
        ? knowledgePrompts[index % knowledgePrompts.length]
        : `ตัวอย่างใดแสดงการใช้ “${focus}” ในบท ${entry.topic} ได้ถูกต้อง?`,
    choices,
    correctIndex,
    explanation: `คำตอบคือ “${focus}” เพราะ ${correct}`,
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

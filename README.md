# Kanban Board

โปรเจกต์นี้เป็นระบบ Kanban Board จัดทำขึ้นเพื่อใช้ในการทำแบบทดสอบสำหรับนักศึกษาสหกิจศึกษาของบริษัท Clicknext

## คุณสมบัติของระบบ
- **การจัดการบอร์ด**: สร้าง, แก้ไข, และลบบอร์ด
- **การจัดการคอลัมน์**: เพิ่ม, เปลี่ยนชื่อ, และลบคอลัมน์
- **การจัดการงาน**: เพิ่ม, แก้ไข, ลบงาน และย้ายงานระหว่างคอลัมน์
- **การมอบหมายงาน**: เพิ่มและลบผู้รับผิดชอบงาน
- **การแจ้งเตือน**: แสดงการแจ้งเตือนเกี่ยวกับการเปลี่ยนแปลงในระบบ
- **ระบบสมาชิก**: จัดการสมาชิกในบอร์ด
- **Drag-and-Drop**: ย้ายงานระหว่างคอลัมน์ด้วยการลากและวาง

## โครงสร้างโปรเจกต์

### Frontend
- **Framework**: React.js
- **CSS Framework**: Tailwind CSS
- **Build Tool**: Vite
- **โฟลเดอร์หลัก**:
  - `src/`: โค้ดหลักของระบบ
    - `assets/`: ไฟล์รูปภาพและโลโก้
    - `api/`: ฟังก์ชันสำหรับเรียก API
    - `components/`: ส่วนประกอบ UI ที่ใช้ซ้ำ
    - `pages/`: หน้าเว็บต่างๆ เช่น หน้า BoardsList และ BoardDetail

### Backend
- **Framework**: Django
- **Database**: SQLite
- **โฟลเดอร์หลัก**:
  - `accounts/`: ระบบจัดการผู้ใช้
  - `boards/`: ระบบจัดการบอร์ดและคอลัมน์
  - `config/`: การตั้งค่าระบบ Django

## การติดตั้งและใช้งาน

### 1. Clone โปรเจกต์
```bash
git clone https://github.com/username/Kanban_Board.git
cd Kanban_Board
```


### 2. ติดตั้ง Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 3. ติดตั้ง Backend
```bash
cd frontend
npm install
npm run dev
```

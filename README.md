# ระบบจัดการอสังหาริมทรัพย์ (Property Management System)

ระบบจัดการห้องเช่า/อพาร์ตเมนต์ พัฒนาด้วย Next.js 15 + Prisma + PostgreSQL  
รองรับทั้งโหมด Mock (ไม่ต้องมีฐานข้อมูลจริง) และ Production (PostgreSQL)

---

## ⚙️ ขั้นตอนติดตั้งและรันโปรเจค

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ใน root ของโปรเจค:

```env
# ==============================
# Database (PostgreSQL)
# ==============================
# ใส่ connection string ของ PostgreSQL ที่นี่
# ตัวอย่าง: postgresql://USER:PASSWORD@HOST:5432/DATABASE
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/property_db"

# ==============================
# Admin Authentication
# ==============================
# username และ password สำหรับผู้ดูแลระบบ
# ⚠️ เปลี่ยนจาก default ก่อน deploy production!
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your_secure_password_here"
```

> **หมายเหตุ:** ถ้าไม่ใส่ `DATABASE_URL` หรือใช้ค่า placeholder ระบบจะรันใน **Mock Mode** โดยอัตโนมัติ (ข้อมูลอยู่ใน memory ไม่ persist)

### 3. ตั้งค่าฐานข้อมูล (สำหรับ Production)

#### สร้าง Database Schema:
```bash
npx prisma migrate dev --name init
```

#### Generate Prisma Client:
```bash
npx prisma generate
```

#### ดู Database ผ่าน GUI:
```bash
npx prisma studio
```

### 4. รัน Development Server

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)

---

## 🔐 การเข้าสู่ระบบ

- **Admin Login**: ใช้ username/password ที่กำหนดใน `.env`
- **Tenant (ผู้เช่า)**: ไม่ต้อง login — เข้าดูบิลห้องตัวเองได้โดยตรงที่หน้า Tenant Lookup

---

## 🗄️ โหมดฐานข้อมูล

| โหมด | เงื่อนไข | ข้อมูล |
|------|----------|--------|
| **Mock Mode** | ไม่มี `DATABASE_URL` หรือใส่ค่า placeholder | ข้อมูลตัวอย่าง 101 ห้อง อยู่ใน memory |
| **Live Mode** | `DATABASE_URL` เป็น PostgreSQL จริง | ข้อมูลจริงใน PostgreSQL |

---

## 🚀 Deploy บน Vercel

1. Push code ขึ้น GitHub
2. Connect repo ใน [vercel.com](https://vercel.com)
3. ตั้งค่า Environment Variables ใน Vercel Dashboard:
   - `DATABASE_URL` — connection string ของ PostgreSQL (เช่น Supabase, Neon, Railway)
   - `ADMIN_USERNAME` — ชื่อผู้ดูแล
   - `ADMIN_PASSWORD` — รหัสผ่านที่ปลอดภัย
4. รัน migration ครั้งแรก:
   ```bash
   npx prisma migrate deploy
   ```

---

## 📁 โครงสร้างโปรเจค

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # Login, Logout, Session APIs
│   │   ├── bills/         # Bill CRUD
│   │   ├── check-in/      # Tenant check-in
│   │   ├── check-out/     # Tenant check-out
│   │   ├── properties/    # Property management
│   │   ├── reset/         # Database reset (admin only)
│   │   ├── rooms/         # Room management
│   │   └── verify-slip/   # Payment slip verification
│   ├── page.tsx           # Main dashboard UI
│   └── layout.tsx
├── lib/
│   ├── auth.ts            # Server-side auth helper (HttpOnly cookie)
│   ├── dbService.ts       # Database abstraction (Prisma / Mock)
│   ├── mockData.ts        # In-memory mock database
│   └── prisma.ts          # Prisma client singleton
prisma/
└── schema.prisma          # Database schema
```

---

## 🔧 คำสั่งที่ใช้บ่อย

```bash
npm run dev          # รัน development server
npm run build        # Build production bundle
npm run start        # รัน production server
npx prisma studio    # เปิด Prisma DB GUI
npx prisma migrate dev   # รัน migration (development)
npx prisma migrate deploy  # รัน migration (production)
node test-all-apis.js    # รัน integration tests (ต้องรัน dev server ก่อน)
```

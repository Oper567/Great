# Great-Favour Montessori School (GFMS)
> **Motto:** *"Leadership Academy"* &bull; **Established:** September 2014

An enterprise-grade School Management System (SMS) and high-performance marketing portal for **Great-Favour Montessori School (GFMS)**.

---

## 🎨 Global Design System & Color Palette

| Token | Name | Hex / Class | Purpose & Accessibility |
| :--- | :--- | :--- | :--- |
| **Primary** | Royal Blue | `#1E40AF` (`bg-primary-800`) | Main identity, authority, and academic prestige |
| **Secondary** | Golden Yellow | `#F59E0B` (`bg-secondary-500`) | Montessori warmth, enlightenment & intellectual discovery |
| **Accent (Success)** | Kelly Green | `#15803D` (`bg-accent-green-700`) | Academic progress, success states & positive actions |
| **Accent (Alert)** | Crimson Red | `#DC2626` (`bg-accent-red-600`) | Error alerts, fee reminders & critical notifications |
| **Neutral (Canvas)** | Crisp White | `#FFFFFF` (`bg-white`) | Clean, high-legibility backgrounds |
| **Neutral (Text)** | Deep Charcoal | `#1E293B` (`text-neutral-charcoal`) | WCAG AAA contrast ratio on Crisp White |

All tokens are defined in [`src/app/globals.css`](file:///c:/Users/HP/Great/src/app/globals.css) and [`tailwind.config.ts`](file:///c:/Users/HP/Great/tailwind.config.ts).

---

## 🏛️ School Brand & Institutional Constants

Defined in [`src/constants/school.ts`](file:///c:/Users/HP/Great/src/constants/school.ts):

- **Motto:** *"Leadership Academy"*
- **Mission:** *"To cultivate visionary leaders who think critically, act with integrity to creating positive change and collaborate globally to build a more just and sustainable world."*
- **Vision:** *"To inspire a global generation of ethical leaders who transform challenges into opportunities for a better world."*
- **Core Values:**
  1. **Integrity First:** Upholding uncompromising moral and ethical principles.
  2. **Visionary Thinking:** Fostering innovative, inquisitive minds equipped to pioneer sustainable pathways.
  3. **Global Collaboration:** Instilling empathy and intercultural appreciation.
  4. **Resilient Action:** Transforming setbacks into stepping stones through perseverance and grit.

---

## 👥 Key Personnel Seed Data

Configured in [`prisma/seed.ts`](file:///c:/Users/HP/Great/prisma/seed.ts) and [`database/seed.sql`](file:///c:/Users/HP/Great/database/seed.sql):

- **Super Admin:** **Hon Okolie Peter Isioma JP MCArb** (Director & Proprietor)  
  - Email: `director@gfms.edu.ng`
  - Appointed: September 2014
- **Admin (Finance/Admin):** **Mrs Jane Ekene Okolie** (Deputy Director)  
  - Email: `deputy.director@gfms.edu.ng`
  - Appointed: September 2014

---

## 🏫 Academic Structure & 700-Student Capacity

The school is divided into **15 classes** across two distinct divisions, with an indexed `division` column (`PRIMARY` vs `SECONDARY`) in the database:

### Primary Division (9 Classes &bull; ~200 Capacity)
1. **Play Class** (`PLAY`)
2. **Nursery 1** (`NUR1`)
3. **Nursery 2** (`NUR2`)
4. **Nursery 3** (`NUR3`)
5. **Basic 1** (`BAS1`)
6. **Basic 2** (`BAS2`)
7. **Basic 3** (`BAS3`)
8. **Basic 4** (`BAS4`)
9. **Basic 5** (`BAS5`)

### Secondary Division (6 Classes &bull; ~500 Capacity)
1. **JSS 1** (`JSS1`)
2. **JSS 2** (`JSS2`)
3. **JSS 3** (`JSS3`)
4. **SS 1** (`SS1`)
5. **SS 2** (`SS2`)
6. **SS 3** (`SS3`)

---

## 🗄️ Database Schemas & Migrations

Both ORM and ANSI SQL schemas are available:

- **Prisma Schema:** [`prisma/schema.prisma`](file:///c:/Users/HP/Great/prisma/schema.prisma)
- **Direct SQL DDL:** [`database/schema.sql`](file:///c:/Users/HP/Great/database/schema.sql)
- **Seed Scripts:**
  - TypeScript (Prisma): [`prisma/seed.ts`](file:///c:/Users/HP/Great/prisma/seed.ts)
  - Raw SQL: [`database/seed.sql`](file:///c:/Users/HP/Great/database/seed.sql)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client & Sync Database
```bash
npx prisma generate
npx prisma db push
```

### 3. Seed Database
```bash
npm run prisma:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) to view the application.

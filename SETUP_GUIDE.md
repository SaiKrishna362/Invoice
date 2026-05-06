# Tulluri — Setup Guide
Follow these steps IN ORDER to get the app running.

---

## Step 1 — Install Required Packages

Open your terminal inside the `tulluri` folder and run:

```bash
npm install next-auth @prisma/client @supabase/supabase-js bcryptjs pdf-lib resend
npm install -D prisma @types/bcryptjs
```

---

## Step 2 — Add Files to Your Project

Copy the files from this zip into your project like this:

```
Your tulluri/ folder
├── app/
│   ├── globals.css              ← REPLACE existing file
│   ├── layout.tsx               ← REPLACE existing file
│   ├── providers.tsx            ← NEW FILE (create this)
│   ├── login/
│   │   └── page.tsx             ← NEW FILE
│   ├── signup/
│   │   └── page.tsx             ← NEW FILE
│   ├── dashboard/
│   │   └── page.tsx             ← NEW FILE
│   └── api/
│       ├── auth/
│       │   ├── register/
│       │   │   └── route.ts     ← NEW FILE
│       │   └── [...nextauth]/
│       │       └── route.ts     ← NEW FILE
│       ├── clients/
│       │   └── route.ts         ← NEW FILE
│       └── invoices/
│           └── route.ts         ← NEW FILE
├── lib/                         ← CREATE this folder
│   ├── db.ts                    ← NEW FILE
│   ├── auth.ts                  ← NEW FILE
│   └── utils.ts                 ← NEW FILE
└── prisma/                      ← CREATE this folder
    └── schema.prisma            ← NEW FILE
```

---

## Step 3 — Fill in .env.local

Open `.env.local` (already exists in your project) and ADD these lines:

```env
# From supabase.com → Project → Settings → Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"

# From supabase.com → Project → Settings → API
NEXT_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"

# Generate this by running: openssl rand -base64 32
NEXTAUTH_SECRET="paste-your-generated-secret-here"

# Use localhost for development
NEXTAUTH_URL="http://localhost:3000"
```

---

## Step 4 — Set Up the Database

Run these commands in your terminal:

```bash
# Generate Prisma client code
npx prisma generate

# Push schema to your Supabase database (creates the tables)
npx prisma db push
```

You should see: "Your database is now in sync with your Prisma schema."

---

## Step 5 — Start the Dev Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

You should see a redirect to /login — that means it's working!

---

## Step 6 — Test It

1. Go to http://localhost:3000/signup
2. Create an account
3. Log in at http://localhost:3000/login
4. You'll land on the dashboard

---

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `PrismaClientInitializationError` | Check DATABASE_URL in .env.local |
| `NEXTAUTH_SECRET is not set` | Add NEXTAUTH_SECRET to .env.local |
| `bcryptjs not found` | Run `npm install bcryptjs @types/bcryptjs` |
| `Cannot find module '@/lib/db'` | Make sure lib/db.ts file exists |
| Tables not created | Run `npx prisma db push` again |

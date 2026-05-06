This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# tulluri.in — Invoice Tool for Indian Freelancers

Create GST-ready invoices in under 60 seconds.

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 14 |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| ORM | Prisma |
| Auth | NextAuth.js |
| Email | Resend |
| Hosting | Vercel |

---

## Project Structure

```
tulluri/
├── app/
│   ├── api/
│   │   ├── auth/           ← Login, signup, NextAuth routes
│   │   ├── clients/        ← Client CRUD API
│   │   └── invoices/       ← Invoice CRUD API
│   ├── dashboard/          ← Main dashboard page
│   ├── login/              ← Login page
│   ├── signup/             ← Signup page
│   ├── layout.tsx          ← Root layout (wraps all pages)
│   └── globals.css         ← Global styles
├── components/             ← Reusable UI components
├── lib/
│   ├── db.ts               ← Database connection
│   ├── auth.ts             ← Auth configuration
│   └── utils.ts            ← Helper functions
├── prisma/
│   └── schema.prisma       ← Database schema
├── .env.example            ← Copy this to .env.local
└── package.json
```

---

## Setup Instructions

### 1. Clone and install

```bash
git clone https://github.com/yourusername/tulluri.git
cd tulluri
npm install
```

### 2. Set up environment variables

```bash
# Copy the example file
cp .env.example .env.local

# Then fill in your values from Supabase and Resend
```

### 3. Set up database

```bash
# Push schema to Supabase
npm run db:push

# View your database in browser (optional)
npm run db:studio
```

### 4. Run development server

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Deploy to Vercel

```bash
npx vercel
# Add environment variables in Vercel dashboard
```

---

## Environment Variables

| Variable | Where to get it |
|----------|----------------|
| `DATABASE_URL` | Supabase → Settings → Database |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `NEXTAUTH_SECRET` | Run: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` (dev) or `https://tulluri.in` (prod) |
| `RESEND_API_KEY` | resend.com → API Keys |

---

## Roadmap

- [x] User auth (login/signup)
- [x] Client management
- [x] Invoice creation with GST
- [ ] PDF export
- [ ] Email invoices to clients
- [ ] WhatsApp payment reminders
- [ ] Razorpay payment links
- [ ] GST reports

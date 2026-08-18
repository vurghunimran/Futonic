# Futonic — Design Match Agenda

A private football creative-operations dashboard built with Next.js, TypeScript, Tailwind CSS and Prisma. It organizes upcoming fixtures, manual design work, workers, deadlines and reminder delivery in one weekly view.

## Included

- Telephone registration/sign-in with Telegram bot deep-link activation
- Monday-to-Sunday calendar with previous, next and Today navigation
- Club/player search through a provider-independent football service
- Demo football provider for development without a paid API key
- Duplicate-safe fixture import and manual agenda items
- Match detail drawer with worker, status, priority and notes editing
- Exact 48-hour and overdue presentation rules
- Normalized PostgreSQL/Prisma schema with assignment and notification history
- Authenticated cron endpoints for fixture sync and notifications
- Vercel cron configuration and environment template
- Unit tests for calendar and warning behavior

## Local development

Requires Node.js 20.9 or newer.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The development sign-in number is `+994 50 123 45 67`. Set `ADMIN_PHONE` before deployment.

For Telegram onboarding, create a bot with BotFather and configure `TELEGRAM_BOT_USERNAME`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_WEBHOOK_SECRET`. Registration produces a one-time `/start` deep link. Telegram requires the user to tap **Start** once; after that webhook confirmation, the chat ID can be associated with the registered account and reminders activate automatically.

## Database

Create a PostgreSQL database (Neon works well on Vercel), set `DATABASE_URL`, then run:

```bash
npm run db:generate
npm run db:push
```

The current interface deliberately runs in demo mode without a database, making product review possible immediately. The Prisma schema is the production persistence contract; connect server actions to these models as the next deployment step.

## Football providers

`src/lib/football/provider.ts` defines the provider contract. The bundled demo provider is selected when `FOOTBALL_API_PROVIDER=demo`. API keys are server-only and must never use a `NEXT_PUBLIC_` prefix.

## Deployment

1. Import the repository in Vercel.
2. Add all variables from `.env.example`.
3. Generate strong values for `AUTH_SECRET`, `CRON_SECRET`, and `TELEGRAM_WEBHOOK_SECRET`.
4. Connect PostgreSQL and run the Prisma schema migration.
5. Deploy. `vercel.json` uses two once-daily UTC schedules so the project can deploy on Vercel's entry plan: notification processing at 01:05 UTC and fixture sync at 01:20 UTC. Upgrade the Vercel plan before changing these back to hourly or six-hour schedules.

Cron requests must include `Authorization: Bearer <CRON_SECRET>`. Both jobs are designed as idempotent boundaries; notification delivery should use `NotificationLog.idempotencyKey` before enabling external email or Telegram sends.

## Verification

```bash
npm test
npm run lint
npm run build
```

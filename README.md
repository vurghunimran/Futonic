# Futonic — Design Match Agenda

A private football creative-operations dashboard built with Next.js, TypeScript, Tailwind CSS and Prisma. It organizes upcoming fixtures, manual design work, workers, deadlines and reminder delivery in one weekly view.

## Included

- Telephone registration/sign-in with Telegram bot deep-link activation
- Monday-to-Sunday calendar with previous, next and Today navigation
- Club/player search through a provider-independent football service
- Demo football provider for development without a paid API key
- Duplicate-safe fixture import and manual agenda items
- Match detail drawer with worker, status, priority and notes editing
- Orange agenda cards inside 48 hours and red cards inside 24 hours
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

## Telegram reminders

1. Open `@BotFather` in Telegram, run `/newbot`, and save the token and bot username.
2. Add `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` (without `@`), `TELEGRAM_WEBHOOK_SECRET`, `DATABASE_URL`, and `CRON_SECRET` to Vercel for Production and Preview.
3. Apply the database schema with `npm run db:push`, then redeploy.
4. Register in Futonic again, open **Settings → Telegram activation**, open the generated link, and tap **Start** in Telegram.
5. Register the production webhook (replace the placeholders):

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://<YOUR_VERCEL_DOMAIN>/api/telegram/webhook","secret_token":"<TELEGRAM_WEBHOOK_SECRET>","allowed_updates":["message"]}'
```

The bot confirms a successful connection. When a client is added, any imported match starting within 48 hours triggers an immediate Telegram reminder. The daily Vercel cron also checks every future match inside the same 48-hour window. Both paths share a delivery log, so the same match is not sent twice. Agenda changes are synchronized to PostgreSQL after each edit, so scheduled reminders work even when the dashboard is closed.

## Database

Create a PostgreSQL database (Neon works well on Vercel), set `DATABASE_URL`, then run:

```bash
npm run db:generate
npm run db:push
```

The interface can still be reviewed without a database, but Telegram activation, server-side agenda synchronization, and background reminders require PostgreSQL.

## Football providers

`src/lib/football/provider.ts` defines the provider contract. The bundled demo provider is selected when `FOOTBALL_API_PROVIDER=demo`. API keys are server-only and must never use a `NEXT_PUBLIC_` prefix.

The production adapter uses API-Football. Create a free account at [dashboard.api-football.com](https://dashboard.api-football.com), then configure:

```env
FOOTBALL_API_PROVIDER="api-football"
FOOTBALL_API_KEY="your-server-side-key"
FOOTBALL_API_BASE_URL="https://v3.football.api-sports.io"
FOOTBALL_API_SEASON="2026"
```

Search requests are debounced and cached for one hour to protect the free quota. Selecting a club imports every available fixture in the next 10 days. Selecting a player resolves the player's current club, imports that club's available fixtures for the same 10-day window, labels each agenda item with the selected player, and adds the player to My Clients.

## Deployment

1. Import the repository in Vercel.
2. Add all variables from `.env.example`.
3. Generate strong values for `AUTH_SECRET`, `CRON_SECRET`, and `TELEGRAM_WEBHOOK_SECRET`.
4. Connect PostgreSQL and run the Prisma schema migration.
5. Deploy. `vercel.json` uses two once-daily UTC schedules so the project can deploy on Vercel's entry plan: notification processing at 01:05 UTC and fixture sync at 01:20 UTC. Upgrade the Vercel plan before changing these back to hourly or six-hour schedules.

Vercel uses the `vercel-build` script to apply the Prisma schema before building the application. Keep `DATABASE_URL` available to the Production and Preview environments. Use Neon's pooled connection string (its hostname normally contains `-pooler`) and include `sslmode=require`; paste the value into Vercel without surrounding quotation marks.

Cron requests must include `Authorization: Bearer <CRON_SECRET>`. Vercel adds this header automatically to configured cron invocations. Telegram delivery records `NotificationLog.idempotencyKey`, preventing the same match reminder from being sent twice.

## Verification

```bash
npm test
npm run lint
npm run build
```

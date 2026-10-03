# Salesbook

A private website for an owner and workers to track item sales, stock and money handovers in a configurable currency. Sales books support GMD, EUR, GBP, USD, NGN, CAD and AUD; changing currency relabels amounts without exchange-rate conversion.

## How to use

1. Register your owner account and create a sales book.
2. Open **Items & stock** to add your items, selling prices and starting quantities.
3. Open **Your worker**, enter their email and share the generated invitation link.
4. Your worker registers with that email and accepts the invitation.
5. Both of you can record sales. Quantity × the owner’s price gives the total automatically.
6. For partial payments, record the amount received and customer name. Use **Sales history → Sale details** for later payments.
7. When your worker gives you money, record it in **Money handovers**. Their outstanding balance decreases immediately.
8. Use **Sales books** in the navigation to switch businesses or add another business.

The owner sees all sales and manages prices, stock, workers and handovers. Workers see their own sales, money records and shared stock. Workers cannot alter prices, stock, void sales or confirm handovers. Removing access blocks an existing worker session.

Dates use Gambia time. Money is stored as integer bututs to avoid floating-point rounding. Prices are preserved on historical sales. Voids keep an audit record and restore stock; they are intended for errors or full returns with money refunded. Partial returns and online payments are not included.

## Run locally

Requires Node 22+, PostgreSQL 17+ and Google Chrome for browser tests.

```sh
npm ci
cp .env.example .env
docker compose up -d
npm run db:generate
npm run db:migrate
npm run dev
```

Open http://localhost:3000. Create your own accounts; there are no shared demo credentials.

```sh
npm run test
npm run typecheck
npm run build
npm run test:e2e
```

Browser tests create and remove their own fixtures. Use a development database. They start/reuse localhost:3000; BASE_URL can select another running instance.

## Deploy

Deploy as a standard Next.js app with PostgreSQL. Set a private production DATABASE_URL and run `npm run db:migrate` before release. Enable database backups and HTTPS. Production session cookies require HTTPS. Apply platform request limits for public registration/login. No deployment has been created by this change.

Invitations are shared manually; no email provider or scheduler is needed. CSV downloads respect the signed-in account’s permissions. The earlier appointment UI is disabled; old database tables remain intact to preserve existing data.

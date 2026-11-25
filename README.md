# Klyroo

AEO and GEO monitoring for e-commerce. Know if your website is ready for AI discovery.

Next.js 16, Supabase (Postgres, Auth, RLS) and Polar for billing.

## Develop

```bash
cp .env.example .env.local   # fill in Supabase and Polar values
npm install
npm run dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm test` | Unit tests (pricing, domain parsing, webhook verification) |
| `npm run db:migrate` | Apply `supabase/migrations` to the database in `DATABASE_URL` |
| `npm run db:verify` | Check row-level security and the brand licence cap |
| `npm run test:webhook` | Send signed fake Polar events to the local webhook |
| `npm run polar:check` | Check Polar products match the price table |

`npm run db:wipe` is destructive and requires an explicit project reference.

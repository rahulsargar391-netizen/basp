# BASP — Blockchain Academic Skill Passport

BASP is a React website and Express API for uploading certificates, reviewing them
through participating institutions, and verifying approved files by their SHA-256 hash.

## Architecture and limitations

- Frontend: React and Vite (`BASP/client`)
- API: Express and Sequelize (`BASP/server`)
- Database: Supabase PostgreSQL
- Certificate files: private files on the API filesystem
- The hash-chained ledger is simulated; the Solidity contract is a draft and is not
  deployed. IPFS is not connected.

Certificate files need durable storage in production. Render's local filesystem is
ephemeral unless a persistent disk is attached. See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Run locally

1. Install Node.js 24.
2. Run `BASP/setup.bat`, or install dependencies with `npm ci` in both `BASP/server`
   and `BASP/client`.
3. Configure `BASP/server/.env` with the Supabase PostgreSQL connection string,
   `DB_DIALECT=postgres`, `DB_CREATE_DATABASE=false`, `DB_SSL=true`, and a strong,
   private `JWT_SECRET`.
4. Set `VITE_API_URL=http://localhost:5000/api` in `BASP/client/.env`.
5. Run `BASP/start.bat`, or start the API with `npm start` in `BASP/server` and the
   website with `npm run dev` in `BASP/client`.
6. Open http://localhost:5173. The API health check is
   http://localhost:5000/api/health.

The current Supabase database is already initialized with its admin and college
accounts. **Do not run a seed command on that database.** For a brand-new, empty
database only, configure `ADMIN_PASSWORD` (at least 12 characters) and run
`npm run seed:accounts` once from `BASP/server`. The full `npm run seed` command is
for development only and creates demo data.

Change the initial shared institution password before using the system publicly.
Never commit `.env` files, secrets, or real student documents.

## Deploy

Follow [DEPLOYMENT.md](./DEPLOYMENT.md) to deploy the frontend to Vercel and the API to
Render with Supabase PostgreSQL.

The `BASP/samples` files are fictional test documents. They are not used by production.

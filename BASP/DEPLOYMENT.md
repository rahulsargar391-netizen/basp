# Deploy BASP with Supabase

Use Vercel for the React website, a persistent Node host for the Express API and
certificate files, and Supabase PostgreSQL for the database.

## 1. Create a Supabase project

1. Create a project at https://supabase.com/dashboard.
2. Save its database password securely.
3. In **Project Settings → Database**, copy the PostgreSQL connection string. Prefer the
   **Session pooler** if the backend host cannot connect directly.
4. Do not put database credentials in the client or commit them to Git.

The app's models and tables are created by Sequelize at backend startup.

For a new project where you want only the admin and six college accounts, use the
accounts-only seed command after configuring the backend. It refuses to run if any
table already has rows and does not create demo students or certificates:

```text
cd server
npm run seed:accounts
```

The admin password comes from `ADMIN_PASSWORD`; the college accounts use `12345678`.
Keep these credentials private and change them before production use.

## 2. Existing MySQL data and certificate files

The current MySQL database and `server/uploads` remain unchanged. Connecting this
project to Supabase does not copy existing user accounts, certificates, ledger entries,
activity logs, or uploaded documents. Do not switch a live backend to an empty Supabase
database if you need those records. Handle any transfer under your organization's
approved data-protection process, and keep the original MySQL database and uploads as
backups until records and files are verified.

## 3. Point the backend at Supabase

For local testing or the deployed backend, set:

| Variable | Value |
|---|---|
| `DB_DIALECT` | `postgres` |
| `DATABASE_URL` | Supabase PostgreSQL connection string (or use `SUPABASE_DB_URL` locally) |
| `DB_CREATE_DATABASE` | `false` |
| `DB_SSL` | `true` |
| `CLIENT_URL` | Exact Vercel website origin |
| `JWT_SECRET` | New long random secret |
| `UPLOAD_DIR` | Persistent upload-volume path |

Use the Supabase database password in `DATABASE_URL`. Keep this variable server-side;
never set it as a `VITE_*` variable.

After switching the backend, test `/api/health`, login, certificate details, private
file access, and public verification. Keep MySQL and its uploads backup until all checks
pass.

## 4. Deploy the backend

Deploy `BASP/server/` to a Node host such as Render or Railway:

- Root directory: `BASP/server`
- Build command: `npm install`
- Start command: `npm start`
- Health check: `/api/health`

Attach persistent storage for `server/uploads`. Configure the environment variables
above in the provider dashboard. `render.yaml` contains a starter configuration.

## 5. Deploy the frontend to Vercel

1. Import `rahulsargar391-netizen/basp` at https://vercel.com/new.
2. Set root directory to `BASP`.
3. Set build command to `npm run build --prefix client`.
4. Set output directory to `client/dist`.
5. Set `VITE_API_URL` to `https://YOUR-BACKEND-DOMAIN/api`.
6. Deploy.
7. Set backend `CLIENT_URL` to the exact Vercel origin and redeploy the backend.

Finally, test login, certificate upload, institution review, QR links, and public
verification. Keep MySQL and its uploads backup until all checks pass.

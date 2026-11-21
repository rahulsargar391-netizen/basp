# Deploy BASP with Vercel, Render, and Supabase

Use Vercel for the React frontend, Render for the Express API, and Supabase PostgreSQL
for the database. The repository already contains a Render Blueprint at `render.yaml`
and Vercel settings in `BASP/vercel.json`.

## Before deploying

- The current Supabase project already contains the admin and six institution accounts.
  Do not run `npm run seed` or `npm run seed:accounts` against it.
- The database connection string is server-only. Never put it in a `VITE_*` variable
  or commit it to GitHub.
- Rotate the initial admin and shared institution passwords before public use.
- Certificate files are stored on the API filesystem. A persistent Render disk is
  required before accepting real uploads; without one, uploads can be lost when the
  service restarts or redeploys. Render disks may require a paid plan. Do not upload
  real student records until durable storage is configured.

## 1. Deploy the frontend to Vercel

1. Import `rahulsargar391-netizen/basp` at https://vercel.com/new.
2. Set **Root Directory** to `BASP`.
3. Keep the build and output settings from `BASP/vercel.json`:
   - Build command: `npm run build --prefix client`
   - Output directory: `client/dist`
4. Deploy once to obtain the production domain, for example
   `https://your-project.vercel.app`. The site will not reach the API until the API URL
   is configured in a later step.

The Vercel configuration includes an SPA rewrite so direct navigation to routes such as
`/register` and `/verify/...` works.

## 2. Deploy the API to Render

1. In Render, create a **Blueprint** from the same GitHub repository. The root-level
   `render.yaml` defines the API service and its health check.
2. Set these required environment variables when prompted:
   - `DATABASE_URL`: the Supabase PostgreSQL connection string. Use the Supabase
     Session Pooler connection string if direct connections are unavailable.
   - `CLIENT_URL`: the exact Vercel production origin, with no path or trailing slash,
     such as `https://your-project.vercel.app`.
3. The Blueprint sets `DB_DIALECT=postgres`, `DB_CREATE_DATABASE=false`, `DB_SSL=true`,
   and generates a `JWT_SECRET`. If TLS verification requires the downloaded Supabase
   CA certificate, add it as a Render Secret File and set `DB_SSL_CA_FILE` to the file
   path provided by Render; otherwise leave `DB_SSL_CA_FILE` empty.
4. Wait for the service to deploy. Its health endpoint should be
   `https://YOUR-API.onrender.com/api/health` and report `database: "connected"`.

Do not run either seed command during deployment. Sequelize creates any missing model
tables at API startup; existing account data is left in place.

## 3. Connect Vercel to Render

1. In Vercel project settings, add `VITE_API_URL` for Production (and Preview if
   needed), with the Render API base URL ending in `/api`, for example
   `https://YOUR-API.onrender.com/api`.
2. Redeploy the Vercel frontend so the build includes the API URL.
3. Confirm Render's `CLIENT_URL` matches the final Vercel production origin exactly,
   then redeploy the API if you changed it.
4. Test the home page, student registration, login, and API health check.

## 4. Persist certificate uploads

Before using certificate upload in production:

1. Attach a persistent disk to the Render API service, mounted at
   `/var/data/uploads`.
2. Set the Render environment variable `UPLOAD_DIR=/var/data/uploads`.
3. Redeploy and test upload, private file access, and institution review.

The current API writes files to local disk; it does not use Supabase Storage. If you
do not attach durable storage, do not treat uploaded certificates as safely stored.

## 5. Final checks

- Vercel frontend can reach the Render API (browser requests succeed without CORS
  errors).
- `/api/health` reports a connected database.
- A new student registration appears in Supabase `public.Users` with role `student`.
- Certificate upload, private file access, institution review, QR links, and public
  verification work after persistent file storage is configured.
- Keep any old MySQL database and local uploads as backups until you have verified
  records and files. They are not copied automatically.

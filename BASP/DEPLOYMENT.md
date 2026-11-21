# Deploy BASP

Use Vercel for the React website and a long-running Node host for the Express API.
Do not host the current Express server and uploaded files on Vercel: this project uses
disk-backed uploads and MySQL, both of which need persistent storage.

## 1. Create the hosted MySQL database

Create a MySQL database on Railway, Aiven, or another managed MySQL provider.

Record:

- Host
- Port
- Database name
- Username
- Password

Create the database name beforehand if `DB_CREATE_DATABASE=false`. The application
creates its Sequelize tables automatically at startup.

Set `DB_SSL=true` for providers that require SSL. Railway public TCP databases commonly
work with `DB_SSL=false`; use the provider's documented setting.

## 2. Deploy the backend

The Express server is in `server/`.

Recommended environment variables:

| Variable | Value |
|---|---|
| `PORT` | Set by the hosting provider, or `5000` locally |
| `CLIENT_URL` | The final Vercel HTTPS origin, with no trailing slash |
| `JWT_SECRET` | Generate a strong random secret |
| `JWT_EXPIRES_IN` | `7d` |
| `DB_HOST` | Managed MySQL host |
| `DB_PORT` | Managed MySQL port |
| `DB_NAME` | Managed MySQL database |
| `DB_USER` | Managed MySQL username |
| `DB_PASSWORD` | Managed MySQL password |
| `DB_CREATE_DATABASE` | `false` |
| `DB_SSL` | `true` or `false`, based on provider |
| `UPLOAD_DIR` | Provider persistent-volume path |

Set the Node service root to `server`, install command to `npm install`, and start
command to `npm start`. Use `/api/health` as the health check.

Attach persistent storage for uploads and set `UPLOAD_DIR` to that mounted path.
Examples:

- Railway: mount `/app/uploads`, set `UPLOAD_DIR=/app/uploads`
- Render: attach a persistent disk and set `UPLOAD_DIR=/var/data/uploads`

After deployment, verify:

`https://YOUR-BACKEND-DOMAIN/api/health`

The response should show `"status":"ok"` and `"database":"connected"`.

## 3. Seed the hosted database

Run the seed command once from the deployed server environment or locally while pointing
it at the hosted database:

```text
cd server
npm run seed
```

Do not expose or commit hosted database credentials or JWT secrets.

## 4. Deploy the React frontend to Vercel

Import this repository in Vercel.

Set:

- Framework preset: `Vite`
- Root directory: repository root
- Build command: `npm run build --prefix client`
- Output directory: `client/dist`

Set this Vercel environment variable:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://YOUR-BACKEND-DOMAIN/api` |

Redeploy after setting the variable.

The included `vercel.json` uses `client/dist` and preserves React Router paths.

## 5. Final CORS and login check

Set the backend `CLIENT_URL` to the exact Vercel origin, for example:

```text
https://basp-project.vercel.app
```

Redeploy the backend after changing `CLIENT_URL`, then test:

1. Open the Vercel URL.
2. Log in as `admin@gmail.com` / `Admin@1234`.
3. Register or log in to one institution account.
4. Upload a test certificate.
5. Verify `/api/health`.
6. Open a public verification link.

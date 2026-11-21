# BASP - Blockchain Academic Skill Passport

**Secure • Verifiable • Student-Centric**

A college engineering project. Students upload certificates, institutions approve them,
every approved file gets a SHA-256 fingerprint, and anyone can verify a certificate by
scanning a QR code.

---

## 1. What works today, and what does not (honest status)

| Feature | Status |
|---|---|
| Landing page, About, Contact, responsive dark UI | Working |
| Student / institution registration, login, JWT, bcrypt password hashing | Working |
| Role-based access (student, institution, admin) and protected routes | Working |
| Certificate upload (PDF/JPG/PNG, max 5 MB, file-signature check, private storage) | Working |
| SHA-256 hash of every upload, re-checked at approval | Working |
| Institution review: approve / reject with a note | Working |
| Admin approval of new institutions | Working |
| QR code per approved certificate, share link | Working |
| Public verification page: VERIFIED / INVALID / NOT FOUND | Working |
| Student verification history | Working |
| Admin dashboard: statistics, users and roles, all certificates, activity logs | Working |
| **Blockchain** | **SIMULATED.** A hash-chained ledger stored in MySQL. Not a real blockchain. |
| `contracts/BASPRegistry.sol` | **Draft only.** Not compiled, tested or deployed. Phase 9. |
| **IPFS** | **Not connected.** Files are stored in `server/uploads` (private). Phase 10. |
| Student profile, skills page, account settings | Not built yet |
| Free online deployment | Phase 12 |

The app labels the simulated ledger as simulated on screen. Do not describe it as a real
blockchain in your presentation until Phase 9 is finished.

---

## 2. Requirements (you already installed these)

- Node.js LTS, VS Code, Git
- XAMPP, with **MySQL** started (green) in the XAMPP Control Panel

---

## 3. Install and run (Windows)

1. Unzip this folder to `C:\Projects\BASP-v2` (keep your old `BASP` folder as a backup).
2. Open the **XAMPP Control Panel** (as administrator) and click **Start** next to **MySQL**.
3. Double-click **`setup.bat`**. It installs everything and creates the `.env` files. (Needs internet, a few minutes.)
4. Double-click **`seed-demo.bat`**. It creates the database `basp_v2`, the demo accounts and one approved sample certificate.
5. Double-click **`start.bat`**. Two windows open (server and website) and the browser opens `http://localhost:5173`.

Keep both windows open while you work. Close them to stop BASP.

### Or by hand (VS Code terminals)

```
cd server
npm install
npm run setup-env
npm run seed
npm run dev
```
Second terminal:
```
cd client
npm install
npm run dev
```

---

## 3b. Demo accounts (testing only. Change or delete before any real use)

| Role | Email | Password |
|---|---|---|
| Admin | admin@gmail.com | Admin@1234 |
| Institutions | jjmcoe@basp.test, dkte@basp.test, rit@basp.test, adcet@basp.test, sit@basp.test, tkit@basp.test | 12345678 |
| Student | student@basp.test | Student12345 |

The seed script also creates one approved sample certificate and prints its public link.

Sample files are in the `samples` folder:

- `sample-certificate.pdf`: a fictional certificate to upload
- `sample-certificate-TAMPERED.pdf`: the same document with the grade changed (its hash will not match)
- `sample-achievement.png`: a fictional image certificate

Never use real student documents while testing.

---

## 4. Demo script for your presentation (about 5 minutes)

1. **Student** logs in, clicks *Upload Certificate*, chooses `Demo Engineering College`, uploads `sample-certificate.pdf`. Status: PENDING. Show the SHA-256 fingerprint on the details page.
2. **Institution** logs in (`college@basp.test`), opens *Pending Requests*, opens the file, clicks **Approve**. (Try **Reject** with an empty note once to show the validation.)
3. **Student** refreshes *My Certificates*: status APPROVED. Open *Details and QR code*. Show the QR code and the share link.
4. Open the share link in a private window (no login). Show the public page: no private data, only what the student allowed.
5. Click *Check a file* and choose the **original** PDF: **VERIFIED**. Choose the **TAMPERED** PDF: **INVALID**. Type a random ID like `BASP-0000000000`: **NOT FOUND**.
6. **Admin** logs in: statistics, ledger integrity (CHAIN INTACT), users and institutions, activity logs.
7. Register a new institution, log in as admin and show that it must be **approved** before it can review anything.

---

## 5. How verification works (explain this to your professors)

1. At upload the server computes the file's **SHA-256 hash** (a 64-character fingerprint).
2. When the institution approves, the server hashes the stored file **again**. If it differs, approval is refused (the file was modified).
3. The approved hash is appended to a **ledger**. Each ledger entry contains the hash of the previous entry, so changing an old entry breaks the chain (the admin page shows CHAIN INTACT or CHAIN BROKEN).
4. A QR code links to `/verify/<certificate id>`.
5. A verifier chooses a file. It is hashed in memory (never saved) and compared with the recorded hash.

In Phase 9 step 3 is replaced by a Solidity smart contract on an Ethereum **test** network.

---

## 6. Security measures included

- Passwords hashed with bcrypt, never stored or returned in plain text
- JWT login tokens, secrets only in `server/.env` (never in the website code, never in Git)
- Role-based permissions on every protected route
- Login and public verification are rate limited
- Uploads: only PDF/JPG/PNG, max 5 MB, real file signature checked, random file names, stored in a private folder, served only to the owner, the assigned institution and admins
- The public verification page never shows email, file, or the student's name if the student chose to hide it
- New institutions cannot approve anything until an admin approves them (stops fake colleges)
- Same error message for wrong email and wrong password

Known limits of this MVP (mention them honestly): the JWT is kept in browser local storage, the rate limiter is in memory, there is no email verification or password reset, and the simulated ledger is not tamper-proof against someone with direct database access.

---

## 7. Folder structure

```
BASP/
  setup.bat  seed-demo.bat  start.bat
  samples/                 test files
  contracts/BASPRegistry.sol   Phase 9 draft
  server/
    index.js               starts the server
    config/db.js           MySQL connection (creates the database)
    models/index.js        User, Certificate, LedgerEntry, ActivityLog
    routes/                auth, certificates, institution, verify, admin
    middleware/            auth (login + roles), upload (file rules)
    utils/                 hash, ledger, log, rateLimit
    scripts/               seed.js, setup-env.js
    uploads/               private certificate files (created automatically)
  client/
    src/App.jsx            all page routes
    src/pages/             public, student, institution, admin pages
    src/components/        navbar, footer, layout, shared pieces
    src/context/AuthContext.jsx   who is logged in
```

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| `Could not start the server` | MySQL is not green in XAMPP. Start it. |
| `JWT_SECRET is missing` | Run `npm run setup-env` in the `server` folder. |
| Website says "Cannot reach the server" | Server window closed, or `client/.env` missing. Run `start.bat`. |
| `ECONNREFUSED 3306` | MySQL stopped. Another MySQL (MySQL80 service) may use port 3306: stop it in `services.msc`. |
| Port 5173 busy | Close other website windows, then run `start.bat` again. |
| `Access denied for user root` | XAMPP root has a password. Put it in `DB_PASSWORD=` in `server/.env`. |
| Want to start from zero | In phpMyAdmin drop the database `basp_v2`, delete `server/uploads`, run `seed-demo.bat`. |
| Scanning the QR with a phone | The link says `localhost`, which a phone cannot open. For a demo, put your laptop's Wi-Fi IP in `CLIENT_URL` (server `.env`), start the website with `npm run dev -- --host`, and use the same Wi-Fi. |

---

## 9. Next phases

- **Phase 9:** compile and deploy `BASPRegistry.sol` with Hardhat to a free test network (Sepolia) using a test wallet (MetaMask), and call it from the server with Ethers.js.
- **Phase 10:** store files on IPFS using a free Pinata account (the API key stays in `server/.env`).
- **Phase 12:** testing checklist and free deployment.

## 10. Cloud deployment

For Vercel, the API host, Supabase PostgreSQL, and persistent upload storage setup, see
[DEPLOYMENT.md](./DEPLOYMENT.md). Existing MySQL data and uploaded files are not copied
automatically; keep the local database and files until any authorized transfer is
completed and verified.

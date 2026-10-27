# Firebase setup (founder steps)

Exact steps to take ROAL from demo mode to real accounts and a real database. About 15 minutes. Everything here works on the free **Spark** plan.

Until these are done the app runs in **demo mode** (local demo owner, in-memory data) — that is expected and fine for local development.

## 1. Create the project

1. Go to <https://console.firebase.google.com> → **Create a project** (or **Add project**).
2. Name it (e.g. `roal-prod`). Google Analytics is optional — you can turn it off.
3. Wait for it to finish, then open the project. The **Spark** (free) plan is fine; you do not need Blaze.

Tip: create a second project (e.g. `roal-staging`) the same way if you want a separate staging site.

## 2. Turn on sign-in methods

1. Left menu → **Build → Authentication** → **Get started**.
2. **Sign-in method** tab:
   - **Email/Password** → Enable (leave "Email link" off) → Save.
   - **Google** → Enable → pick a **project support email** → Save.
3. **Settings** tab → **Authorized domains** → make sure these are listed (add the missing ones):
   - `localhost`
   - your production domain, e.g. `getroal.com` (and `www.getroal.com` if used)
   - your Netlify domain if you test on it, e.g. `your-site.netlify.app`

Without the right authorized domain, the Google popup fails with `auth/unauthorized-domain`.

## 3. Create the Firestore database

1. Left menu → **Build → Firestore Database** → **Create database**.
2. Edition / mode: **Standard**, database id `(default)`.
3. **Location:** the region nearest your restaurants and your Netlify functions (e.g. `nam5 (us-central)` or `us-east1` for the US). This cannot be changed later.
4. Security rules: choose **Start in production mode** (deny all). That is exactly what ROAL wants — the server uses the Admin SDK, which bypasses rules. You will deploy the repo's identical `firestore.rules` in step 6.

No collections need to be created by hand; ROAL creates them on first write.

## 4. Copy the web app config → `NEXT_PUBLIC_FIREBASE_*`

1. Gear icon → **Project settings** → **General** → **Your apps** → click the **Web** icon (`</>`).
2. App nickname `roal-web`; **do not** enable Firebase Hosting → **Register app**.
3. You will see a `firebaseConfig` object. Copy these four values into `.env.local` (and later Netlify):

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=<apiKey>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<authDomain>        # <project-id>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<projectId>
NEXT_PUBLIC_FIREBASE_APP_ID=<appId>
```

These are public identifiers (they end up in the browser bundle); that is normal for Firebase.

## 5. Service account → `FIREBASE_SERVICE_ACCOUNT`

1. **Project settings** → **Service accounts** tab → **Firebase Admin SDK** → **Generate new private key** → **Generate key**. A JSON file downloads.
2. Turn the JSON into **one line** and paste it as the value of `FIREBASE_SERVICE_ACCOUNT`:

```bash
# macOS / Linux — prints the JSON on one line
node -e 'process.stdout.write(JSON.stringify(require(process.argv[1])))' ~/Downloads/<project>-firebase-adminsdk-xxxx.json
```

```bash
# .env.local  (single quotes keep the JSON intact)
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...",...}'
```

3. On **Netlify → Site configuration → Environment variables**, add `FIREBASE_SERVICE_ACCOUNT` with the same one-line JSON (no surrounding quotes in the Netlify UI), scoped to Builds + Functions + Runtime. Add the four `NEXT_PUBLIC_FIREBASE_*` values too.
4. Delete the downloaded JSON file (or store it in your password manager). Never commit it and never prefix it with `NEXT_PUBLIC_`.

Keep the `\n` sequences inside `private_key` as literal backslash-n — the one-liner above does that for you.

## 6. Deploy the Firestore rules

From the repo root:

```bash
cp .firebaserc.example .firebaserc     # edit: "default": "<your-project-id>"
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules
```

`firestore.rules` denies all client reads/writes. Redeploy it whenever the file changes (it rarely will).

## 7. Check it works

1. Restart `npm run dev` (env is read at startup).
2. Open <http://localhost:3000/api/health>:
   - `checks.env_public.details.firebase_configured: true`
   - `checks.database.details.firestore: true`
   - `checks.env_server.details.demoMode: false`
3. Go to `/signup`, create an account with email/password, then sign out and try **Continue with Google**.
4. In the Firebase console you should see the users under **Authentication → Users**, and `profiles` / `organizations` / `memberships` collections in **Firestore** after onboarding.
5. Redeploy Netlify after adding the env vars and repeat steps 2–3 on the production URL.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Still shows the demo account | Both `NEXT_PUBLIC_FIREBASE_API_KEY` and `FIREBASE_SERVICE_ACCOUNT` must be set; restart dev / redeploy (public vars are build-time) |
| `auth/unauthorized-domain` | Add the domain in Authentication → Settings → Authorized domains |
| `auth/operation-not-allowed` | Enable the provider in Authentication → Sign-in method |
| "Sign-in is not configured on this server" (503) | Production build without Firebase: set the env vars (or `ROAL_DEMO_MODE=1` for a deliberate demo site) |
| `Failed to parse private key` / JSON error at startup | `FIREBASE_SERVICE_ACCOUNT` is not valid one-line JSON, or the `\n` in `private_key` were turned into real newlines |
| `PERMISSION_DENIED` from the server | The service account belongs to a different project than `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |

# How Rockzy Admin was set up

This is the short version of what we actually did. The browser only signs people in. Posts, comments, and image uploads go through our own API, and that API checks the person is in the Firestore `admin` collection before it touches the database.

Firebase project: `minerals-app-480613`  
Live app: https://rockzy-admin--minerals-app-480613.asia-southeast1.hosted.app  
GitHub: https://github.com/ijaaz1304/rockzy-admin

Do not paste the service-account private key into git, chat, or this file.

## 1. Local environment

Create `.env.local` in the project folder. Git already ignores it (`.env.local` is in `.gitignore`), so it will not be committed.

The web values come from Firebase Console → Project settings → Your apps → the Web app config. The three Admin values come from a service-account JSON (Project settings → Service accounts → Generate new private key). Use the `project_id`, `client_email`, and `private_key` fields from that file.

```bash
# Browser / login (public web config)
NEXT_PUBLIC_FIREBASE_API_KEY=your-web-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=minerals-app-480613.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=minerals-app-480613
NEXT_PUBLIC_FIREBASE_APP_ID=1:your-sender-id:web:your-app-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=minerals-app-480613.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXX

# Server only. Never prefix these with NEXT_PUBLIC_
FIREBASE_PROJECT_ID=minerals-app-480613
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@minerals-app-480613.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nPASTE_THE_KEY_WITH_LITERAL_BACKSLASH_N\n-----END PRIVATE KEY-----\n"
```

Keep the private key on one line, with `\n` where the JSON had real line breaks. The server turns those back into newlines when it starts.

Whoever logs in must already have their email stored on a document in the Firestore `admin` collection. A normal Firebase user who is not in that collection is signed out.

## 2. Run it on your machine

From the project folder:

```bash
npm install
npm run dev
```

Next prints a local URL, usually http://localhost:3000. It should also say it loaded `.env.local`.

Quick check that the Admin SDK can see Firestore:

```bash
curl http://localhost:3000/api/health
```

A healthy response looks like this:

```json
{"ok":true,"adminInitialized":true,"firestoreReachable":true,"projectId":"minerals-app-480613"}
```

If port 3000 is already taken, stop the old `next dev` process and start it again. API calls in this app need a trailing slash (`/api/posts/`, `/api/comments/`, `/api/check-admin/`) because `trailingSlash` is turned on.

## 3. What we deliberately did not deploy

`firebase.json` also lists Firestore rules, Cloud Functions, and classic Hosting. A plain `firebase deploy` would publish those too. The live Firestore rules stay as they are. This admin app does not update them. The dashboard talks to Firestore through the Admin SDK, which is why the browser no longer needs open client rules.

Deploy only App Hosting:

```bash
firebase deploy --only apphosting --project minerals-app-480613 --non-interactive
```

That uploads this folder to the backend named `rockzy-admin` and rolls it out in `asia-southeast1`. When it finishes, the URL is:

https://rockzy-admin--minerals-app-480613.asia-southeast1.hosted.app

You can watch the rollout in the Firebase console:

https://console.firebase.google.com/project/minerals-app-480613/apphosting

After a deploy, the same health check should pass on the live URL:

```bash
curl https://rockzy-admin--minerals-app-480613.asia-southeast1.hosted.app/api/health
```

The public web config is already written in `apphosting.yaml`. The service-account email and private key are not. Those two are App Hosting secrets:

- `rockzyAdminClientEmail` → `FIREBASE_CLIENT_EMAIL`
- `rockzyAdminPrivateKey` → `FIREBASE_PRIVATE_KEY`

The live backend already has them, which is why the health check comes back with `adminInitialized: true`. If you rotate the key, set the secrets again from files (do not pass the key on the command line):

```bash
firebase apphosting:secrets:set rockzyAdminClientEmail \
  --project minerals-app-480613 \
  --data-file ./client-email.txt

firebase apphosting:secrets:set rockzyAdminPrivateKey \
  --project minerals-app-480613 \
  --data-file ./private-key.txt
```

Delete those two text files after the commands succeed. Then deploy App Hosting again so the new values are picked up.

If the CLI says your Firebase login expired:

```bash
firebase login --reauth
```

## 4. Git

Commit the code. Leave `.env.local` untracked. `next-env.d.ts` also changes by itself when Next runs locally; that file does not need to go in the commit.

```bash
git status
git add components lib pages styles apphosting.yaml
git commit -m "Route admin moderation through verified server APIs and refresh the dashboard UI."
git push origin HEAD
```

The remote is `https://github.com/ijaaz1304/rockzy-admin.git` on `main`. The push has to come from a GitHub account that can write to `ijaaz1304/rockzy-admin`. The first attempt failed with 403 because the logged-in account did not have access. After switching to an account that does, `git push origin HEAD` went through (`aebe027..9d344a2`).

# Supabase Auth & Persistence Setup

Step-by-step checklist for wiring Supabase auth and storage into the Next.js prototype.

## 1. Create the Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Choose a region and set a strong project password.
3. Once the project is ready, copy the **Project URL** and **anon/service keys** from the project settings → API.

## 2. Install Client Dependencies

```bash
yarn add @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-helpers-react
```

## 3. Configure Environment Variables

Create or update `.env.local` with the Supabase credentials (add equivalents in Vercel later):

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only, never expose client-side
```

Restart `yarn dev` after saving the file. Add the same variables in Vercel → Project Settings → Environment Variables before deploying.

## 4. Create Supabase Helpers

Add helper files in `lib/`:

- `lib/supabase-browser.ts` – exports `createBrowserSupabaseClient()` using auth-helpers.
- `lib/supabase-server.ts` – exports `createServerComponentClient()` / `createRouteHandlerClient()` for server components and API routes.

These helpers keep auth cookies in sync across client and server.

## 5. Wrap the App with Providers

1. In `app/layout.tsx`, wrap the tree with Supabase’s provider(s) so session info is available client-side.
2. Add a `SupabaseProvider` component (using `SessionContextProvider`) that instantiates the browser client.
3. (Optional) Define `middleware.ts` to parse Supabase auth cookies and gate protected routes.

## 6. Replace Stub Auth Flows

1. Update `/login` and `/signup` pages to call Supabase auth methods (`signInWithPassword`, `signUp`, `signInWithOAuth`, etc.).
2. Remove the localStorage-based `playlist-session` stub once Supabase sessions are wired in.
3. Use `supabase.auth.getUser()` (server) or `useSessionContext()` (client) to detect the logged-in user.

## 7. Persist Playlist Data

1. Use the new Drizzle schema definitions under `db/schema.ts` to keep the database structure in sync.
2. Run `DATABASE_URL=... yarn db:generate` to produce SQL in `drizzle/` and execute the generated migration (e.g. `drizzle/0000_...sql`) through the Supabase SQL editor or CLI.
3. Update import/review flows to insert and query data via the Supabase JS client + Drizzle queries.
4. Store imported playlists in the database and fetch them on `/review` instead of relying solely on `localStorage`.

## 8. Protect Routes

1. Add middleware to redirect unauthenticated visitors to `/login`.
2. In API routes, use the server Supabase client to verify `auth.getUser()` before executing logic.

## 9. Test Locally

1. Run `yarn dev` and create a test account via the new auth flow.
2. Import a playlist and confirm it persists after refresh and logout/login.
3. Check that protected routes redirect when not authenticated.

## 10. Deploy

1. Push commits and ensure Supabase env vars are set on Vercel.
2. Run `vercel --prod` (or deploy via UI).
3. After deploy, walk through signup/login/import on the production URL to confirm everything works end-to-end.

---

**Optional Enhancements**

- Introduce Prisma once the schema stabilizes for typed queries and migrations.
- Add Supabase Row Level Security policies per table to enforce user-level access.
- Enable Supabase OAuth providers (e.g., Twitter, Google) for faster onboarding.

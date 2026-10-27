# Setting up sync (Supabase)

Grove works fully without this. These steps turn on sign in and sync. Everything here is on the free plan.

## 1. Create the project

1. Go to https://supabase.com, sign in, and choose **New project**.
2. Name it `grove`, pick the region closest to you, and let it generate a database password. Keep that password in your password manager; Grove never needs it.
3. Wait for the project to finish setting up (a minute or two).

## 2. Create the tables

```sh
# Go to the project folder
cd ~/Projects/winter-arc-tracker
# Copy the table setup SQL to the clipboard
pbcopy < supabase/migrations/0001_grove.sql
```

4. In Supabase, open **SQL Editor**, choose **New query**, paste, and press **Run**. You should see "Success. No rows returned". Running it again is safe.

```sh
# Copy the security check SQL to the clipboard
pbcopy < supabase/tests/rls_check.sql
```

5. Open another **New query**, paste, and **Run**. The result is a table of 17 checks; every row should say `passed: true`. The check creates two throwaway users and removes them again at the end.

## 3. Make the email carry a 6-digit code

6. **Authentication > Sign In / Providers > Email**: make sure Email is enabled. Set **Email OTP Length** to 6 if it shows another number.
7. **Authentication > Emails > Templates**: edit both **Magic Link** and **Confirm signup**. Supabase uses the second one the first time an address signs in. Use this subject and body:

   Subject: `Your Grove code`

   ```html
   <h2>Your Grove code</h2>
   <p>Enter this code in Grove: <strong>{{ .Token }}</strong></p>
   <p>It works for one hour. If you did not ask for it, you can ignore this email.</p>
   ```

8. **Authentication > URL Configuration**: set **Site URL** to `https://<your-github-user>.github.io/winter-arc-tracker/`.

**About the email limit:** Supabase's built-in email sender only allows a few emails per hour for the whole project. There is also a short wait between codes for the same address. Test with one or two codes. If Grove says "Too many codes sent. Try again in a bit.", wait about an hour. If you ever need more, you can connect your own email provider under **Authentication > Emails > SMTP Settings**.

## 4. Add the keys

9. In **Project Settings > API Keys** (or **Data API**), copy the **Project URL** and the **anon / publishable** key. Never use the `service_role` or secret key anywhere in Grove.

```sh
# Create the local secrets file (it is git-ignored)
touch .env.local
# Open it in TextEdit
open -e .env.local
```

10. Put these two lines in it, with your values, and save:

    ```
    VITE_SUPABASE_URL=https://your-project-ref.supabase.co
    VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
    ```

```sh
# Confirm git will never commit the file: this should print .env.local
git check-ignore .env.local
```

11. On GitHub, open the repository's **Settings > Secrets and variables > Actions** and add two **repository secrets** with the same names and values: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## 5. Try it

```sh
# Start the app locally with your keys
npm run dev
```

12. Open the address it prints, go to **Settings > Sign in to sync**, enter your email, and type the code from the email. Settings should then say "Synced just now".
13. After the next deploy, sign in with the same email on your phone's browser too. Check a habit on one device, then switch to Grove on the other: it shows up within a few seconds. Try airplane mode, check a habit, turn the network back on: Settings goes from "Offline, will sync later" to "Synced just now".

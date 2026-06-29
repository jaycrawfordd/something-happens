# Supabase setup

The app contains only the project URL and publishable key. That key is designed for
browser use. Never add a secret key or `service_role` key to this repository.

## 1. Create the private state table

In the Supabase dashboard, open **SQL Editor**, paste the contents of
`supabase/schema.sql`, and select **Run**.

The script enables and forces Row Level Security. Each authenticated user can only
read or change the row whose `user_id` matches their session.

## 2. Configure email login

In **Authentication > Providers > Email**:

- Keep Email enabled.
- Keep Confirm email enabled for production.
- Use a minimum password length of at least 8 characters.
- For a private personal deployment, disable new-user signups after creating the
  accounts you need.

## 3. Configure URLs

In **Authentication > URL Configuration**, set:

- Site URL: `https://jaycrawfordd.github.io/something-happens/`
- Redirect URL: `https://jaycrawfordd.github.io/something-happens/`
- Local redirect URL: `http://127.0.0.1:8765/`

The production URL must match exactly, including the repository path and trailing
slash. No Apple-specific login setup is needed for email/password authentication.

## 4. Migrate existing browser data

Sign in on the computer that already has your tracker data first. When asked,
choose to use that device's data as the cloud copy. Then sign in with the same
account on the phone and iPad.

The app keeps a local cache for fast startup and syncs authenticated state to
Supabase. Changes are saved after a short delay and checked again when the app
returns to the foreground.

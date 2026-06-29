# something happens

A private daily progress tracker for goals, workouts, checklist consistency, and weight.

## Run locally

```bash
python3 -m http.server 8765
```

Then open `http://127.0.0.1:8765/`.

## Data

Supabase email/password authentication identifies the user. The app keeps a local
cache and syncs one Row Level Security-protected state record per account. See
[`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) for the required one-time project setup.

The project URL and publishable key are intentionally present in the frontend.
Authorization is enforced by Supabase Row Level Security. Secret and `service_role`
keys must never be committed or sent to the browser.

## Deployment

Pushes to `main` deploy automatically through the GitHub Pages workflow.

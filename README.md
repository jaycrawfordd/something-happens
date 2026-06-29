# something happens

A private-by-default daily progress tracker for goals, workouts, checklist consistency, and weight.

## Run locally

```bash
python3 -m http.server 8765
```

Then open `http://127.0.0.1:8765/`.

## Data

The current build stores data in the browser with `localStorage`. GitHub Pages hosts the frontend, but cross-device sync and accounts require the planned Supabase integration.

## Deployment

Pushes to `main` deploy automatically through the GitHub Pages workflow.

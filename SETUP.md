# Quick setup (fix “server returned an error page”)

If you see **“The server returned an error page instead of data”** when using **Optimize with AI** or **Schema Builder (Generate)**, do this:

## 1. Start the app correctly

From the **project root** (the folder that contains `package.json` and `server.js`), run:

```bash
npm run dev
```

This starts **both** the frontend (Vite) and the API (Node). Do **not** run only `vite` or open the built files directly — the API must be running.

You should see in the terminal:

- `Local API running at http://localhost:3000`
- Vite dev server (e.g. `http://localhost:5173`)

Open the app at **http://localhost:5173**.

## 2. Add your Gemini API key (for AI features)

AI features (Optimize with AI, Schema Builder “Generate”) need a Gemini key:

1. Get a key: [Google AI Studio](https://aistudio.google.com/) → Get API key.
2. In the **project root**, copy the example env file:
   - **Windows (PowerShell):** `Copy-Item .env.example .env`
   - **Mac/Linux:** `cp .env.example .env`
3. Open `.env` and set your key:
   ```env
   GEMINI_API_KEY=your_actual_key_here
   ```
4. Restart the app: stop `npm run dev` (Ctrl+C) and run `npm run dev` again.

## 3. Check that the API is running

In a browser, open: **http://localhost:3000/api/health**

You should see JSON like: `{"ok":true,"gemini_configured":true}`  

- If you get “can’t connect” or a blank page, the API is not running — use `npm run dev` from the project root.
- If `gemini_configured` is `false`, add `GEMINI_API_KEY` to `.env` and restart.

After this, **Optimize with AI** and **Schema Builder** should work (or show a clear JSON error message instead of an error page).

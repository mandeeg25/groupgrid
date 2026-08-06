# GroupGrid — How to Edit and Publish Your Site

Welcome! This guide walks you through making changes to GroupGrid and getting them live, step by step.
It's written for you to do everything yourself, even if you're not a developer. Take it one section at a time.

The good news: you'll use **one tool for everything — Claude Code**. You describe what you want in plain English, and
Claude Code both **edits the code** and **runs the GitHub commands** for you. You mostly type requests and approve what
it's about to do.

If you get stuck, message the team — but by the end of this you should be able to make a change, see it on your own
computer first, and then publish it to the live site with confidence.

---

## What this project is (the 60-second version)

GroupGrid is a **web app** made of a few pieces that work together:

- **The app you see** — the pages and the spreadsheet cross-check tool. This is written in React and lives in the
  `src/` folder. **This is the part you'll change day-to-day.**
- **Login (Supabase)** and **subscriptions/billing (Stripe)** — set up for you; they mostly run on their own.
- **Vercel** — the service that hosts your live site and automatically rebuilds it when you publish.
- **GitHub** — where your code is stored online, with a full history and an "undo" for everything.

You don't need to understand all of it. For everyday changes, you'll describe what you want and Claude Code handles
the details. The loop you'll repeat is always the same:

> **Ask Claude Code to start a change → describe the edit → preview it → ask Claude Code to publish it (branch → Pull
> Request → merge) → it goes live.**

The rest of this README explains each step.

---

## Part 1 — One-time setup

You only do this once per computer. If any of it feels unfamiliar, Kevin's Loom walkthrough shows each step on screen.

### 1. Install the tools
- **Claude Code (Desktop app)** — your editing + publishing assistant, and the main thing to install. Download it, sign
  in, and **connect it to GitHub when it prompts you** — that connection is what lets it publish for you. Kevin's Loom
  shows his exact setup; follow along the first time.
  > *Under the hood, Claude Code uses the **GitHub CLI (`gh`)** to talk to GitHub, but the Desktop app manages that
  > connection for you — you shouldn't need to touch it. (If it ever asks you to sign in to GitHub from a terminal,
  > that's a one-time `gh auth login`, and the Loom shows it.)*
- **Node.js** (version **18 or newer**) — runs the app on your computer. Get the "LTS" version from
  <https://nodejs.org>.

### 2. Download (clone) the project
Easiest: **ask Claude Code** — *"Clone my groupgrid repo and open it."*
> Prefer to do it yourself? In a terminal: `gh repo clone mandeeg25/groupgrid` then `cd groupgrid`.

### 3. Install the app's building blocks
From inside the `groupgrid` folder:
```bash
npm install
```
This downloads everything the app needs. It can take a minute the first time. *(Claude Code can run this for you too —
just ask.)*

### 4. Add your secret settings file
The app needs some private keys (for login and billing) that are **not** stored in GitHub.
1. Find `.env.example` in the project.
2. Make a copy of it named **`.env.local`**.
3. Fill in the values — where each one comes from is documented in **`docs/production-env-vars.md`**.

> ⚠️ **Never share or commit `.env.local`.** It holds secrets. The project already keeps it private (it's in
> `.gitignore`), so as long as you name it `.env.local`, it's ignored automatically.

You're now set up. 🎉

---

## Part 2 — Meet Claude Code (your one tool)

Open the **Claude Code Desktop app** with your `groupgrid` project (Kevin's Loom shows his exact setup). From then on,
you just talk to it in plain English. Because it's already connected to GitHub, it can do two kinds of things for you:

- **Edit the code** — e.g. *"On the pricing page, change the annual plan heading to 'Best value'."*
- **Run the GitHub steps** — e.g. *"Start a new branch called `update-pricing`,"* *"commit and push this,"* *"open a
  pull request,"* *"merge it."* Under the hood it uses the GitHub CLI you set up — you don't have to memorize any
  commands.

**You stay in control.** Claude Code shows you what it changed and **asks before it runs anything**, so nothing happens
that you didn't approve — and nothing reaches the live site until the publish step in Part 4.

---

## Part 3 — See your change on your own computer first (localhost)

Before publishing anything, look at it first. Ask Claude Code *"run the app locally"*, or run it yourself:
```bash
npm run dev
```
It prints a web address, usually **http://localhost:5173**. Open that in your browser — this is your app running
locally, where only you can see it. As changes are made, the page **updates automatically**.

When you're done looking, press **Ctrl + C** in the terminal to stop it.

> 💡 **If localhost is slow to load** (it can be, on a modest computer), you don't have to rely on it. Every Pull
> Request you open in [Part 4](#part-4--publish-your-change-the-important-part) also gets its own **preview link** from
> Vercel — a real web address with only your change on it. Checking there works just as well. Use whichever is faster.

> 🔎 **Golden rule:** whichever preview you use — localhost or the PR link — if it doesn't look right, don't publish it
> yet. Fix it first.

---

## Part 4 — Publish your change (the important part)

Publishing means putting your change on a **branch**, opening a **Pull Request (PR)**, and **merging** it. Claude Code
does all of these when you ask — the plain-English request is the main thing; the small grey command under each step is
just *what Claude Code runs behind the scenes*, so you can see what's happening.

### Step 1 — Start a branch
A branch is a private workspace for one change, so the live site is never affected until you're ready.
> Ask: *"Start a new branch called `update-pricing-copy`."*
> Behind the scenes: `git checkout -b update-pricing-copy`

### Step 2 — Make the change and preview it
Describe the edit (Part 2), then check it on **localhost** or the PR preview link (Part 3).

### Step 3 — Save and send it to GitHub (commit + push)
> Ask: *"Commit this with the message 'Update annual plan heading' and push it."*
> Behind the scenes: `git commit -m "Update annual plan heading"` then `git push`

### Step 4 — Open a Pull Request
> Ask: *"Open a pull request for this."*
> Behind the scenes: `gh pr create`

### Step 5 — Check the preview link
Within a minute or two, **Vercel** posts a **preview deployment** on your PR — a temporary web address with *only your
change* on it. Ask Claude Code *"open the PR in my browser"* (`gh pr view --web`), click the preview, and confirm it
looks right. If something's off, go back to Step 2 — the same PR and preview update automatically.

### Step 6 — Merge it → it goes live
When the preview looks good:
> Ask: *"Merge the pull request."*
> Behind the scenes: `gh pr merge`

Merging into **`main`** is what publishes to production. Vercel notices the update to `main` and automatically rebuilds
and deploys your live site — usually within a couple of minutes. Open your real site to confirm it's there.

That's the whole loop. Next time, start again at Step 1.

---

## Part 5 — If something looks wrong on the live site

Don't panic, and don't rush a fix. Vercel keeps every previous version of your site.
1. Go to your project in the **Vercel dashboard** → **Deployments**.
2. Find the last version that was working (before your change).
3. Click the **···** menu → **Promote to Production**.

Your site instantly goes back to that known-good version. Then you can calmly fix the issue on a new branch and
publish again.

---

## A few things not to break

- **Never commit `.env.local`** or paste secret keys into GitHub or a chat. Only the *publishable* Supabase key is safe
  to expose; everything else is secret.
- **The `VITE_` name prefix is special.** Any setting whose name starts with `VITE_` gets bundled into the public
  browser code (so it must be safe to show the world). Everything without that prefix is server-only and secret. Don't
  rename settings to add/remove `VITE_` without knowing this.
- **If a deploy fails or the site won't build**, open the failed deployment in the **Vercel dashboard** and read the
  logs — the error usually says exactly what went wrong. (You can also ask Claude Code to explain the error.) Share it
  with the team if you're unsure.

---

## Where to learn more

Already in your repo when you want deeper detail:
- **`CLAUDE.md`** — a full technical map of the project (great to point Claude Code at).
- **`docs/production-env-vars.md`** — every setting the app needs and where to get its value.
- **`docs/merge-to-main-checklist.md`** — the checklist the team uses before big production releases.
- **`docs/production-checklist.md`** — the Supabase and Stripe dashboard settings behind the scenes.

You've got this. Start small — a wording change is a perfect first edit — and repeat the loop until it feels routine.

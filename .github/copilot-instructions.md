# Copilot instructions for this repo

This is Yves De Boeck's personal portfolio site: a single-page marketing site (`/`) plus a
small technical blog (`/blog/*`). Next.js App Router, static export, deployed to Firebase
Hosting.

## Read this first

`AGENTS.md` (aliased from `CLAUDE.md`) states that the installed Next.js version has
breaking changes vs. training data and instructs agents to check
`node_modules/next/dist/docs/` before writing code and to heed deprecation notices. Follow
that instruction — verify current Next.js 15 App Router APIs against the installed
version rather than assuming older/training-era behavior, since this project uses
`output: "export"` (static export) which restricts what App Router features are usable
(no server actions, no dynamic route handlers, no ISR/on-demand revalidation, no
`ppr`, etc.).

## Build, dev, and lint

- `npm run dev` — dev server. No fixed port in `package.json`; if 3000 is taken it will
  pick another (e.g. 3001). Set `PORT=3001 npm run dev` to pin it.
- `npm run build` — production build **and** static export (`next.config.ts` sets
  `output: "export"`), writing to `out/`. This is also the correct way to typecheck +
  build before deploying.
- `npx tsc --noEmit` — fast typecheck without a full build.
- `npm run lint` — runs ESLint (`eslint-config-next`). There is a known, pre-existing,
  unrelated failure: `@rushstack/eslint-patch` is incompatible with ESLint 9 and prints
  `Failed to patch ESLint because the calling module was not recognized`. This does **not**
  fail the build (`next build` continues past it) and should not be "fixed" as part of
  unrelated work.
- There is no test suite/framework in this repo (no `*.test.*`/`*.spec.*` files, no test
  runner in `package.json`). Don't invent one unless asked.
- **Stale `.next` cache**: if a long-running `next dev` process is left up across large
  batches of file changes, or a dev server and `next build` run concurrently, you can get
  webpack module-resolution errors (`Cannot find module './NNN.js'`) or `PageNotFoundError`
  for routes that clearly exist. Fix: stop the dev server, `rm -rf .next`, rebuild/restart.

## Deployment

Deploys are manual, not CI-driven (no `.github/workflows/`).

1. `npm run build` (produces `out/`)
2. `npx firebase-tools deploy --only hosting` (project id `ydb-solutions-portfolio`, set in
   `.firebaserc`; hosting config in `firebase.json` serves `out/` with `cleanUrls` and a
   catch-all rewrite to `/index.html`)
3. Live at `https://portfolio.ydb-solutions.com` (custom domain) and
   `https://ydb-solutions-portfolio.web.app`.

If `firebase-tools` reports expired credentials, `npx firebase-tools login` (or
`login --reauth`) requires an interactive browser flow — it cannot be completed
headlessly by an agent.

## Git conventions

- Never mention Copilot, AI, agents, or any assistant/tool name in commit messages, PR
  titles/descriptions, branch names, or code comments. No `Co-authored-by` trailers for
  Copilot/AI tooling either.
- Commit messages: max 80 characters (subject line), no exceptions.
- Before committing, re-check any new/changed prose (blog posts, copy in `data.ts`, docs,
  etc.) for tells that it was LLM-written and rewrite them out. Grep for these patterns
  (based on Wikipedia's documented "Signs of AI writing" plus common LLM vocabulary):
  - **Em dashes (—)** anywhere. Use a comma, period, parentheses, or a plain hyphen
    instead.
  - **Undue-significance phrasing**: "stands/serves as", "is a testament/reminder",
    "plays a crucial/pivotal/vital/key role", "underscores/highlights its importance",
    "marks a shift", "key turning point", "evolving landscape", "deeply rooted".
  - **Superficial tacked-on "-ing" clauses** at the end of sentences: "..., ensuring
    X", "..., highlighting Y", "..., reflecting Z", "..., fostering W". These are
    usually unearned editorializing and can just be deleted.
  - **Promotional/travel-guide language**: "boasts", "vibrant", "rich" (as filler),
    "seamless", "robust", "groundbreaking", "renowned", "nestled", "in the heart of",
    "diverse array", "game-changer", "cutting-edge".
  - **Generic LLM stock vocabulary**: "delve", "leverage" (as a verb for "use"),
    "unlock", "elevate", "embark", "navigate the complexities", "landscape"/"realm" as
    abstract nouns, "tapestry", "unwavering".
  - **Vague attribution / weasel wording**: "industry reports", "observers/experts
    argue", "several sources suggest" (when none are cited), "some critics say".
  - **Formulaic constructions**: "it's not just X, it's Y", "the real Z isn't A, it's
    B", "in today's fast-paced world", "in conclusion", "it is important to note
    that", "let's dive in".
  - **Outline-shaped "Challenges" / "Future Outlook" padding**: a section that opens
    with "Despite its ..., X faces several challenges" and closes with vague
    forward-looking optimism. Cut it unless there's a genuinely specific point to
    make.
  This applies to `src/lib/data.ts` copy, `src/lib/posts.ts` blurbs, and every
  `src/app/blog/*/page.tsx` body — not to this instructions file itself.

## Architecture

**Content lives in `src/lib/data.ts`, not in components.** It's one file exporting several
arrays/objects consumed by section components: `profile`, `experiences`, `projects`,
`skillGroups`, `certifications`, `education`. When asked to change copy, job history,
project descriptions, cert lists, etc., edit `data.ts` — the components in
`src/components/sections/*.tsx` are just renderers and rarely need changes for content
edits.

**The one-page site (`src/app/page.tsx`) is a fixed stack of section components**, each a
`<section id="...">` matching an anchor in `src/components/Navbar.tsx` (`#hero`, `#about`,
etc.). Adding a new homepage section means: create the component, add it to the `<main>`
list in `page.tsx` in the right position, and add a nav entry in `Navbar.tsx`.

**The blog is two decoupled data sources you must keep in sync manually:**
- `src/lib/posts.ts` — an index array (`slug`, `title`, `blurb`, `date`, `readingTime`,
  `tags`) that only feeds the `/blog` listing page (`src/app/blog/page.tsx`).
- `src/app/blog/<slug>/page.tsx` — the actual post content, one hand-written file per
  post, each its own React component (not generated from markdown/MDX, no CMS, no
  filesystem-based slug resolution).

Adding a new post requires **both**: a new entry in `posts.ts` and a new
`src/app/blog/<slug>/page.tsx`. Every post file uses the shared prose components from
`src/components/blog/Prose.tsx` (`H2`, `H3`, `P`, `Em`, `Code`, `Pre`, `UL`/`LI`,
`Abstract`, `KeyPoint`, `Callout`, `Table`) for consistent typography — don't hand-roll
raw `<p>`/`<h2>` tags in post bodies, use these.

**Projects and their write-ups are linked, not derived.** Each entry in the `projects`
array in `data.ts` has a `writeup` field pointing at a `/blog/<slug>` route; there's no
automatic relationship enforced between a project card and its post beyond that string —
if you rename a post's slug, update `writeup` in `data.ts` too.

**Clickable-document pattern**: `Certifications.tsx` and `Education.tsx` both follow the
same convention — each data item optionally has a `file` field (path under
`public/docs/`); if present, the tile renders as an `<a target="_blank" href={file}>`
opening the PDF in a new tab, otherwise a plain non-interactive `<div>`. Follow this same
pattern for any other "document tile" additions rather than introducing a modal/lightbox.

**Project cover art**: `public/images/projects/<slug>.svg` are hand-generated abstract
geometric covers (dark/cyan theme, one per project), not screenshots — used for
`image` in `data.ts` project entries when there's no `video` demo. Keep this
no-screenshots convention for any employer/customer-facing project since customer names
and internal UI can't be shown (see confidentiality note below).

## Key conventions

- **Client components**: any section using `framer-motion` (`whileInView` scroll
  animations) or other interactivity is marked `"use client"` at the top (see
  `Certifications.tsx`, `Projects.tsx`). Static/no-interaction sections omit it.
- **Styling**: Tailwind v4 utility classes inline, no CSS modules/styled-components. Dark
  theme built on `slate-950`/`slate-800`/`slate-400` with a `cyan-400`/`cyan-500` accent —
  match this palette in new UI rather than introducing new colors.
- **Path alias**: `@/*` maps to `src/*` (see `tsconfig.json`), used throughout — prefer it
  over relative `../../` imports.
- **Icons**: `lucide-react` throughout; no other icon library.
- **Confidentiality in project/blog content**: professional-project write-ups intentionally
  avoid naming the employer or any customer, and never include secrets, hostnames, IPs, or
  connection strings — use generic phrasing like "a large industrial company" or "my
  employer." Preserve this when editing existing posts or adding new ones about
  professional work.
- **Voice in blog posts**: posts are written in first-person as the author describing
  systems he built and owns (e.g. "I built...", "I chose X over Y because..."), never as
  an external reviewer discovering someone else's code (avoid phrasing like "I found...",
  "what stood out to me...", "the repo shows..."). Keep this in mind if generating or
  editing post content.

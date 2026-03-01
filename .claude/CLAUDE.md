# Briefer — Claude Notes

## Project Identity
- **App name**: Briefer
- **Company**: SteepWorksAi
- **Repo**: `steepworksai/briefer` (lowercase — renamed Feb 2026)
- **License**: MIT © 2026 SteepWorksAi
- **Version**: 1.0.0
- **Homepage**: `https://briefer.steepworksai.com/`

## Tech Stack
- Chrome MV3 extension — side panel (not popup)
- Vite + CRXJS + React + TypeScript
- AI: Google Gemini 2.5 Flash (text) + Gemini 2.5 Flash Image (doodle)
- Storage: `chrome.storage.sync` (API key, tourSeen) + `chrome.storage.local` (history, logs)

## Key Files
- `src/lib/api.ts` — Gemini text API, `summarize()`, `summarizeVideo()`
- `src/lib/doodle.ts` — Gemini image API, AI Doodle generation
- `src/lib/history.ts` — summary persistence, `deriveTopic()`, CRUD
- `src/lib/transcripts.ts` — YouTube + DeepLearning.AI transcript extraction
- `src/panel/App.tsx` — main app, page extraction, state
- `src/panel/components/Summary.tsx` — renders summary result
- `src/panel/components/DoodleMindMap.tsx` — Rough.js interactive mind map
- `src/panel/components/History.tsx` — per-topic grouped history view
- `src/panel/components/Tour.tsx` — first-launch onboarding tour (3 slides)
- `src/panel/components/TokenSetup.tsx` — Gemini API key setup UI
- `src/background/index.ts` — service worker, message routing
- `src/lib/logger.ts` — logs to chrome.storage.local + localhost:3747

## Architecture Decisions
- `chrome.windows.create` must be routed through background service worker — silently fails from side panel context
- Page text extraction uses inline `executeScript` function (avoids content script timing issues)
- Tour shown on first launch via `tourSeen` flag in `chrome.storage.sync`
- History auto-saves on every summary, deduplicates by URL (latest wins), max 100 entries
- Topic derived from page title (strip site suffix) or first 4 non-stopword words from TLDR

## AI Doodle — Spelling Fix
**Problem:** Gemini image model (`gemini-2.5-flash-image`) misspells long/technical words
because it pattern-matches visual shapes rather than spelling character by character.
Common victims: `photosynthesis`, `backpropagation`, `mitochondria`, domain-specific terms.

**Fix applied in `src/lib/doodle.ts`:**
- `sanitizeLongWords()` splits any word ≥ 13 chars at midpoint with a hyphen before sending to Gemini
- Full sentences and context are preserved — only long words are split
- Example: `photosynthesis` → `photosyn-thesis`, `backpropagation` → `backprop-agation`
- Do NOT revert to short labels (≤6 words) — that loses academic context

## Gemini API
- Text model: `gemini-2.5-flash`
- Image model: `gemini-2.5-flash-image` (for AI Doodle)
- `maxOutputTokens: 8192` for text (critical — lower values truncate summaries)
- `temperature: 0.3` for text

## Summary Modes
- Quick Read: TLDR, Key Points, Takeaway
- Deep Dive: TLDR, Core Problem, Solution Mechanism, Structural Shift, Why It's Better, Key Takeaways

## History
- Stored in `chrome.storage.local` under key `summaryHistory`
- Max 100 entries, grouped by topic in UI
- `deriveTopic()`: strips site suffix from page title → falls back to 4 TLDR keywords
- Topic editable inline per entry (📁 button)

## Onboarding Tour
- **3 slides**: Welcome → Builds your knowledge base → Private by design
- Shown once on first launch, gated by `tourSeen` in `chrome.storage.sync`
- Last slide (Private by design): body is `string[]` — renders as `<ul>` with emoji bullets
  - `🔑` item: API key setup instruction
  - `🔒` item: privacy/no tracking assurance
  - Slide icon: `🔐`
- `done()` uses callback: `chrome.storage.sync.set({ tourSeen: true }, () => onDone())`
- To reset tour for testing: `chrome.storage.sync.remove("tourSeen")` in DevTools console

## Dead Code Removed
These were removed and should NOT be re-added:
- `SpeechPlayer.tsx`, `useSpeech.ts` — TTS UI (ElevenLabs + InWorld engines)
- `FollowUp.tsx` — follow-up Q&A component
- `Toolbar.tsx` — old toolbar
- `extractor.ts` — replaced by inline `extractPageTextInPage()` in App.tsx
- `elevenlabs.ts`, `inworld.ts` — TTS provider libs
- `followUp()` in api.ts + `FOLLOW_UP` handler in background

## Manifest
- `host_permissions`: `<all_urls>` + `https://generativelanguage.googleapis.com/` ONLY
- Dead permissions removed: `elevenlabs.io`, `inworld.ai`, `localhost:3747`
- `homepage_url`: `https://briefer.steepworksai.com/`
- Description: "Instantly summarize articles, YouTube videos, Coursera & DeepLearning.AI courses — TLDR, key points, AI sketchnote."

## Docs (GitHub Pages + Custom Domain)
- `docs/index.html` — landing page
- `docs/privacy.html` — privacy policy
- `docs/icon128.png` — extension icon
- `docs/CNAME` — `briefer.steepworksai.com`
- Publish: repo Settings → Pages → Source → `docs/` on `main`
- DNS: CNAME record `briefer` → `steepworksai.github.io` (add in domain registrar)
- Live at: `https://briefer.steepworksai.com/`

## Chrome / Edge Store Submission
- `briefer-1.0.0.zip` — 103 KB, built and ready in repo root
- Promo images in `store-assets/`: 440×280, 920×680, 1400×560
- Privacy policy URL: `https://briefer.steepworksai.com/privacy.html`
- Category: Productivity
- Chrome store: https://chrome.google.com/webstore/devconsole
- Edge store: https://partner.microsoft.com/en-us/dashboard/microsoftedge/overview
- **Still needed**: 1–5 screenshots at 1280×800 (take manually in Chrome)

## Store Listing Copy
**Short description (116 chars):**
Instantly summarize articles, YouTube videos, Coursera & DeepLearning.AI courses — TLDR, key points, AI sketchnote.

**Full description:** See session history or docs/index.html for full copy.

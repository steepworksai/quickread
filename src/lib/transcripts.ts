// ─── Platform detection ───────────────────────────────────────────────────────
export type TranscriptPlatform = "youtube" | "deeplearning" | null;

export function detectPlatform(url: string): TranscriptPlatform {
  if (url.includes("youtube.com/watch") && url.includes("v=")) return "youtube";
  if (url.includes("learn.deeplearning.ai")) return "deeplearning";
  return null;
}

// ─── Result type ──────────────────────────────────────────────────────────────
export interface TranscriptResult {
  title: string;
  transcript: string;
  platform: TranscriptPlatform;
}

// ─── YouTube ─────────────────────────────────────────────────────────────────
// Runs inside the page via executeScript — must be self-contained, no imports
export function extractYouTubeInfoInPage(): { captionUrl: string | null; title: string } | null {
  try {
    const player = (window as any).ytInitialPlayerResponse;
    if (!player) return null;

    const title: string = player?.videoDetails?.title ?? "YouTube Video";
    const tracks: any[] =
      player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

    if (tracks.length === 0) return { captionUrl: null, title };

    // Prefer: manual English > auto-generated English > any track
    const rank = (t: any): number => {
      const lang: string = (t.languageCode ?? "").toLowerCase();
      const isAuto: boolean = t.kind === "asr";
      if (lang.startsWith("en") && !isAuto) return 0;
      if (lang.startsWith("en") && isAuto)  return 1;
      return 2;
    };

    const best = [...tracks].sort((a, b) => rank(a) - rank(b))[0];
    const raw: string = best.baseUrl ?? "";
    const captionUrl = raw
      ? raw + (raw.includes("?") ? "&fmt=json3" : "?fmt=json3")
      : null;

    return { captionUrl, title };
  } catch {
    return null;
  }
}

export async function fetchYouTubeTranscript(captionUrl: string): Promise<string> {
  const resp = await fetch(captionUrl);
  if (!resp.ok) throw new Error(`Caption fetch failed: ${resp.status}`);
  const data = await resp.json();

  return (data.events ?? [])
    .flatMap((evt: any) => (evt.segs ?? []).map((s: any) => (s.utf8 ?? "").replace(/\n/g, " ")))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── DeepLearning.AI ──────────────────────────────────────────────────────────
// Runs inside the page via executeScript — must be self-contained, no imports
export async function extractDeepLearningTranscriptInPage(): Promise<{ title: string; transcript: string } | null> {
  try {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // Title
    const titleEl =
      document.querySelector("h1") ??
      document.querySelector("[class*='title']") ??
      document.querySelector("title");
    const title = titleEl?.textContent?.trim() ?? "DeepLearning.AI Video";

    // ── Step 1: click "Show Transcript" if present ───────────────────────────
    const allButtons = Array.from(document.querySelectorAll("button"));
    const showBtn = allButtons.find(
      (b) => /show\s+transcript/i.test(b.textContent ?? "")
    );
    if (showBtn) {
      (showBtn as HTMLButtonElement).click();
      await sleep(1200); // wait for panel to animate open
    }

    // ── Step 2: extract transcript text ─────────────────────────────────────
    const transcriptSelectors = [
      "[class*='transcript']",
      "[class*='Transcript']",
      "[data-purpose*='transcript']",
      ".phrase-text",
      "[class*='subtitle']",
      "[class*='caption']",
    ];

    for (const sel of transcriptSelectors) {
      const els = Array.from(document.querySelectorAll(sel));
      if (els.length > 0) {
        const text = els.map((el) => el.textContent?.trim()).filter(Boolean).join(" ");
        if (text.split(/\s+/).length > 20) return { title, transcript: text };
      }
    }

    // ── Step 3: fallback to main content area ────────────────────────────────
    const noiseTags = new Set(["script","style","noscript","nav","header","footer","button","aside"]);
    const container =
      document.querySelector("main") ??
      document.querySelector("article") ??
      document.querySelector("[class*='content']") ??
      document.querySelector("[class*='lesson']") ??
      document.body;

    const clone = container!.cloneNode(true) as Element;
    for (const el of Array.from(clone.querySelectorAll("*"))) {
      if (noiseTags.has(el.tagName.toLowerCase())) el.remove();
    }
    const text = (clone.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text.split(/\s+/).length > 20) return { title, transcript: text };

    // ── Last resort ───────────────────────────────────────────────────────────
    const bodyText = (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
    return bodyText.length > 50 ? { title, transcript: bodyText } : null;
  } catch {
    return null;
  }
}

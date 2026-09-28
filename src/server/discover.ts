// Discovery (Devpost open-contests API): the public JSON feed the site itself
// renders from — structured open_state, dates, prizes, themes, org. This
// replaced Parallel web search as the primary discovery source: web search
// returned SEO pages (homepage, categories, marketing, project galleries) and
// famous-but-ended contests, while missing current ones from major companies.
// The API list includes Google / NVIDIA / Amazon / Meta / MLH-run hackathons.

export type DiscoveredContest = {
  title: string;
  url: string;
  org: string | null;
  dates: string | null;
  timeLeft: string | null;
  prizeAmount: string | null;
  themes: string[];
  registrations: number;
  featured: boolean;
  online: boolean;
};

// Hosts whose contests a builder should rarely miss.
const MAJOR_ORGS =
  /google|nvidia|amazon|microsoft|meta\b|aws|apple|ibm|mlh|revenuecat|openai|anthropic|cloudflare|nebius|xprize|opencv/i;

function stripPrizeHtml(raw: string | null): string | null {
  if (!raw) return null;
  const text = raw.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return text || null;
}

type RawHackathon = {
  title?: string;
  url?: string;
  open_state?: string;
  displayed_location?: { location?: string } | null;
  submission_period_dates?: string | null;
  time_left_to_submission?: string | null;
  themes?: { name?: string }[] | null;
  prize_amount?: string | null;
  registrations_count?: number | null;
  featured?: boolean;
  organization_name?: string | null;
  invite_only?: boolean;
};

function normalize(h: RawHackathon): DiscoveredContest | null {
  if (!h.title || !h.url) return null;
  let url = h.url;
  if (url.startsWith("//")) url = "https:" + url;
  else if (url.startsWith("/")) url = "https://devpost.com" + url;
  return {
    title: h.title,
    url,
    org: h.organization_name ?? null,
    dates: h.submission_period_dates ?? null,
    timeLeft: h.time_left_to_submission ?? null,
    prizeAmount: stripPrizeHtml(h.prize_amount ?? null),
    themes: (h.themes ?? []).map((t) => t?.name ?? "").filter(Boolean),
    registrations: h.registrations_count ?? 0,
    featured: !!h.featured,
    online: (h.displayed_location?.location ?? "").toLowerCase().includes("online"),
  };
}

export async function fetchOpenDevpostContests(): Promise<DiscoveredContest[]> {
  const pages = await Promise.all(
    [1, 2].map((p) =>
      fetch(`https://devpost.com/api/hackathons?status=open&page=${p}`, {
        headers: { Accept: "application/json", "User-Agent": "caddie-poc" },
      }).then((res) => (res.ok ? res.json() : { hackathons: [] })).catch(() => ({ hackathons: [] })),
    ),
  );
  const seen = new Set<string>();
  const out: DiscoveredContest[] = [];
  for (const page of pages as { hackathons?: RawHackathon[] }[]) {
    for (const raw of page.hackathons ?? []) {
      if (raw.open_state !== "open" || raw.invite_only) continue;
      const contest = normalize(raw);
      if (!contest || seen.has(contest.url)) continue;
      seen.add(contest.url);
      out.push(contest);
    }
  }
  if (out.length === 0) throw new Error("Devpost open-contests feed returned nothing.");
  return out;
}

// Rank live contests against the builder: stack-term matches first, then the
// org boost (never miss the major companies), then reach signals.
export function rankContests(
  contests: DiscoveredContest[],
  stack: string[],
): (DiscoveredContest & { score: number })[] {
  const terms = stack.map((s) => s.toLowerCase()).filter(Boolean);
  return contests
    .map((c) => {
      const haystack = `${c.title} ${c.org ?? ""} ${c.themes.join(" ")}`.toLowerCase();
      let score = 0;
      for (const term of terms) if (haystack.includes(term)) score += 2;
      if (c.org && MAJOR_ORGS.test(c.org)) score += 3;
      if (c.featured) score += 1;
      if (c.registrations > 1000) score += 1;
      if (c.prizeAmount && !/^\$0/.test(c.prizeAmount)) score += 1;
      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score || b.registrations - a.registrations);
}

// Fallback discovery when the feed is unreachable — Parallel web search.
export async function fallbackWebSearch(query: string) {
  const { parallelSearchDevpost } = await import("./parallel");
  return parallelSearchDevpost(query);
}
// Proof-of-work page generator. Rewrites work.html from live GitHub data plus
// the curated descriptions in work-config.json, and is re-run on a schedule so
// the page ages by itself instead of going stale the moment it ships.
//
// Two rules this file exists to enforce:
//
//   1. NOTHING IS DISCOVERED. Only repos named in work-config.json are
//      rendered. Listing every repo the token can see would put private work
//      on a public page the first time a new repo appeared.
//   2. NUMBERS ARE DERIVED, NEVER TYPED. Test counts come from parsing the
//      actual test files; languages and dates come from the API. A portfolio
//      that overstates is worse than one that undersells, and hand-maintained
//      figures drift the moment anyone forgets.
//
// Auth: WORK_PAT (or GITHUB_TOKEN) — needs read access to the private repos to
// count their tests. Missing/expired token degrades gracefully: the repo still
// renders, its test count reads "—", and the page still builds.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const cfg = JSON.parse(readFileSync(new URL("../work-config.json", import.meta.url), "utf8"));
const TOKEN = process.env.WORK_PAT || process.env.GITHUB_TOKEN || "";
const H = {
  "User-Agent": "proof-of-work",
  ...(TOKEN ? { Authorization: `token ${TOKEN}` } : {}),
};

async function gh(path, raw = false) {
  const r = await fetch(`https://api.github.com${path}`, {
    headers: raw ? { ...H, Accept: "application/vnd.github.raw" } : H,
  });
  if (!r.ok) return null; // never let one repo take the page down
  return raw ? r.text() : r.json();
}

// ---------------------------------------------------------------- helpers

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function rel(iso) {
  if (!iso) return "—";
  const d = (Date.now() - new Date(iso).getTime()) / 864e5;
  if (d < 1) return "today";
  if (d < 2) return "yesterday";
  if (d < 30) return `${Math.floor(d)}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

// Count real test cases rather than trusting a number in a config file.
// The Luau suites are a flat list of `test("name", function() ... end)` calls
// at column zero, so counting those call sites is exact.
//
// The pattern is deliberately strict — anchored to the line start and
// requiring the opening quote of the test's name. A looser `\btest\s*\(`
// also matches the harness's own `local function test(name, fn)` and the
// literal "test(s) failed" in its summary line, which inflated every suite by
// exactly two. Verified against a real run: night-shift reports 63 passing and
// this returns 63.
async function countTests(repo) {
  const src = await gh(`/repos/${cfg.owner}/${repo}/contents/tests/run.luau`, true);
  if (!src) return null;
  const m = src.match(/^[ \t]*test\s*\(\s*"/gm);
  return m ? m.length : null;
}

// ---------------------------------------------------------------- fetch

const wanted = cfg.groups.flatMap((g) => g.repos.map((r) => r.name));
const meta = new Map();

await Promise.all(
  wanted.map(async (name) => {
    const r = await gh(`/repos/${cfg.owner}/${name}`);
    if (r) meta.set(name, r);
  })
);

// Last-known test counts, recovered from the page we are about to overwrite.
// The counts are the strongest thing on this page and they need a token that
// can read private repos -- and tokens expire. Without this, the morning the
// PAT lapses the page would quietly rebuild with every count blank and still
// report success, which is exactly how the Notion brain backup died for eight
// days unnoticed. Falling back to the previous number keeps the page honest
// (it says when it last verified) instead of silently emptying it.
const prevPath = new URL("../work.html", import.meta.url);
const prevCounts = new Map();
if (existsSync(prevPath)) {
  const prev = readFileSync(prevPath, "utf8");
  const re = /<h3>([a-z0-9._-]+)<\/h3>[\s\S]{0,400}?>(\d+) tests</gi;
  for (const m of prev.matchAll(re)) prevCounts.set(m[1], Number(m[2]));
}

const testCounts = new Map();
const staleCounts = [];
await Promise.all(
  cfg.groups
    .flatMap((g) => g.repos)
    .filter((r) => r.tests === "src")
    .map(async (r) => {
      const n = await countTests(r.name);
      if (n) {
        testCounts.set(r.name, n);
      } else if (prevCounts.has(r.name)) {
        testCounts.set(r.name, prevCounts.get(r.name));
        staleCounts.push(r.name);
      }
    })
);

// ---------------------------------------------------------------- totals

const totalTests = [...testCounts.values()].reduce((a, b) => a + b, 0);
const langs = new Map();
for (const r of meta.values()) {
  if (r.language) langs.set(r.language, (langs.get(r.language) || 0) + 1);
}
const topLangs = [...langs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l]) => l);

const NINETY = Date.now() - 90 * 864e5;
const activeCount = [...meta.values()].filter((r) => new Date(r.pushed_at).getTime() > NINETY).length;

const liveLinks = cfg.groups.flatMap((g) => g.repos).filter((r) => r.live);
const gameCount = (cfg.groups.find((g) => g.id === "games")?.repos ?? []).length;
// Count what is actually RENDERED, not what the API happened to resolve. With a
// lapsed token meta.size collapses while the cards below still list every
// project, and a headline stat that disagrees with the list under it reads as
// broken -- or worse, as understating on purpose.
const projectCount = wanted.length;

// Prose in the config may use {games}; substitute so a stated count can never
// disagree with the list actually rendered below it.
const fill = (t) => String(t ?? "").replaceAll("{games}", String(gameCount));

const nz = new Intl.DateTimeFormat("en-NZ", {
  timeZone: "Pacific/Auckland",
  dateStyle: "long",
  timeStyle: "short",
}).format(new Date());

// ---------------------------------------------------------------- render

const stat = (n, label, sub) => `
      <div class="pw-stat tile">
        <div class="pw-n">${esc(n)}</div>
        <div class="pw-l">${esc(label)}</div>
        ${sub ? `<div class="pw-s">${esc(sub)}</div>` : ""}
      </div>`;

function repoRow(r) {
  const m = meta.get(r.name);
  const tests = testCounts.get(r.name);
  const url = `https://github.com/${cfg.owner}/${r.name}`;
  const isPublic = m && m.private === false;
  return `
        <article class="pw-repo tile">
          <header class="pw-repo-h">
            <h3>${esc(r.name)}</h3>
            <div class="pw-tags">
              ${m?.language ? `<span class="pw-tag">${esc(m.language)}</span>` : ""}
              ${tests ? `<span class="pw-tag pw-tag-on">${tests} tests</span>` : ""}
              ${m ? `<span class="pw-tag pw-tag-dim">updated ${esc(rel(m.pushed_at))}</span>` : ""}
            </div>
          </header>
          <p>${esc(r.what)}</p>
          <div class="pw-links">
            ${r.live ? `<a class="pw-go" href="${esc(r.live)}" rel="noopener">Open it &rarr;</a>` : ""}
            ${isPublic ? `<a class="pw-src" href="${esc(url)}" rel="noopener">Source</a>` : `<span class="pw-src pw-off">Private repo</span>`}
          </div>
        </article>`;
}

const groupsHtml = cfg.groups
  .map(
    (g) => `
      <section class="pw-group" id="pw-${esc(g.id)}">
        <h2>${esc(g.title)}</h2>
        <p class="pw-blurb">${esc(fill(g.blurb))}</p>
        <div class="pw-grid">${g.repos.map(repoRow).join("")}</div>
      </section>`
  )
  .join("");

const highlightsHtml = cfg.highlights
  .map(
    (h) => `
        <div class="pw-hl tile">
          <h3>${esc(h.label)}</h3>
          <p>${esc(h.body)}</p>
        </div>`
  )
  .join("");

const html = `<!DOCTYPE html>
<html lang="en-NZ">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Proof of Work — Aden Kingi</title>
<meta name="description" content="A live, self-updating record of what Aden Kingi has actually shipped: ${projectCount} projects, ${totalTests} automated tests, ${gameCount} games on a shared CI platform. Rebuilt from the GitHub API every morning.">
<meta name="robots" content="index,follow">
<link rel="canonical" href="https://kingithegreat.github.io/work.html">
<meta property="og:title" content="Proof of Work — Aden Kingi">
<meta property="og:description" content="${projectCount} projects, ${totalTests} automated tests, ${gameCount} games on one shared CI platform. This page rebuilds itself daily from the GitHub API.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://kingithegreat.github.io/work.html">
<meta property="og:image" content="https://kingithegreat.github.io/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#141043">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Schibsted+Grotesk:wght@400;500;600&family=Spline+Sans+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{
  --deep:#141043; --pool:#1F1A63; --jade:#5CE0BE; --fern:#7FE9F5;
  --mist:#EFEBFF; --moss:#ADA6E2; --lamp:#FFD98A;
  --glass:rgba(255,255,255,.06); --glass-strong:rgba(255,255,255,.095);
  --edge:rgba(160,206,255,.20); --edge-bright:rgba(92,224,190,.44);
  --display:"Bricolage Grotesque",system-ui,sans-serif;
  --body:"Schibsted Grotesk",system-ui,sans-serif;
  --data:"Spline Sans Mono",ui-monospace,monospace;
  --r:26px; --gutter:clamp(20px,5vw,72px);
}
*{box-sizing:border-box}
html{scroll-padding-top:96px}  /* sticky nav is ~76px + breathing room */
body{
  margin:0; background:var(--deep); color:var(--mist); font-family:var(--body);
  line-height:1.6; -webkit-font-smoothing:antialiased;
  background-image:
    radial-gradient(1100px 620px at 12% -8%, rgba(92,224,190,.12), transparent 62%),
    radial-gradient(900px 560px at 88% 4%, rgba(127,233,245,.10), transparent 60%);
  background-attachment:fixed;
}
a{color:var(--jade)}
.wrap{max-width:1120px;margin:0 auto;padding:0 var(--gutter)}
.tile{
  background:var(--glass); border:1px solid var(--edge); border-radius:var(--r);
  backdrop-filter:blur(10px);
}
.nav{
  display:flex;gap:18px;align-items:center;flex-wrap:wrap;
  margin:20px auto;max-width:1120px;padding:12px 20px;
  position:sticky;top:14px;z-index:20;
}
.nav .brand{font-family:var(--display);font-weight:800;color:var(--mist);text-decoration:none;margin-right:auto;font-size:1.05rem}
.nav a.link{color:var(--moss);text-decoration:none;font-size:.93rem}
.nav a.link:hover,.nav a.link:focus-visible{color:var(--jade)}

header.pw-hero{padding:clamp(40px,7vw,84px) 0 8px}
.pw-eyebrow{
  font-family:var(--data);font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;
  color:var(--jade);display:block;margin-bottom:14px
}
h1{
  font-family:var(--display);font-weight:800;line-height:1.02;margin:0 0 14px;
  font-size:clamp(2.3rem,6.2vw,4.1rem);letter-spacing:-.02em
}
h1 em{font-style:normal;color:var(--jade)}
.pw-lede{font-size:clamp(1.02rem,2vw,1.2rem);color:var(--mist);max-width:64ch;margin:0 0 10px}
.pw-sub{color:var(--moss);max-width:66ch;margin:0}

.pw-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin:34px 0 8px}
.pw-stat{padding:20px}
.pw-n{font-family:var(--display);font-weight:800;font-size:clamp(1.9rem,4.4vw,2.7rem);color:var(--jade);line-height:1}
.pw-l{font-weight:600;margin-top:6px}
.pw-s{color:var(--moss);font-size:.85rem;margin-top:3px}

section{padding:clamp(38px,6vw,68px) 0 0}
h2{font-family:var(--display);font-weight:700;font-size:clamp(1.5rem,3.2vw,2.05rem);margin:0 0 10px;letter-spacing:-.01em}
.pw-blurb{color:var(--moss);max-width:74ch;margin:0 0 24px}

.pw-hls{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.pw-hl{padding:22px}
.pw-hl h3{font-family:var(--display);font-size:1.05rem;margin:0 0 8px;color:var(--fern)}
.pw-hl p{margin:0;color:var(--moss);font-size:.94rem}

.pw-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}
.pw-repo{padding:22px;display:flex;flex-direction:column;gap:10px}
.pw-repo-h{display:flex;flex-direction:column;gap:9px}
.pw-repo h3{font-family:var(--data);font-size:1rem;margin:0;color:var(--mist);word-break:break-word}
.pw-repo p{margin:0;color:var(--moss);font-size:.93rem;flex:1}
.pw-tags{display:flex;flex-wrap:wrap;gap:6px}
.pw-tag{
  font-family:var(--data);font-size:.72rem;padding:3px 9px;border-radius:999px;
  background:var(--glass-strong);border:1px solid var(--edge);color:var(--moss)
}
.pw-tag-on{border-color:var(--edge-bright);color:var(--jade)}
.pw-tag-dim{opacity:.8}
.pw-links{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:2px}
.pw-go{font-weight:600;text-decoration:none}
.pw-go:hover{text-decoration:underline}
.pw-src{color:var(--moss);font-size:.88rem;text-decoration:none;border-bottom:1px solid var(--edge)}
.pw-src:hover{color:var(--mist)}
.pw-off{border:0;opacity:.65}

.pw-foot{margin:clamp(48px,7vw,86px) 0 40px;padding:24px;color:var(--moss);font-size:.9rem}
.pw-foot code{font-family:var(--data);color:var(--fern)}
.pw-stamp{font-family:var(--data);color:var(--jade)}

@media (prefers-reduced-motion:no-preference){
  .pw-repo,.pw-hl,.pw-stat{transition:transform .18s ease,border-color .18s ease}
  .pw-repo:hover,.pw-hl:hover{transform:translateY(-2px);border-color:var(--edge-bright)}
}
</style>
</head>
<body>

<nav class="nav tile" aria-label="Site">
  <a class="brand" href="/">Aden Kingi</a>
  <a class="link" href="/">Portfolio</a>
  <a class="link" href="https://github.com/kingithegreat" rel="noopener">GitHub</a>
  <a class="link" href="/cv/aden-kingi-cv.pdf">CV</a>
</nav>

<header class="pw-hero">
  <div class="wrap">
    <span class="pw-eyebrow">Live record · rebuilt daily</span>
    <h1>Proof of <em>work</em></h1>
    <p class="pw-lede">Not a list of things I could build — a record of what is built, tested and running right now. This page regenerates itself from the GitHub API every morning, so it is as current as the code.</p>
    <p class="pw-sub">Test counts are parsed from the actual test files at build time, not typed in by hand. Where a project is private, it says so rather than linking you to a 404.</p>

    <div class="pw-stats">
      ${stat(projectCount, "Projects", `${activeCount} pushed in the last 90 days`)}
      ${stat(totalTests.toLocaleString("en-NZ"), "Automated tests", "counted from source, not typed in")}
      ${stat(gameCount, "Games", "on one shared CI platform")}
      ${stat(liveLinks.length, "Live now", "click through below")}
    </div>
  </div>
</header>

<section>
  <div class="wrap">
    <h2>How it is built</h2>
    <p class="pw-blurb">${esc(fill(cfg.intro))}</p>
    <div class="pw-hls">${highlightsHtml}</div>
  </div>
</section>

<div class="wrap">
${groupsHtml}
</div>

<div class="wrap">
  <footer class="pw-foot tile">
    <p>Generated from the GitHub API by <code>scripts/build-work.mjs</code> and committed by a scheduled Action. Languages seen across these repos: ${esc(topLangs.join(", "))}.</p>
    <p>Last rebuilt: <span class="pw-stamp">${esc(nz)}</span> — if that date is recent, everything above is too.</p>
    ${staleCounts.length ? `<p>Note: test counts for ${esc(staleCounts.join(", "))} could not be re-read this run and are carried over from the previous build.</p>` : ""}
  </footer>
</div>

</body>
</html>
`;

writeFileSync(new URL("../work.html", import.meta.url), html);
console.log(
  `work.html written — ${meta.size}/${wanted.length} repos resolved, ${totalTests} tests counted across ${testCounts.size} suites.`
);
if (meta.size < wanted.length) {
  const missing = wanted.filter((n) => !meta.has(n));
  console.log(`note: unresolved (token scope or renamed): ${missing.join(", ")}`);
}

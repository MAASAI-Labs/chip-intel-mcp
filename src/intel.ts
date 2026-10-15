import { parse } from "csv-parse/sync";
import { cachedFetch } from "./cache.js";
import { CHIPS, NODES, NODE_NOTES, FEEDS, COMPANIES, SPEC_LABELS, type Chip } from "./data.js";

export const DATASET_VERIFIED = "2026-10-15";
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();

export function findChip(q: string): Chip {
  const n = norm(q);
  const c = CHIPS.find(c => c.id === q || norm(c.id) === n || norm(c.name) === n || c.aliases.some(a => norm(a) === n))
    ?? CHIPS.find(c => norm(c.name).includes(n) || c.aliases.some(a => n.includes(norm(a))));
  if (!c) throw new Error(`Unknown chip "${q}". Available: ${CHIPS.map(c => c.id).join(", ")}. The dataset only includes chips whose specs could be verified on an official vendor page.`);
  return c;
}
export function listChips(vendor?: string) {
  const v = vendor ? norm(vendor) : undefined;
  return CHIPS.filter(c => !v || norm(c.vendor) === v).map(c => ({ id: c.id, name: c.name, vendor: c.vendor, kind: c.kind, publishedSpecs: Object.keys(c.specs) }));
}
export function compareChips(ids: string[], metrics?: string[]) {
  const chips = ids.map(findChip);
  const keys = metrics?.length ? metrics : Object.keys(SPEC_LABELS).filter(k => chips.some(c => c.specs[k]));
  for (const k of keys) if (!SPEC_LABELS[k]) throw new Error(`Unknown metric "${k}". Use: ${Object.keys(SPEC_LABELS).join(", ")}`);
  const rows = keys.map(k => {
    const cells = chips.map(c => c.specs[k] ?? null);
    const nums = cells.map(f => (f && typeof f.value === "number" ? f.value : null));
    const units = new Set(cells.filter(Boolean).map(f => f!.unit));
    const comparable = units.size === 1 && nums.filter(x => x !== null).length >= 2 && !chips.some(c => c.kind === "system") ;
    const best = comparable ? Math.max(...nums.filter((x): x is number => x !== null)) : null;
    return { metric: k, label: SPEC_LABELS[k], cells, leader: best !== null && k !== "power" ? chips[nums.indexOf(best)].name : null };
  });
  const warnings: string[] = [];
  if (chips.some(c => c.kind === "system")) warnings.push("A multi-GPU system is included: its figures are system totals, not per chip. No leader is picked.");
  warnings.push("Vendor peak figures. Dense and sparse throughput are listed separately and are not interchangeable; a blank cell means the vendor page does not publish that figure (none are estimated).");
  return { chips: chips.map(c => ({ id: c.id, name: c.name, kind: c.kind })), rows, warnings };
}
export function nodeMap(foundry?: string) {
  const f = foundry ? norm(foundry) : undefined;
  const nodes = NODES.filter(n => !f || norm(n.foundry) === f).map(n => ({ ...n, detail: NODE_NOTES[n.node] }));
  const chipProcess = CHIPS.filter(c => c.specs.process).map(c => ({ chip: c.name, process: c.specs.process.value, source: c.specs.process.source, quote: c.specs.process.quote }));
  return { nodes, chipProcess, note: "Only chips whose official page states the process are mapped; vendors often don't publish the node or foundry, and we don't infer it." };
}

// ---------- Export controls: Consolidated Screening List (ITA), keyless CSV ----------
export const CSL_URL = "https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.csv";
const CSL_PAGE = "https://www.trade.gov/consolidated-screening-list";
type Row = Record<string, string>;
let parsed: { at: string; rows: (Row & { _n: string })[] } | null = null;
async function csl(fetchImpl?: typeof fetch) {
  const f = await cachedFetch<string>(CSL_URL, 24 * 3600_000, { text: true, accept: "text/csv", fetchImpl });
  if (!parsed || parsed.at !== f.fetchedAt) {
    const rows = parse(f.data, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true }) as Row[];
    parsed = { at: f.fetchedAt, rows: rows.map(r => ({ ...r, _n: norm(r.name + " ; " + (r.alt_names ?? "")) })) };
  }
  return { f, rows: parsed.rows };
}
const LIST_FILTER: Record<string, RegExp> = { entity: /Entity List/, meu: /Military End User/, sdn: /SDN\)/, cmic: /CMIC/, dpl: /Denied Persons/, uvl: /Unverified/, any: /./ };
export async function exportControlLookup(a: { name: string; list?: keyof typeof LIST_FILTER; country?: string; limit?: number }, fetchImpl?: typeof fetch) {
  const { f, rows } = await csl(fetchImpl);
  const q = norm(a.name); if (q.length < 2) throw new Error("Name is too short to screen.");
  const toks = q.split(" ");
  const re = LIST_FILTER[a.list ?? "any"];
  const cc = a.country ? norm(a.country) : undefined;
  const scored = rows.filter(r => re.test(r.source)).map(r => {
    const nm = norm(r.name);
    const score = nm === q ? 3 : r._n.includes(q) ? 2 : toks.every(t => r._n.split(" ").includes(t)) ? 1 : 0;
    return { r, score };
  }).filter(x => x.score > 0 && (!cc || norm(x.r.addresses ?? "").includes(cc)));
  scored.sort((x, y) => y.score - x.score);
  const hits = scored.slice(0, a.limit ?? 15).map(({ r, score }) => ({
    match: score === 3 ? "exact name" : score === 2 ? "name/alias contains query" : "all words present",
    name: r.name, list: r.source, altNames: (r.alt_names || "").split(";").map(s => s.trim()).filter(Boolean).slice(0, 5), addresses: (r.addresses || "").slice(0, 300),
    licenseRequirement: r.license_requirement || undefined, licensePolicy: r.license_policy || undefined, federalRegisterNotice: r.federal_register_notice || undefined,
    startDate: r.start_date || undefined, programs: r.programs || undefined, sourceListUrl: r.source_list_url || undefined,
  }));
  return { query: a.name, list: a.list ?? "any", totalMatches: scored.length, hits, recordsSearched: rows.length, source: CSL_URL, sourcePage: CSL_PAGE, fetchedAt: f.fetchedAt, cached: f.cached, stale: f.stale,
    disclaimer: "Name screening only, against the US Consolidated Screening List (ITA, includes BIS Entity List, MEU, DPL, UVL and Treasury/State lists). Matches may be false positives and a miss is not clearance. Confirm against the official source list and Federal Register notice; this is not legal advice." };
}

// ---------- News: publisher RSS/Atom ----------
const decode = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/\s+/g, " ").trim();
export function parseFeed(xml: string, feed: string) {
  const items = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/g) ?? [];
  return items.map(it => {
    const tag = (t: string) => { const m = it.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? decode(m[1]) : ""; };
    const link = it.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? tag("link");
    const d = tag("pubDate") || tag("published") || tag("updated") || tag("dc:date");
    const t = Date.parse(d);
    return { title: tag("title"), url: link.trim(), published: isNaN(t) ? null : new Date(t).toISOString(), feed };
  }).filter(i => i.title && i.url);
}
export const DEFAULT_NEWS_TERMS = ["gpu", "nvidia", "amd", "intel", "tsmc", "samsung", "chip", "semiconductor", "accelerator", "hbm", "foundry", "wafer", "export", "asml", "micron", "broadcom", "qualcomm", "arm", "tpu", "trainium", "blackwell", "instinct", "nm"];
export async function chipNews(a: { query?: string; limit?: number; days?: number }, fetchImpl?: typeof fetch) {
  const terms = a.query ? norm(a.query).split(" ") : null;
  const results = await Promise.allSettled(FEEDS.map(fd => cachedFetch<string>(fd.url, 15 * 60_000, { text: true, accept: "application/rss+xml, application/atom+xml, application/xml, text/xml", fetchImpl }).then(r => ({ fd, r }))));
  const feeds = results.map((r, i) => ({ feed: FEEDS[i].name, url: FEEDS[i].url, ok: r.status === "fulfilled", fetchedAt: r.status === "fulfilled" ? r.value.r.fetchedAt : undefined, error: r.status === "rejected" ? String((r.reason as Error).message) : undefined }));
  const cutoff = Date.now() - (a.days ?? 7) * 86400_000;
  let items = results.flatMap(r => r.status === "fulfilled" ? parseFeed(r.value.r.data, r.value.fd.name) : []);
  items = items.filter(i => !i.published || Date.parse(i.published) >= cutoff).filter(i => {
    const words = norm(i.title).split(" ");
    return terms ? terms.every(t => norm(i.title).includes(t)) : DEFAULT_NEWS_TERMS.some(t => words.includes(t));
  });
  const seen = new Set<string>(); items = items.filter(i => !seen.has(i.url) && seen.add(i.url));
  items.sort((x, y) => (y.published ?? "").localeCompare(x.published ?? ""));
  return { query: a.query ?? null, items: items.slice(0, a.limit ?? 15), feeds };
}

// ---------- SEC EDGAR: filings and reported revenue ----------
const SEC_UA = () => process.env.SEC_USER_AGENT || "ChipIntelMCP chip-intel-mcp@example.com";
export function company(t: string) { const k = t.toUpperCase().trim(); const c = COMPANIES[k]; if (!c) throw new Error(`Unknown ticker "${t}". Supported: ${Object.keys(COMPANIES).join(", ")}`); return { ticker: k, ...c }; }
export async function companyFilings(a: { ticker: string; forms?: string[]; limit?: number }, fetchImpl?: typeof fetch) {
  const c = company(a.ticker);
  const url = `https://data.sec.gov/submissions/CIK${c.cik}.json`;
  const f = await cachedFetch<any>(url, 3600_000, { fetchImpl, headers: { "User-Agent": SEC_UA() } });
  const r = f.data.filings.recent; const want = a.forms?.length ? a.forms.map(s => s.toUpperCase()) : ["10-K", "10-Q", "8-K", "20-F", "6-K", "DEF 14A"];
  const out: any[] = [];
  for (let i = 0; i < r.form.length && out.length < (a.limit ?? 10); i++) if (want.includes(r.form[i])) out.push({ form: r.form[i], filed: r.filingDate[i], reportDate: r.reportDate[i] || undefined, description: r.primaryDocDescription[i] || undefined, items: r.items?.[i] || undefined, url: `https://www.sec.gov/Archives/edgar/data/${Number(c.cik)}/${r.accessionNumber[i].replace(/-/g, "")}/${r.primaryDocument[i]}` });
  return { ...c, entityName: f.data.name, sic: f.data.sicDescription, filings: out, source: url, fetchedAt: f.fetchedAt, cached: f.cached, stale: f.stale };
}
const REV = [["us-gaap", "Revenues"], ["us-gaap", "RevenueFromContractWithCustomerExcludingAssessedTax"], ["ifrs-full", "Revenue"]];
export async function companyRevenue(a: { ticker: string; years?: number }, fetchImpl?: typeof fetch) {
  const c = company(a.ticker);
  const series: { fy: number; end: string; value: number; currency: string; form: string; filed: string; tag: string }[] = [];
  let src = "", at = "";
  for (const [tax, tag] of REV) {
    const url = `https://data.sec.gov/api/xbrl/companyconcept/CIK${c.cik}/${tax}/${tag}.json`;
    let f; try { f = await cachedFetch<any>(url, 6 * 3600_000, { fetchImpl, allow404: true, headers: { "User-Agent": SEC_UA() } }); } catch { continue; }
    if (f.data.__notFound) continue;
    for (const [cur, arr] of Object.entries<any[]>(f.data.units ?? {})) for (const u of arr) {
      if (!/^(10-K|20-F)/.test(u.form) || u.fp !== "FY" || !u.start) continue;
      const days = (Date.parse(u.end) - Date.parse(u.start)) / 86400_000; if (days < 350 || days > 380) continue;
      series.push({ fy: u.fy, end: u.end, value: u.val, currency: cur, form: u.form, filed: u.filed, tag: `${tax}:${tag}` });
    }
    src = url; at = f.fetchedAt;
    if (series.length) break;
  }
  // primary reporting currency = most frequent; drop convenience translations so years stay comparable
  const counts = new Map<string, number>(); for (const x of series) counts.set(x.currency, (counts.get(x.currency) ?? 0) + 1);
  const primary = [...counts.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
  series.splice(0, series.length, ...series.filter(x => x.currency === primary));
  // one row per period end (latest filing wins)
  const byEnd = new Map<string, typeof series[0]>(); for (const s of series.sort((x, y) => x.filed.localeCompare(y.filed))) byEnd.set(s.end, s);
  const rows = [...byEnd.values()].sort((x, y) => y.end.localeCompare(x.end)).slice(0, a.years ?? 5);
  return { ...c, annualRevenue: rows, source: src || null, fetchedAt: at || null, note: rows.length ? "Annual revenue as reported in XBRL financial data (10-K / 20-F). Amounts in the filing's reporting currency." : "No annual revenue tag found in SEC XBRL data for this filer." };
}

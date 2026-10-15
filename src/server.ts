import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as I from "./intel.js";
import { CHIPS, SPEC_LABELS, type Fig } from "./data.js";

const run = (fn: (a: any) => Promise<{ markdown: string } & Record<string, unknown>> | ({ markdown: string } & Record<string, unknown>)) => async (a: any) => {
  try { const r = await fn(a); return { content: [{ type: "text" as const, text: r.markdown }, { type: "text" as const, text: "```json\n" + JSON.stringify({ ...r, markdown: undefined }, null, 2) + "\n```" }] }; }
  catch (e) { return { isError: true, content: [{ type: "text" as const, text: (e as Error).message }] }; }
};
const esc = (s: string) => (s ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ");
const fmt = (f: Fig | null) => f ? `${typeof f.value === "number" ? f.value.toLocaleString("en-US") : f.value}${f.unit ? " " + f.unit : ""}${f.note ? ` _(${f.note})_` : ""}` : "—";
const stale = (r: { cached?: boolean; stale?: boolean }) => r.stale ? " (STALE: upstream unavailable, cached copy)" : r.cached ? " (cached)" : "";
const DS = `_Dataset: curated from official vendor spec pages, each figure verified verbatim on ${I.DATASET_VERIFIED}. Vendor-stated peak numbers._`;
const metricKeys = Object.keys(SPEC_LABELS) as [string, ...string[]];
const chipIds = CHIPS.map(c => c.id).join(", ");
const money = (v: number, cur: string) => `${(v / 1e9).toLocaleString("en-US", { maximumFractionDigits: 2 })}B ${cur}`;

export function createServer() {
  const server = new McpServer({ name: "chip-intel-mcp", version: "1.0.0" });
  const local = { readOnlyHint: true, openWorldHint: false };
  const ro = { readOnlyHint: true, openWorldHint: true };

  server.registerTool("list_chips", { title: "List AI accelerators in the dataset", annotations: local,
    description: "List the GPUs/AI accelerators in the curated, source-cited spec dataset (NVIDIA, AMD, Google TPU, AWS Trainium), optionally filtered by vendor.",
    inputSchema: { vendor: z.string().max(30).optional() } },
    run(a => { const r = I.listChips(a.vendor); return { chips: r, markdown: `## AI accelerators in dataset (${r.length})\n\n| ID | Name | Vendor | Type | Published specs |\n|---|---|---|---|---|\n` + r.map(c => `| \`${c.id}\` | ${c.name} | ${c.vendor} | ${c.kind} | ${c.publishedSpecs.map(k => SPEC_LABELS[k]).join(", ")} |`).join("\n") + `\n\n${DS}` }; }));

  server.registerTool("chip_specs", { title: "Accelerator spec sheet (with citations)", annotations: local,
    description: `Spec sheet for one accelerator, where every figure has its official source URL and the exact quote from that page. Accepts an id or common name (e.g. H100, MI300X, TPU v6e). IDs: ${chipIds}.`,
    inputSchema: { chip: z.string().min(2).max(60) } },
    run(a => { const c = I.findChip(a.chip); const urls = [...new Set(Object.values(c.specs).map(f => f.source))];
      return { chip: c, markdown: `## ${c.name}\n\n| Spec | Value | Source quote |\n|---|---|---|\n` + Object.entries(c.specs).map(([k, f]) => `| ${SPEC_LABELS[k]} | ${fmt(f)} | “${esc(f.quote)}” [[${urls.indexOf(f.source) + 1}]](${f.source}) |`).join("\n") + `\n\nSources: ${urls.map((u, i) => `[${i + 1}] ${u}`).join(" · ")}\n\nSpecs not shown are not published on the cited page and are deliberately left out.\n\n${DS}` }; }));

  server.registerTool("compare_chips", { title: "Compare accelerators side by side", annotations: local,
    description: "Compare 2–6 accelerators side by side on memory, bandwidth, FP8/BF16/FP4 throughput (dense vs sparse kept apart), power and process. Each cell is cited; unpublished values show as —.",
    inputSchema: { chips: z.array(z.string().min(2).max(60)).min(2).max(6), metrics: z.array(z.enum(metricKeys)).optional() } },
    run(a => { const r = I.compareChips(a.chips, a.metrics);
      const srcs = [...new Set(r.rows.flatMap(x => x.cells.filter(Boolean).map(f => f!.source)))];
      const md = `## ${r.chips.map(c => c.name).join(" vs ")}\n\n| Metric | ${r.chips.map(c => c.name).join(" | ")} | Highest |\n|---|${r.chips.map(() => "---").join("|")}|---|\n` + r.rows.map(x => `| ${x.label} | ${x.cells.map(f => f ? `${fmt(f)} [[${srcs.indexOf(f.source) + 1}]](${f.source})` : "—").join(" | ")} | ${x.leader ?? ""} |`).join("\n") + `\n\n${r.warnings.map(w => "- " + w).join("\n")}\n\nSources: ${srcs.map((u, i) => `[${i + 1}] ${u}`).join(" · ")}\n\n${DS}`;
      return { ...r, sources: srcs, markdown: md }; }));

  server.registerTool("process_node_map", { title: "Foundry process-node map (TSMC/Samsung/Intel)", annotations: local,
    description: "Map of leading-edge logic process nodes at TSMC, Samsung and Intel Foundry (transistor type, production status), plus which dataset chips state their process. Every entry cites the foundry's own page.",
    inputSchema: { foundry: z.enum(["TSMC", "Samsung", "Intel"]).optional() } },
    run(a => { const r = I.nodeMap(a.foundry);
      return { ...r, markdown: `## Process-node map${a.foundry ? `: ${a.foundry}` : ""}\n\n| Foundry | Node | Transistor | Status | Source quote |\n|---|---|---|---|---|\n` + r.nodes.map(n => `| ${n.foundry} | ${n.node} | ${n.transistor} | ${n.status} | “${esc(n.quote)}” ([source](${n.source})) |`).join("\n") + (r.nodes.some(n => n.detail) ? "\n\n" + r.nodes.filter(n => n.detail).map(n => `- **${n.node}:** ${n.detail!.text} (“${n.detail!.quote}”, [source](${n.detail!.source}))`).join("\n") : "") + `\n\n### Chips with a stated process\n\n` + r.chipProcess.map(c => `- ${c.chip}: ${c.process} (“${c.quote}”, [source](${c.source}))`).join("\n") + `\n\n_${r.note}_\n\n${DS}` }; }));

  server.registerTool("export_control_lookup", { title: "US export-control / sanctions screening", annotations: ro,
    description: "Screen a company or person name against the US government's Consolidated Screening List (trade.gov; includes the BIS Entity List, Military End User list, Denied Persons, Unverified List and Treasury/State lists). Optional list and country filters. Returns license requirement/policy and Federal Register citation. Screening aid only, not legal advice.",
    inputSchema: { name: z.string().min(2).max(120), list: z.enum(["any", "entity", "meu", "sdn", "cmic", "dpl", "uvl"]).optional(), country: z.string().max(40).optional(), limit: z.number().int().min(1).max(50).optional() } },
    run(async a => { const r = await I.exportControlLookup(a);
      const md = `## Screening "${r.query}"${a.list && a.list !== "any" ? ` (${a.list} list)` : ""}${a.country ? `, address in ${a.country}` : ""}: ${r.totalMatches} match${r.totalMatches === 1 ? "" : "es"}\n\n` + (r.hits.length ? `| Name | List | Match | License requirement / policy | Federal Register | Address |\n|---|---|---|---|---|---|\n` + r.hits.map(h => `| ${esc(h.name)}${h.altNames.length ? ` (aka ${esc(h.altNames.slice(0, 2).join("; "))})` : ""} | ${esc(h.list)} | ${h.match} | ${esc([h.licenseRequirement, h.licensePolicy].filter(Boolean).join(" / ") || "-")} | ${esc(h.federalRegisterNotice ?? "-")}${h.startDate ? ` (${h.startDate})` : ""} | ${esc(h.addresses.slice(0, 120))} |`).join("\n") : `No name matches among ${r.recordsSearched.toLocaleString("en-US")} records. A miss is **not** clearance.`) + `\n\n> ${r.disclaimer}\n\n_Source: US Consolidated Screening List, International Trade Administration (${r.sourcePage}; data ${r.source}), fetched ${r.fetchedAt}${stale(r)}._`;
      return { ...r, markdown: md }; }));

  server.registerTool("chip_news", { title: "Semiconductor news headlines", annotations: ro,
    description: "Recent chip/semiconductor headlines from publisher RSS feeds (Tom's Hardware, The Register, SemiWiki, ServeTheHome, EE Times). Optional keyword filter (all words must appear in the title), e.g. 'nvidia', 'tsmc 2nm', 'export'. Links go to the publisher.",
    inputSchema: { query: z.string().max(60).optional(), days: z.number().int().min(1).max(30).optional(), limit: z.number().int().min(1).max(40).optional() } },
    run(async a => { const r = await I.chipNews(a);
      const md = `## Chip news${r.query ? ` matching "${r.query}"` : ""} (last ${a.days ?? 7} days)\n\n` + (r.items.length ? r.items.map(i => `- [${esc(i.title)}](${i.url}) · ${i.feed}${i.published ? ` · ${i.published.slice(0, 16).replace("T", " ")} UTC` : ""}`).join("\n") : "No matching headlines.") + `\n\n_Sources: ${r.feeds.map(f => `${f.feed} (${f.ok ? `fetched ${f.fetchedAt}` : `unavailable: ${f.error}`})`).join("; ")}. Headlines and links belong to their publishers._`;
      return { ...r, markdown: md }; }));

  server.registerTool("chip_company_filings", { title: "Chip company SEC filings and revenue", annotations: ro,
    description: "Recent SEC EDGAR filings (10-K, 10-Q, 8-K, 20-F, 6-K…) and annual reported revenue for chip companies: NVDA, AMD, INTC, TSM, AVGO, MU, QCOM, ASML, ARM, SMCI. Stock prices are not included (no free official source).",
    inputSchema: { ticker: z.string().min(2).max(6), forms: z.array(z.string().max(10)).optional(), limit: z.number().int().min(1).max(30).optional(), includeRevenue: z.boolean().optional() } },
    run(async a => { const f = await I.companyFilings(a); const rev = a.includeRevenue === false ? null : await I.companyRevenue({ ticker: a.ticker });
      let md = `## ${f.entityName} (${f.ticker}): SEC filings\n\n| Form | Filed | Period | Description |\n|---|---|---|---|\n` + f.filings.map(x => `| [${x.form}](${x.url}) | ${x.filed} | ${x.reportDate ?? "-"} | ${esc(x.description ?? "")}${x.items ? ` (items ${x.items})` : ""} |`).join("\n") + `\n\n_Source: SEC EDGAR (${f.source}), fetched ${f.fetchedAt}${stale(f)}._`;
      if (rev) md += `\n\n### Annual revenue (as reported)\n\n` + (rev.annualRevenue.length ? `| Fiscal year end | Revenue | Form | Filed |\n|---|---:|---|---|\n` + rev.annualRevenue.map(r => `| ${r.end} | ${money(r.value, r.currency)} | ${r.form} | ${r.filed} |`).join("\n") + `\n\n_Source: SEC XBRL (${rev.source}), fetched ${rev.fetchedAt}. ${rev.note}_` : rev.note);
      md += "\n\nStock prices are not provided: there is no free, official real-time quote source.";
      return { filings: f, revenue: rev, markdown: md }; }));

  server.registerTool("chip_briefing", { title: "Chip company briefing (filings + news)", annotations: ro,
    description: "One-shot briefing on a chip company: latest SEC filings, annual revenue trend and recent headlines mentioning it. Every item cited.",
    inputSchema: { ticker: z.string().min(2).max(6), days: z.number().int().min(1).max(30).optional() } },
    run(async a => { const c = I.company(a.ticker);
      const [f, rev, news] = await Promise.allSettled([I.companyFilings({ ticker: c.ticker, limit: 5 }), I.companyRevenue({ ticker: c.ticker, years: 3 }), I.chipNews({ query: c.news ?? c.name.split(" ")[0], days: a.days ?? 14, limit: 8 })]);
      let md = `## Briefing: ${c.name} (${c.ticker})\n\n### Latest filings\n`;
      md += f.status === "fulfilled" ? f.value.filings.map(x => `- ${x.filed} [${x.form}](${x.url})${x.description ? ` ${esc(x.description)}` : ""}`).join("\n") + `\n\n_SEC EDGAR, fetched ${f.value.fetchedAt}._` : `Unavailable: ${(f.reason as Error).message}`;
      md += `\n\n### Annual revenue\n`;
      if (rev.status === "fulfilled" && rev.value.annualRevenue.length) { const r = rev.value.annualRevenue; md += r.map(x => `- FY ending ${x.end}: ${money(x.value, x.currency)} (${x.form})`).join("\n");
        if (r.length > 1) md += `\n- Change vs prior year: ${(((r[0].value / r[1].value) - 1) * 100).toFixed(1)}% (computed from the two filed values)`; md += `\n\n_SEC XBRL, fetched ${rev.value.fetchedAt}._`; }
      else md += rev.status === "fulfilled" ? rev.value.note : `Unavailable: ${(rev.reason as Error).message}`;
      md += `\n\n### Headlines (last ${a.days ?? 14} days)\n`;
      md += news.status === "fulfilled" ? (news.value.items.length ? news.value.items.map(i => `- [${esc(i.title)}](${i.url}) · ${i.feed}${i.published ? ` · ${i.published.slice(0, 10)}` : ""}`).join("\n") : "No recent headlines in the tracked feeds.") + `\n\n_Publisher RSS feeds: ${news.value.feeds.filter(x => x.ok).map(x => x.feed).join(", ")}._` : `Unavailable: ${(news.reason as Error).message}`;
      md += "\n\nNo stock prices or investment advice.";
      return { ticker: c.ticker, filings: f.status === "fulfilled" ? f.value : null, revenue: rev.status === "fulfilled" ? rev.value : null, news: news.status === "fulfilled" ? news.value : null, markdown: md }; }));

  return server;
}

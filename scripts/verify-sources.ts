// Refetches every cited page and checks each quote still appears verbatim. Run before publishing: npm run verify-sources
import { CHIPS, NODES, NODE_NOTES } from "../src/data.js";
const UA = "Mozilla/5.0 (compatible; chip-intel-mcp source verifier)";
const text = (h: string) => h.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8217;|&rsquo;/g, "’").replace(/&#174;|&reg;/g, "®").replace(/&#8482;|&trade;/g, "™").replace(/&sup2;/g, "²").replace(/\s+/g, " ");
const items = [...CHIPS.flatMap(c => Object.entries(c.specs).map(([k, f]) => ({ id: `${c.id}.${k}`, ...f }))), ...NODES.map(n => ({ id: n.node, source: n.source, quote: n.quote })), ...Object.entries(NODE_NOTES).map(([k, n]) => ({ id: k, ...n }))];
const pages = new Map<string, string | null>();
let bad = 0;
for (const u of new Set(items.map(i => i.source))) { try { const r = await fetch(u, { headers: { "User-Agent": UA } }); pages.set(u, r.ok ? text(await r.text()) : null); if (!r.ok) console.log(`HTTP ${r.status} ${u}`); } catch (e) { pages.set(u, null); console.log(`ERR ${u} ${(e as Error).message}`); } }
for (const i of items) { const p = pages.get(i.source); if (p == null) { bad++; continue; } if (!p.includes(i.quote.replace(/\s+/g, " "))) { bad++; console.log(`QUOTE MISSING ${i.id}: "${i.quote}" @ ${i.source}`); } }
console.log(`${items.length - bad}/${items.length} quotes verified across ${pages.size} pages`);
process.exit(bad ? 1 : 0);

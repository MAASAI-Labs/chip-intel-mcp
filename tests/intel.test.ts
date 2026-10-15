import { describe, it, expect, beforeEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import { CHIPS, NODES, NODE_NOTES } from "../src/data.js";
import * as I from "../src/intel.js";
import { clearCache } from "../src/cache.js";

const digits = (s: string) => s.replace(/,/g, "");
describe("dataset integrity (no invented numbers)", () => {
  for (const c of CHIPS) for (const [k, f] of Object.entries(c.specs)) it(`${c.id}.${k} is sourced and its number is in the quote`, () => {
    expect(f.source).toMatch(/^https:\/\/(www\.nvidia\.com|www\.amd\.com|cloud\.google\.com|aws\.amazon\.com)\//);
    expect(f.quote.length).toBeGreaterThan(8);
    if (typeof f.value === "number") {
      const q = digits(f.quote);
      const ok = q.includes(String(f.value)) || q.includes(String(f.value / 1000)) || q.includes(String(Math.round(f.value * 1000))) || q.includes(String(f.value / 1000).replace(/\.0+$/, ""));
      expect(ok, `${f.value} not in "${f.quote}"`).toBe(true);
    }
  });
  it("process nodes all cite the foundry", () => { for (const n of [...NODES, ...Object.values(NODE_NOTES)]) expect(n.source).toMatch(/tsmc\.com|samsung\.com|intel\.com/); });
});

describe("lookup & compare", () => {
  it("finds by alias", () => { expect(I.findChip("H100").id).toBe("nvidia-h100-sxm"); expect(I.findChip("mi300x").id).toBe("amd-mi300x"); expect(I.findChip("Trillium").id).toBe("google-tpu-v6e"); });
  it("rejects unknown chips without guessing", () => expect(() => I.findChip("Gaudi 3")).toThrow(/Unknown chip/));
  it("compare picks leader only for same-unit numeric data and blanks unpublished", () => {
    const r = I.compareChips(["h200", "mi300x"]);
    expect(r.rows.find(x => x.metric === "memoryGB")!.leader).toBe("AMD Instinct MI300X");
    expect(r.rows.find(x => x.metric === "fp8Dense")!.cells[0]).toBeNull();
    expect(r.rows.find(x => x.metric === "power")!.leader).toBeNull();
  });
  it("system entries never produce a leader", () => { const r = I.compareChips(["b200", "mi355x"]); expect(r.rows.every(x => x.leader === null)).toBe(true); });
});

const CSV = `_id,source,name,alt_names,addresses,federal_register_notice,start_date,license_requirement,license_policy,source_list_url,programs
1,"Entity List (EL) - Bureau of Industry and Security","Huawei Technologies Co., Ltd.","Huawei; HTC","Shenzhen, CN","84 FR 22961","2019-05-16","For all items subject to the EAR","Presumption of denial","https://example.gov/el",""
2,"Specially Designated Nationals (SDN) - Treasury Department","Acme Trading","","Moscow, RU","","","","","https://example.gov/sdn","RUSSIA-EO14024"`;
const fake = (body: string, status = 200) => (async () => new Response(body, { status })) as unknown as typeof fetch;

describe("export controls (CSL CSV)", () => {
  beforeEach(() => clearCache());
  it("matches alias and filters list/country", async () => {
    const r = await I.exportControlLookup({ name: "huawei", list: "entity" }, fake(CSV));
    expect(r.hits[0].name).toMatch(/Huawei/); expect(r.hits[0].licensePolicy).toBe("Presumption of denial");
    expect((await I.exportControlLookup({ name: "huawei", list: "sdn" }, fake(CSV))).totalMatches).toBe(0);
    expect((await I.exportControlLookup({ name: "acme", country: "RU" }, fake(CSV))).totalMatches).toBe(1);
    expect(r.disclaimer).toMatch(/not legal advice/);
  });
});

describe("news parsing", () => {
  it("parses RSS and Atom", () => {
    const rss = `<rss><channel><item><title><![CDATA[TSMC ramps 2nm &amp; more]]></title><link>https://x.test/a</link><pubDate>Wed, 14 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
    const atom = `<feed><entry><title type="html">Nvidia Rubin</title><link rel="alternate" href="https://y.test/b"/><updated>2026-10-14T09:00:00Z</updated></entry></feed>`;
    expect(I.parseFeed(rss, "A")[0]).toMatchObject({ title: "TSMC ramps 2nm & more", url: "https://x.test/a" });
    expect(I.parseFeed(atom, "B")[0]).toMatchObject({ url: "https://y.test/b", published: "2026-10-14T09:00:00.000Z" });
  });
});

describe("MCP server", () => {
  it("lists tools, no write/trade tools, and returns cited output", async () => {
    const [a, b] = InMemoryTransport.createLinkedPair(); const s = createServer(); await s.connect(a);
    const c = new Client({ name: "t", version: "1" }); await c.connect(b);
    const names = (await c.listTools()).tools.map(t => t.name).sort();
    expect(names).toEqual(["chip_briefing", "chip_company_filings", "chip_news", "chip_specs", "compare_chips", "export_control_lookup", "list_chips", "process_node_map"]);
    const r: any = await c.callTool({ name: "chip_specs", arguments: { chip: "H200" } });
    expect(r.content[0].text).toMatch(/4\.8 TB\/s/); expect(r.content[0].text).toMatch(/nvidia\.com\/en-us\/data-center\/h200/);
    const bad: any = await c.callTool({ name: "compare_chips", arguments: { chips: ["h100"] } }); expect(bad.isError).toBe(true);
    const nm: any = await c.callTool({ name: "process_node_map", arguments: { foundry: "Intel" } }); expect(nm.content[0].text).toMatch(/18A/);
  });
  it("unknown ticker is a friendly error", () => expect(() => I.company("XYZ")).toThrow(/Supported/));
});

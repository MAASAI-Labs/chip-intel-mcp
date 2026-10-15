// Live smoke test against real upstream APIs over the built HTTP server. Usage: npm run build && npm run smoke
import { spawn } from "node:child_process";
const port = 3990 + Math.floor(Math.random() * 9);
const srv = spawn("node", ["dist/main-http.js"], { env: { ...process.env, PORT: String(port) }, stdio: "inherit" });
await new Promise(r => setTimeout(r, 900));
let id = 0;
const call = async (name, args) => { const r = await fetch(`http://localhost:${port}/mcp`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method: "tools/call", params: { name, arguments: args } }) }); const j = await r.json(); return j.result; };
const cases = [["list_chips", {}], ["compare_chips", { chips: ["h200", "mi325x", "tpu v5p"] }], ["process_node_map", {}], ["export_control_lookup", { name: "Huawei", list: "entity", limit: 3 }], ["export_control_lookup", { name: "Semiconductor Manufacturing International", limit: 3 }], ["chip_news", { limit: 6 }], ["chip_company_filings", { ticker: "NVDA", limit: 4 }], ["chip_briefing", { ticker: "TSM" }]];
let fail = 0;
for (const [n, a] of cases) { const t = Date.now(); try { const r = await call(n, a); if (r.isError) fail++; console.log(`\n===== ${n} ${JSON.stringify(a)} ${r.isError ? "ERROR" : "ok"} (${Date.now() - t} ms)\n${r.content[0].text.slice(0, 1600)}`); } catch (e) { fail++; console.log(n, "FAILED", e.message); } }
srv.kill(); console.log(`\n${cases.length - fail}/${cases.length} ok`); process.exit(fail ? 1 : 0);

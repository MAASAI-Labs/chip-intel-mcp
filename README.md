# Chip Intel MCP

**Live MCP URL (Streamable HTTP):** `https://chip-intel-mcp.vercel.app/mcp`  
Health check: `https://chip-intel-mcp.vercel.app/health`

An MCP server for AI-chip research. It provides:

- **Cited specs** for GPUs and AI accelerators.
- **Side-by-side comparisons** of those accelerators.
- **A foundry process-node map** covering TSMC, Samsung and Intel.
- **US export-control screening** against the official Consolidated Screening List, which includes the BIS Entity List.
- **Chip-company SEC filings and revenue**, plus **semiconductor news** from publisher feeds.

**No invented numbers.** Every spec figure comes with the official vendor page URL and the exact quote from that page. `npm run verify-sources` refetches each page and confirms every quote is still there; on 2026-10-15, 66 of 66 quotes passed. If a vendor doesn't publish a figure, the server shows "—" and never estimates it.

## Tools

| Tool | What it does | Data source |
|---|---|---|
| `list_chips` | Lists the accelerators in the dataset | Curated dataset |
| `chip_specs` | Spec sheet for one chip, with a quote and source for each figure | NVIDIA, AMD, Google Cloud and AWS spec pages |
| `compare_chips` | Compares 2–6 chips. Dense and sparse figures stay separate. A "highest" value is marked only when every chip uses the same unit and figures are per chip, never for multi-GPU systems or power | Curated dataset |
| `process_node_map` | Node, transistor type and production status for TSMC N5/N3/N2/A16/A14/A13, Samsung 3nm GAA and Intel 18A, plus which chips state their process | Foundry pages and newsroom |
| `export_control_lookup` | Name screening with optional list filter (entity/meu/sdn/cmic/dpl/uvl) and country filter. Returns the license requirement/policy and Federal Register citations | trade.gov Consolidated Screening List (keyless CSV, cached 24 h) |
| `chip_news` | Recent chip headlines, with optional keyword filter | RSS from Tom's Hardware, The Register, SemiWiki, ServeTheHome and EE Times (cached 15 min) |
| `chip_company_filings` | Recent 10-K/10-Q/8-K/20-F/6-K filings and annual revenue for NVDA, AMD, INTC, TSM, AVGO, MU, QCOM, ASML, ARM and SMCI | SEC EDGAR submissions and XBRL companyconcept |
| `chip_briefing` | One-shot briefing: filings, revenue trend and headlines | All of the above |

Dataset chips: H100 SXM, H200 SXM, A100 80GB, DGX B200 (an 8-GPU system), MI300X, MI325X, MI355X, TPU v5p, TPU v6e and Trainium3.

All tools are read-only. There are no trading or price tools and no investment advice. Export screening is a name-matching aid only, not legal advice, and a miss does not mean clearance.

## Example prompts
- "Compare H200, MI325X and TPU v5p on memory and FP8."
- "Show the MI355X spec sheet with sources."
- "Which TSMC nodes are in volume production, and when does A14 arrive?"
- "Is SMIC on the Entity List? What's the license policy?"
- "Screen 'Huawei' against the Entity List, Belgium addresses only."
- "Chip news this week about TSMC 2nm."
- "Give me a briefing on NVIDIA's latest filings."

## Run locally
```bash
npm install && npm run build
npm start                 # Streamable HTTP at http://localhost:3000/mcp (also /api/mcp, /health)
npm run start:stdio       # stdio, for Claude Desktop / Cursor
npm test                  # vitest: 66 tests
npm run smoke             # live calls against upstream services
npm run verify-sources    # refetch every cited page and check every quote
```

Claude Desktop config:
```json
{ "mcpServers": { "chip-intel": { "command": "node", "args": ["/path/to/chip-intel-mcp/dist/main-stdio.js"], "env": { "SEC_USER_AGENT": "Your Name you@yourdomain.com" } } } }
```

### Environment
- `SEC_USER_AGENT`: **set this in production.** The SEC requires a "Name email" User-Agent and blocks requests that don't send one. The fallback `ChipIntelMCP chip-intel-mcp@example.com` is a placeholder only.
- `PORT`: HTTP port (default 3000).

## Deploy to Vercel
1. Push this folder to a Git repo and import it in Vercel. No build settings are needed: `api/mcp.ts` is the function and `vercel.json` rewrites `/mcp` to it.
2. Set `SEC_USER_AGENT`.
3. The endpoint is `https://<project>.vercel.app/mcp`. It is stateless Streamable HTTP and POST only.

The first export screening after a cold start downloads the screening list (about 17 MB, roughly 1 s). Later calls hit the 24 h in-memory cache.

## Data, caching and attribution
- **Specs:** taken from vendor pages; every figure is cited in its output. Snapshot verified 2026-10-15.
- **Screening list:** the Consolidated Screening List from the International Trade Administration (https://www.trade.gov/consolidated-screening-list), a US government work. The JSON API needs a subscription key; this server uses the official keyless CSV download.
- **SEC data:** from data.sec.gov, cached 1–6 h, well under SEC's fair-access limit of 10 requests/s.
- **News:** comes from public publisher feeds. The server shows only headlines with links back to the publisher.
- All live outputs include the source URL and the fetch timestamp. If an upstream service fails, the server serves the stale cached copy and labels it as stale.

## Marketplace reviewer test
1. `npm install && npm run build && npm test`: 66 tests pass, all offline.
2. `npm run verify-sources`: prints `66/66 quotes verified`.
3. `SEC_USER_AGENT="Reviewer you@example.com" npm run smoke`: prints `8/8 ok`.
4. Manual checks over MCP:
   - `compare_chips {"chips":["h100","mi300x"]}`: every cell links to nvidia.com or amd.com.
   - `export_control_lookup {"name":"Semiconductor Manufacturing International"}`: SMIC entries appear on the Entity List and the CMIC list.
   - `chip_specs {"chip":"Gaudi 3"}`: returns a friendly "Unknown chip" error and does not guess.

## Known limitations
- Intel Gaudi pages block automated fetches (HTTP 403), so Gaudi isn't included. Samsung's 2nm page currently returns 404, so only its 3nm GAA milestone is listed.
- NVIDIA lists Blackwell figures per system (DGX B200), so B200 appears as an 8-GPU system rather than a per-chip entry.
- AWS doesn't publish a per-chip FLOPS figure for Trainium3, so none is shown.
- Prices aren't included because no free, official quote API exists.
- TSMC's XBRL revenue in SEC data currently ends at FY2024.

MIT License © 2026 Segun Cole

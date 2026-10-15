/**
 * Curated accelerator specs. EVERY figure carries the official source URL and a verbatim quote
 * from that page (verified with `npm run verify-sources`). Nothing is estimated or derived.
 * Snapshot verified 2026-10-15. Vendor peak figures; "sparse" = with structured sparsity.
 */
export interface Fig { value: number | string; unit?: string; note?: string; source: string; quote: string }
export interface Chip { id: string; name: string; vendor: string; kind: "gpu" | "accelerator" | "tpu" | "system"; aliases: string[]; specs: Record<string, Fig> }

const NV_H100 = "https://www.nvidia.com/en-us/data-center/h100/";
const NV_H200 = "https://www.nvidia.com/en-us/data-center/h200/";
const NV_A100 = "https://www.nvidia.com/en-us/data-center/a100/";
const NV_DGXB200 = "https://www.nvidia.com/en-us/data-center/dgx-b200/";
const AMD_300X = "https://www.amd.com/en/products/accelerators/instinct/mi300/mi300x.html";
const AMD_325X = "https://www.amd.com/en/products/accelerators/instinct/mi300/mi325x.html";
const AMD_355X = "https://www.amd.com/en/products/accelerators/instinct/mi350/mi355x.html";
const G_V5P = "https://cloud.google.com/tpu/docs/v5p";
const G_V6E = "https://cloud.google.com/tpu/docs/v6e";
const AWS_TRN = "https://aws.amazon.com/ai/machine-learning/trainium/";

export const SPEC_LABELS: Record<string, string> = {
  memoryGB: "Memory capacity", memoryType: "Memory type", bandwidthTBs: "Memory bandwidth", fp8Dense: "FP8 (dense)", fp8Sparse: "FP8 (sparse)",
  bf16Dense: "BF16 (dense)", bf16Sparse: "BF16 (sparse)", fp4Dense: "FP4 (dense)", fp4: "FP4", int8: "INT8", power: "Power (TDP/TBP)", process: "Process", transistors: "Transistors",
};

export const CHIPS: Chip[] = [
  { id: "nvidia-h100-sxm", name: "NVIDIA H100 SXM", vendor: "NVIDIA", kind: "gpu", aliases: ["h100"], specs: {
    memoryGB: { value: 80, unit: "GB", source: NV_H100, quote: "GPU Memory 80GB 94GB" },
    bandwidthTBs: { value: 3.35, unit: "TB/s", source: NV_H100, quote: "GPU Memory Bandwidth 3.35TB/s 3.9TB/s" },
    fp8Sparse: { value: 3958, unit: "TFLOPS", note: "with sparsity (*)", source: NV_H100, quote: "FP8 Tensor Core * 3,958 teraFLOPS" },
    bf16Sparse: { value: 1979, unit: "TFLOPS", note: "with sparsity (*)", source: NV_H100, quote: "BFLOAT16 Tensor Core * 1,979 teraFLOPS" },
    power: { value: 700, unit: "W", note: "up to, configurable", source: NV_H100, quote: "Max Thermal Design Power (TDP) Up to 700W (configurable)" } } },
  { id: "nvidia-h200-sxm", name: "NVIDIA H200 SXM", vendor: "NVIDIA", kind: "gpu", aliases: ["h200"], specs: {
    memoryGB: { value: 141, unit: "GB", source: NV_H200, quote: "GPU Memory 141GB" },
    memoryType: { value: "HBM3e", source: NV_H200, quote: "141 gigabytes (GB) of HBM3e" },
    bandwidthTBs: { value: 4.8, unit: "TB/s", source: NV_H200, quote: "GPU Memory Bandwidth 4.8TB/s" },
    fp8Sparse: { value: 3958, unit: "TFLOPS", note: "with sparsity (²)", source: NV_H200, quote: "FP8 Tensor Core² 3,958 TFLOPS" },
    bf16Sparse: { value: 1979, unit: "TFLOPS", note: "with sparsity (²)", source: NV_H200, quote: "BFLOAT16 Tensor Core² 1,979 TFLOPS" },
    power: { value: 700, unit: "W", note: "up to, configurable", source: NV_H200, quote: "Max Thermal Design Power (TDP) Up to 700W (configurable)" } } },
  { id: "nvidia-a100-80gb-sxm", name: "NVIDIA A100 80GB SXM", vendor: "NVIDIA", kind: "gpu", aliases: ["a100"], specs: {
    memoryGB: { value: 80, unit: "GB", source: NV_A100, quote: "GPU Memory 80GB HBM2e 80GB HBM2e" },
    memoryType: { value: "HBM2e", source: NV_A100, quote: "GPU Memory 80GB HBM2e 80GB HBM2e" },
    bandwidthTBs: { value: 2.039, unit: "TB/s", note: "2,039 GB/s (SXM column)", source: NV_A100, quote: "GPU Memory Bandwidth 1,935 GB/s 2,039 GB/s" },
    bf16Dense: { value: 312, unit: "TFLOPS", source: NV_A100, quote: "BFLOAT16 Tensor Core 312 TFLOPS | 624 TFLOPS*" },
    bf16Sparse: { value: 624, unit: "TFLOPS", note: "with sparsity (*)", source: NV_A100, quote: "BFLOAT16 Tensor Core 312 TFLOPS | 624 TFLOPS*" },
    power: { value: 400, unit: "W", note: "SXM standard config", source: NV_A100, quote: "Max Thermal Design Power (TDP) 300W 400W" } } },
  { id: "nvidia-dgx-b200", name: "NVIDIA DGX B200 (8-GPU system)", vendor: "NVIDIA", kind: "system", aliases: ["b200", "dgx b200", "blackwell"], specs: {
    memoryGB: { value: 1440, unit: "GB", note: "system total, 8 GPUs", source: NV_DGXB200, quote: "GPU Memory 1,440 GB total, 64 TB/s HBM3e bandwidth" },
    memoryType: { value: "HBM3e", source: NV_DGXB200, quote: "64 TB/s HBM3e bandwidth" },
    bandwidthTBs: { value: 64, unit: "TB/s", note: "system aggregate", source: NV_DGXB200, quote: "GPU Memory 1,440 GB total, 64 TB/s HBM3e bandwidth" },
    fp8Sparse: { value: 72, unit: "PFLOPS", note: "system, per vendor footnote (**)", source: NV_DGXB200, quote: "FP8 Tensor Core: 72 PFLOPS**" },
    fp4: { value: 144, unit: "PFLOPS", note: "system; 72 PFLOPS* is the other listed figure", source: NV_DGXB200, quote: "FP4 Tensor Core: 144 PFLOPS | 72 PFLOPS*" },
    power: { value: "~14.3", unit: "kW", note: "system max", source: NV_DGXB200, quote: "System Power Usage ~14.3 kW max" } } },
  { id: "amd-mi300x", name: "AMD Instinct MI300X", vendor: "AMD", kind: "gpu", aliases: ["mi300x", "mi300"], specs: {
    memoryGB: { value: 192, unit: "GB", source: AMD_300X, quote: "Dedicated Memory Size 192 GB" },
    memoryType: { value: "HBM3", source: AMD_300X, quote: "Dedicated Memory Type HBM3" },
    bandwidthTBs: { value: 5.3, unit: "TB/s", source: AMD_300X, quote: "Peak Memory Bandwidth 5.3 TB/s" },
    fp8Dense: { value: 2610, unit: "TFLOPS", note: "2.61 PFLOPs", source: AMD_300X, quote: "Peak Eight-bit Precision (FP8) Performance (E5M2, E4M3) 2.61 PFLOPs" },
    fp8Sparse: { value: 5220, unit: "TFLOPS", note: "5.22 PFLOPs", source: AMD_300X, quote: "Performance with Structured Sparsity (E5M2, E4M3) 5.22 PFLOPs" },
    bf16Dense: { value: 1307.4, unit: "TFLOPS", source: AMD_300X, quote: "1307.4 TFLOPS peak theoretical Bfloat16 format precision (BF16)" },
    power: { value: 750, unit: "W", note: "typical board power", source: AMD_300X, quote: "Typical Board Power (TBP) 750W" },
    process: { value: "5nm FinFET (CDNA 3)", source: AMD_300X, quote: "AMD CDNA™ 3 5nm FinFet process technology" } } },
  { id: "amd-mi325x", name: "AMD Instinct MI325X", vendor: "AMD", kind: "gpu", aliases: ["mi325x"], specs: {
    memoryGB: { value: 256, unit: "GB", source: AMD_325X, quote: "256GB HBM3E memory capacity and 6 TB/s" },
    memoryType: { value: "HBM3E", source: AMD_325X, quote: "256GB HBM3E memory capacity" },
    bandwidthTBs: { value: 6, unit: "TB/s", source: AMD_325X, quote: "Peak Memory Bandwidth 6 TB/s" },
    fp8Dense: { value: 2614.9, unit: "TFLOPS", source: AMD_325X, quote: "2614.9 TFLOPS peak theoretical 8-bit precision (FP8)" },
    bf16Dense: { value: 1307.4, unit: "TFLOPS", source: AMD_325X, quote: "1307.4 TFLOPS peak theoretical Bfloat16 format precision (BF16)" },
    power: { value: 1000, unit: "W", note: "typical board power", source: AMD_325X, quote: "Typical Board Power (TBP) 1000W" },
    process: { value: "5nm | 6nm FinFET", source: AMD_325X, quote: "5nm | 6nm FinFET process technology" } } },
  { id: "amd-mi355x", name: "AMD Instinct MI355X", vendor: "AMD", kind: "gpu", aliases: ["mi355x", "mi350"], specs: {
    memoryGB: { value: 288, unit: "GB", source: AMD_355X, quote: "Dedicated Memory Size 288 GB" },
    memoryType: { value: "HBM3E", source: AMD_355X, quote: "Dedicated Memory Type HBM3E" },
    bandwidthTBs: { value: 8, unit: "TB/s", source: AMD_355X, quote: "Peak Memory Bandwidth 8 TB/s" },
    fp8Dense: { value: 5000, unit: "TFLOPS", note: "OCP-FP8, 5 PFLOPs", source: AMD_355X, quote: "(OCP-FP8) Performance (E5M2, E4M3) 5 PFLOPs" },
    bf16Dense: { value: 2500, unit: "TFLOPS", note: "2.5 PFLOPs", source: AMD_355X, quote: "Peak bfloat16 (BF16) Matrix Performance 2.5 PFLOPs" },
    fp4Dense: { value: 10100, unit: "TFLOPS", note: "MXFP4, 10.1 PFLOPs", source: AMD_355X, quote: "Peak Microscaling Four-bit Precision Matrix (MXFP4) Performance 10.1 PFLOPs" },
    power: { value: 1400, unit: "W", note: "typical board power", source: AMD_355X, quote: "Typical Board Power (TBP) 1400W" },
    transistors: { value: 185, unit: "billion", source: AMD_355X, quote: "Transistor Count 185 Billion" } } },
  { id: "google-tpu-v5p", name: "Google TPU v5p", vendor: "Google", kind: "tpu", aliases: ["tpu v5p", "v5p"], specs: {
    memoryGB: { value: 95, unit: "GiB", source: G_V5P, quote: "HBM capacity per chip (GiB) 95" },
    bandwidthTBs: { value: 2.765, unit: "TB/s", note: "2765 GBps", source: G_V5P, quote: "HBM bandwidth per chip (GBps) 2765" },
    bf16Dense: { value: 459, unit: "TFLOPS", source: G_V5P, quote: "Peak compute per chip (BF16) (TFLOPs) 459" },
    fp8Dense: { value: 459, unit: "TFLOPS", source: G_V5P, quote: "Peak compute per chip (FP8) (TFLOPs) 459" } } },
  { id: "google-tpu-v6e", name: "Google TPU v6e (Trillium)", vendor: "Google", kind: "tpu", aliases: ["tpu v6e", "v6e", "trillium"], specs: {
    memoryGB: { value: 32, unit: "GB", source: G_V6E, quote: "HBM capacity per chip 32 GB" },
    bandwidthTBs: { value: 1.638, unit: "TB/s", note: "1638 GBps", source: G_V6E, quote: "HBM bandwidth per chip 1638 GBps" },
    bf16Dense: { value: 918, unit: "TFLOPS", source: G_V6E, quote: "Peak compute per chip (bf16) 918 TFLOPs" },
    int8: { value: 1836, unit: "TOPS", source: G_V6E, quote: "Peak compute per chip (Int8) 1836 TOPs" } } },
  { id: "aws-trainium3", name: "AWS Trainium3", vendor: "AWS", kind: "accelerator", aliases: ["trainium3", "trn3", "trainium"], specs: {
    memoryGB: { value: 144, unit: "GB", source: AWS_TRN, quote: "144 GB HBM3e per chip, 4.9 TB/s bandwidth" },
    memoryType: { value: "HBM3e", source: AWS_TRN, quote: "144 GB HBM3e per chip" },
    bandwidthTBs: { value: 4.9, unit: "TB/s", source: AWS_TRN, quote: "144 GB HBM3e per chip, 4.9 TB/s bandwidth" } } },
];

export interface Node { foundry: "TSMC" | "Samsung" | "Intel"; node: string; transistor: string; status: string; source: string; quote: string }
const TSMC_LOGIC = "https://www.tsmc.com/english/dedicatedFoundry/technology/logic/l_2nm";
export const NODES: Node[] = [
  { foundry: "TSMC", node: "N5 (5nm)", transistor: "FinFET", status: "Volume production 2020", source: TSMC_LOGIC, quote: "In 2020, TSMC became the first foundry to move 5nm FinFET (N5) technology into volume production" },
  { foundry: "TSMC", node: "N3 (3nm)", transistor: "FinFET", status: "High-volume production 2022", source: TSMC_LOGIC, quote: "In 2022, TSMC became the first foundry to move 3nm FinFET (N3) technology into high-volume production" },
  { foundry: "TSMC", node: "N2 (2nm)", transistor: "Nanosheet (GAA)", status: "Volume production started 4Q25", source: TSMC_LOGIC, quote: "TSMC’s 2nm (N2) technology has started volume production in 4Q25 as planned" },
  { foundry: "TSMC", node: "A16", transistor: "Nanosheet + backside power rail", status: "Announced (date not stated on cited page)", source: TSMC_LOGIC, quote: "TSMC A16™ technology integrates leading nanosheet transistors with innovative backside power rail solution" },
  { foundry: "TSMC", node: "A14", transistor: "Next-gen (per TSMC)", status: "Volume production scheduled 2028", source: TSMC_LOGIC, quote: "A14 is scheduled for volume production for 2028" },
  { foundry: "TSMC", node: "A13", transistor: "A14 family extension", status: "Volume production scheduled 2029", source: TSMC_LOGIC, quote: "A13 is scheduled for volume production in 2029" },
  { foundry: "Samsung", node: "3nm (SF3) GAA", transistor: "GAA (MBCFET)", status: "Initial production announced June 30, 2022", source: "https://news.samsung.com/global/samsung-begins-chip-production-using-3nm-process-technology-with-gaa-architecture", quote: "has started initial production of its 3-nanometer (nm) process node applying Gate-All-Around (GAA) transistor architecture" },
  { foundry: "Intel", node: "Intel 18A", transistor: "RibbonFET (GAA) + PowerVia backside power", status: "In high-volume production in the US", source: "https://www.intel.com/content/www/us/en/foundry/process/18a.html", quote: "In high-volume production in the United States" },
];
export const NODE_NOTES: Record<string, { text: string; source: string; quote: string }> = {
  "Intel 18A": { text: "Up to 18% higher performance at iso power or 38% lower power vs Intel 3", source: "https://www.intel.com/content/www/us/en/foundry/process/18a.html", quote: "Intel 18A Delivers up to 18% higher performance at iso power, 38% lower power at iso performance, and 30% chip density improvement versus Intel 3" },
};

/** Free, citable feeds for chip news (publisher RSS/Atom). */
export const FEEDS = [
  { name: "Tom's Hardware", url: "https://www.tomshardware.com/feeds.xml" },
  { name: "The Register", url: "https://www.theregister.com/headlines.atom" },
  { name: "SemiWiki", url: "https://semiwiki.com/feed/" },
  { name: "ServeTheHome", url: "https://www.servethehome.com/feed/" },
  { name: "EE Times", url: "https://www.eetimes.com/feed/" },
];
/** SEC EDGAR CIKs for chip companies (US filers; TSMC/ASML/ARM file 20-F/6-K or 10-K). */
export const COMPANIES: Record<string, { name: string; cik: string; news?: string }> = {
  NVDA: { name: "NVIDIA", cik: "0001045810" }, AMD: { name: "Advanced Micro Devices", cik: "0000002488", news: "AMD" }, INTC: { name: "Intel", cik: "0000050863" },
  TSM: { name: "Taiwan Semiconductor Manufacturing", cik: "0001046179", news: "TSMC" }, AVGO: { name: "Broadcom", cik: "0001730168", news: "Broadcom" }, MU: { name: "Micron Technology", cik: "0000723125", news: "Micron" },
  QCOM: { name: "Qualcomm", cik: "0000804328" }, ASML: { name: "ASML Holding", cik: "0000937966" }, ARM: { name: "Arm Holdings", cik: "0001973239", news: "Arm" }, SMCI: { name: "Super Micro Computer", cik: "0001375365", news: "Supermicro" },
};

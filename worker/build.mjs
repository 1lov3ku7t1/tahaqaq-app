// node worker/build.mjs — copies the AI pack runtime into app/public (served as-is by the static export).
// Model files are copied only if the lead has put them in _inbox/e5/. Prints the model size check.
import { cpSync, existsSync, mkdirSync, statSync, readdirSync } from "node:fs";
const here = new URL(".", import.meta.url).pathname.replace(/%20/g, " ");
const pub = here + "../app/public/";
const v = here + "vendor/";
mkdirSync(pub + "ort", { recursive: true });
cpSync(v + "tf/package/dist/transformers.min.js", pub + "transformers.min.js");
for (const f of ["ort-wasm-simd-threaded.asyncify.mjs", "ort-wasm-simd-threaded.asyncify.wasm", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"])
  cpSync(v + "ort/package/dist/" + f, pub + "ort/" + f);
cpSync(here + "embed-worker.js", pub + "embed-worker.js");
const inbox = here + "../_inbox/e5/";
const EXPECTED = 118308185;
if (existsSync(inbox)) {
  cpSync(inbox, pub + "models/e5/", { recursive: true });
  const m = pub + "models/e5/onnx/model_quantized.onnx";
  const size = existsSync(m) ? statSync(m).size : -1;
  console.log(`model_quantized.onnx: ${size} bytes, expected ${EXPECTED}: ${size === EXPECTED ? "OK" : "MISMATCH"}`);
  console.log("model files:", readdirSync(pub + "models/e5/", { recursive: true }).join(", "));
} else console.log("model files: NOT PRESENT (_inbox/e5/ missing). AI pack will show 'AI match unavailable, rules only'.");
console.log("runtime copied to app/public/");

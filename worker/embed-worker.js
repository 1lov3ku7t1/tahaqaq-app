// Module worker (A3). Ported from _import/proto/browser_check/worker.js. Self-hosted only: no Hugging Face, no CDN.
// It only embeds text. It never sees a result line and never decides anything.
import { pipeline, env } from "./transformers.min.js";   // @huggingface/transformers@4.3.2 dist, copied by worker/build.mjs

env.allowRemoteModels = false;              // never fall back to huggingface.co
env.allowLocalModels = true;                // false by default in browsers
env.localModelPath = new URL("./models/", self.location.href).href;   // next to this file, whatever sub-path the app is hosted under            // /models/e5/{config,tokenizer*.json}, /models/e5/onnx/model_quantized.onnx
env.backends.onnx.wasm.wasmPaths = new URL("./ort/", self.location.href).href; // otherwise ORT fetches its .wasm from a CDN
env.backends.onnx.wasm.numThreads = 1;      // no COOP/COEP on static hosting

let extractor = null;
self.onmessage = async (e) => {
  const { id, op, texts, prefix } = e.data;
  try {
    if (op === "load") {
      const t0 = performance.now();
      extractor = await pipeline("feature-extraction", "e5", { dtype: "q8", device: "wasm" });
      self.postMessage({ id, ok: true, loadMs: performance.now() - t0 });
    } else if (op === "embed") {
      const t0 = performance.now();
      const out = await extractor(texts.map(t => prefix + t), { pooling: "mean", normalize: true });
      self.postMessage({ id, ok: true, ms: performance.now() - t0, vectors: out.tolist() });
    }
  } catch (err) { self.postMessage({ id, ok: false, error: String((err && err.stack) || err) }); }
};

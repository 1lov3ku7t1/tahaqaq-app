// Module worker. Exactly what A3 ships as public/embed-worker.js in the Expo web build.
// Everything is self-hosted: no Hugging Face, no CDN. Paths are relative to the site root.
import { pipeline, env } from "../transformers.min.js";   // copied from @huggingface/transformers@4.3.2/dist

env.allowRemoteModels = false;          // never fall back to huggingface.co
env.allowLocalModels = true;            // GOTCHA: false by default in browsers -> "both local and remote models are disabled"
env.localModelPath = "/models/";        // /models/e5/{config,tokenizer*.json}, /models/e5/onnx/model_quantized.onnx
env.backends.onnx.wasm.wasmPaths = "/ort/"; // otherwise ORT fetches its .wasm from cdn.jsdelivr.net
env.backends.onnx.wasm.numThreads = 1;  // no COOP/COEP on static hosting -> single thread anyway

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
  } catch (err) { self.postMessage({ id, ok: false, error: String(err && err.stack || err) }); }
};

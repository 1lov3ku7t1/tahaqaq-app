"""Measure multilingual-e5-small (int8 ONNX, same file Transformers.js loads) on the constructed sets.
Usage: python3 -I embed_eval.py <model_dir>   (model_dir holds model_quantized.onnx + tokenizer.json)
Library = dev cases (cases.constructed.json, 'passage: '), queries = held-out ('query: '). kNN k=3 vote.
Then combines with the rules engine output (results/rules_cases.heldout.json) as two voters with abstention.
Prints numbers only; writes results/embed_heldout.json. Python stand-in for the browser worker:
the browser numbers (WASM) will be slower; measure them in the app (E6)."""
import json, sys, time, pathlib
import numpy as np, onnxruntime as ort
from tokenizers import Tokenizer

HERE = pathlib.Path(__file__).resolve().parent
mdir = pathlib.Path(sys.argv[1])
t0 = time.perf_counter()
tok = Tokenizer.from_file(str(mdir / "tokenizer.json"))
tok.enable_truncation(512)
sess = ort.InferenceSession(str(mdir / "model_quantized.onnx"), providers=["CPUExecutionProvider"])
cold = time.perf_counter() - t0
names = [i.name for i in sess.get_inputs()]

def embed(texts, prefix):
    out = []
    for t in texts:
        e = tok.encode(prefix + t)
        ids = np.array([e.ids], dtype=np.int64); am = np.array([e.attention_mask], dtype=np.int64)
        feed = {"input_ids": ids, "attention_mask": am}
        if "token_type_ids" in names: feed["token_type_ids"] = np.zeros_like(ids)
        h = sess.run(None, feed)[0]                       # last_hidden_state
        v = (h * am[..., None]).sum(1) / am.sum(1, keepdims=True)  # mean pooling
        out.append(v[0] / np.linalg.norm(v[0]))
    return np.stack(out)

A = sys.argv[2:5]
dev = json.load(open(A[0] if A else HERE / "data/cases.constructed.json"))["cases"]
ho = json.load(open(A[1] if A else HERE / "data/cases.heldout.json"))["cases"]
RULES = A[2] if len(A) > 2 else HERE / "results/rules_cases.heldout.json"
t1 = time.perf_counter(); L = embed([c["text"] for c in dev], "passage: "); lib_s = time.perf_counter() - t1
lat = []
Q = []
for c in ho:
    t = time.perf_counter(); Q.append(embed([c["text"]], "query: ")[0]); lat.append((time.perf_counter() - t) * 1000)
Q = np.stack(Q)
S = Q @ L.T
rules = {r["id"]: r for r in json.load(open(RULES))}
rows = []
for i, c in enumerate(ho):
    top = np.argsort(-S[i])[:3]
    votes = [dev[j]["label"] for j in top]
    emb = "scam" if votes.count("scam") >= 2 else "legit"
    rb = rules[c["id"]]["band"]
    rule = "scam" if rb == "stop_and_verify" else ("legit" if rb == "no_signs_found" else "soft")
    combined = emb if (rule == emb) else ("scam" if rule == "scam" and emb == "scam" else "abstain")
    if rule == "soft": combined = "abstain" if emb == "legit" else "scam"
    rows.append({"id": c["id"], "label": c["label"], "emb": emb, "rule": rule, "combined": combined,
                 "nearest": [dev[j]["id"] for j in top], "sim1": round(float(S[i][top[0]]), 3)})

def rate(pred_key, val, lab):
    sub = [r for r in rows if r["label"] == lab]; n = sum(r[pred_key] == val for r in sub); return f"{n}/{len(sub)}"
print(f"model load (cold, CPU, python): {cold:.2f}s | library {len(dev)} passages: {lib_s:.2f}s | query p50 {np.median(lat):.0f} ms, max {max(lat):.0f} ms")
print("embedding kNN alone : scams caught", rate("emb", "scam", "scam"), "| legit flagged", rate("emb", "scam", "legit"))
print("rules (stop only)   : scams caught", rate("rule", "scam", "scam"), "| legit flagged", rate("rule", "scam", "legit"))
print("two voters          : scams caught", rate("combined", "scam", "scam"), "| legit flagged", rate("combined", "scam", "legit"),
      "| abstain", sum(r["combined"] == "abstain" for r in rows), "/", len(rows))
for r in rows:
    if (r["label"] == "scam" and r["combined"] != "scam") or (r["label"] == "legit" and r["combined"] == "scam") or r["rule"] != r["emb"]:
        print("  ", r)
json.dump(rows, open(HERE / "results/embed_heldout.json", "w"), ensure_ascii=False, indent=1)

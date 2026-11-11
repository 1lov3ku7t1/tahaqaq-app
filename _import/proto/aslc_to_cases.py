"""Convert ASLC-448 (Mendeley p384bgyzz3 v5, CC BY 4.0) into engine test files.
The xlsx has no direct URL: the human lead downloads it in a browser ("Download All") and passes the path.
Usage: python3 -I aslc_to_cases.py arabic_scam_dataset_complete.xlsx
Writes data/aslc_lib.json (even rows per dialect) and data/aslc_test.json (odd rows per dialect).
text = caller turns only (closest to a received voice note); the receiver's replies are dropped.
Then:  node eval.ts data/aslc_test.json            (rules, per-dialect table)
       python3 -I embed_eval.py <model_dir> data/aslc_lib.json data/aslc_test.json results/rules_aslc_test.json
Caveat to print on every slide: simulated, scripted, TTS; phone calls with no links, so the
domain/registry checks are NOT exercised by this set."""
import json, sys, pathlib
from collections import defaultdict
from openpyxl import load_workbook

HERE = pathlib.Path(__file__).resolve().parent
ws = load_workbook(sys.argv[1], read_only=True).active
rows = list(ws.iter_rows(values_only=True))
hdr = [str(h).strip() for h in rows[0]]
need = ["conversation_id", "label", "category", "dialect", "caller_turn_1"]
missing = [c for c in need if c not in hdr]
if missing: sys.exit(f"columns missing: {missing}; found {hdr}")
ix = {h: i for i, h in enumerate(hdr)}
by_dialect = defaultdict(list)
for r in rows[1:]:
    if not r[ix["conversation_id"]]: continue
    turns = [r[ix[c]] for c in ("caller_turn_1", "caller_turn_2", "caller_turn_3") if c in ix and r[ix[c]]]
    lab = "scam" if str(r[ix["label"]]).strip().lower() == "scam" else "legit"
    by_dialect[str(r[ix["dialect"]])].append({"id": r[ix["conversation_id"]], "label": lab,
        "group": str(r[ix["category"]]), "dialect": str(r[ix["dialect"]]), "text": " ".join(map(str, turns))})
lib, test = [], []
for d, items in sorted(by_dialect.items()):
    items.sort(key=lambda x: x["id"])
    for k, it in enumerate(items): (lib if k % 2 == 0 else test).append(it)
json.dump({"_note": "ASLC-448 v5 CC BY 4.0, caller turns only", "cases": lib}, open(HERE / "data/aslc_lib.json", "w"), ensure_ascii=False)
json.dump({"_note": "ASLC-448 v5 CC BY 4.0, caller turns only", "cases": test}, open(HERE / "data/aslc_test.json", "w"), ensure_ascii=False)
print(f"lib {len(lib)} | test {len(test)} | dialects {dict((d, len(v)) for d, v in by_dialect.items())}")
print("label balance test:", {l: sum(c['label'] == l for c in test) for l in ('scam', 'legit')})

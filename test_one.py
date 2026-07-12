import json, sys, urllib.request

t = sys.argv[1]
sid = sys.argv[2]
token = sys.argv[3]

qs = json.load(open(f"/tmp/qs_{t}.json"))["questions"]
answers = []
for q in qs:
    typ = q["type"]
    if typ in ("scale", "dilemma"):
        a = {"option_id": q["points" if typ == "scale" else "options"][0]["id"]}
    elif typ == "allocation":
        total = q["total"]; tgts = q["targets"]; n = len(tgts)
        a = {"allocation": {tgts[i]["id"]: (total // n) + (total % n if i == 0 else 0) for i in range(n)}}
    elif typ == "sort":
        a = {"order": [it["id"] for it in q["items"]]}
    elif typ == "iat":
        a = {"iat": [{"word": w["word"], "category": w["category"], "response": w["category"], "rt": 500, "correct": True} for w in q["words"]]}
    elif typ == "slider":
        a = {"position": 75}
    elif typ == "forced_choice":
        a = {"choice": q["sides"][0]["id"]}
    elif typ == "matrix":
        a = {"ratings": {s["id"]: 6 for s in q["statements"]}}
    elif typ == "auction":
        budget = q["budget"]; items = q["items"]; n = len(items)
        a = {"bids": {items[i]["id"]: budget // n for i in range(n)}}
    answers.append({"question_id": q["id"], "answer": a, "duration_ms": 5000, "change_count": 1, "trajectory": [{"t": 0.0, "value": "x"}]})

payload = {"answers": answers, "complete": True}
req = urllib.request.Request(
    f"http://127.0.0.1:8765/api/sessions/{sid}/responses",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json", "X-User-Token": token},
    method="POST",
)
r = urllib.request.urlopen(req)
res = json.loads(r.read().decode())
print(f"  result_id: {res['result_id']}")

req2 = urllib.request.Request(f"http://127.0.0.1:8765/api/results/{res['result_id']}", headers={"X-User-Token": token})
r2 = urllib.request.urlopen(req2)
d = json.loads(r2.read().decode())

print(f"  summary: {d['summary'][:100]}")
print(f"  top match: {d['matches'][0]['name']} {d['matches'][0]['match_pct']}%")
print(f"  profile tags: {d.get('profile', {}).get('tags', [])}")
print(f"  conflicts count: {len(d['conflicts'])}")
print(f"  insights keys: {list(d['insights'].keys())}")
print(f"  percentiles sample: {dict(list(d.get('percentiles', {}).items())[:2])}")

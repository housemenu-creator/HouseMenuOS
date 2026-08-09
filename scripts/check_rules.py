import json

with open('C:/Users/archiphone/AppData/Local/Temp/rules2.json', encoding='utf-8-sig') as f:
    raw = f.read()

try:
    d = json.loads(raw)
    rules = d.get('rules', d)
    print(json.dumps(rules, indent=2))
except json.JSONDecodeError:
    # The file might be the raw rules format from firebase CLI
    print(raw[:3000])

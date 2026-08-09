import json

with open('C:/Users/archiphone/AppData/Local/Temp/rules2.json', encoding='utf-16') as f:
    raw = f.read()

d = json.loads(raw)
rules = d.get('rules', d)
s = json.dumps(rules, indent=2)
# Find the "branches" section
idx = s.find('"branches"')
if idx >= 0:
    print(s[idx:idx+500])
else:
    # Print everything about branches
    for line in s.split('\n'):
        if 'branch' in line.lower():
            print(line)

import json, re

with open('C:/Users/archiphone/AppData/Local/Temp/rules2.json', 'rb') as f:
    raw = f.read()

text = raw.decode('utf-16')

# Try to find just the JSON part - from first { to last }
start = text.find('{')
end = text.rfind('}')
if start >= 0 and end > start:
    json_str = text[start:end+1]
    try:
        d = json.loads(json_str)
        rules = d.get('rules', d)
        # Print just the branches section
        out = json.dumps(rules, indent=2)
        # Find branches
        lines = out.split('\n')
        in_branches = False
        depth = 0
        for line in lines:
            if '"branches"' in line:
                in_branches = True
            if in_branches:
                print(line)
                if '{' in line: depth += line.count('{')
                if '}' in line: depth -= line.count('}')
                if depth <= 0:
                    break
        if not in_branches:
            print("'branches' not found at top level. Searching...")
            for i, line in enumerate(lines):
                if 'read' in line.lower() and 'true' in line:
                    prev = lines[max(0,i-3):i]
                    print('---')
                    for p in prev:
                        print(p)
                    print(line)
                    print('---')
    except json.JSONDecodeError as e:
        print(f'JSON error: {e}')
        print(f'Around char {e.pos}: ...{json_str[max(0,e.pos-100):e.pos+100]}...')

import json, os

home = os.path.expanduser('~')
paths = [
    os.path.join(home, '.config', 'firebase', '.firebaserc'),
    os.path.join(home, '.config', 'configstore', 'firebase-tools.json'),
]
for p in paths:
    if os.path.exists(p):
        with open(p, encoding='utf-8-sig') as f:
            d = json.load(f)
        print(f'{p}:')
        # Search for tokens at any level
        def find_tokens(obj, depth=0):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if 'token' in k.lower() and isinstance(v, str):
                        print(f'  {"  " * depth}{k}: {v[:50]}...')
                    find_tokens(v, depth+1)
        find_tokens(d)

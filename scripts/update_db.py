import json, os, urllib.request

# Read access token from firebase config
home = os.path.expanduser('~')
cfg_path = os.path.join(home, '.config', 'configstore', 'firebase-tools.json')
with open(cfg_path, encoding='utf-8-sig') as f:
    cfg = json.load(f)

token = cfg.get('tokens', {}).get('access_token')
if not token:
    print('No access token found')
    exit(1)

# Database URL
db_url = 'https://house-menuapp-default-rtdb.firebaseio.com'

# Products to update: correct IDs with dash prefix
updates = [
    ('-Ow9Qf5wjd203yPe4TpB', {'minStock': 10, 'supplierId': 'sup-proveedor-local', 'trackStock': True}),  # Tallarines Verdes
    ('-Ow9SN6ur9EeKNRQg903', {'minStock': 10, 'supplierId': 'sup-proveedor-local', 'trackStock': True}),  # Ceviches
    ('-OwnW-hU2Vxp8KcHtHVs', {'minStock': 10, 'supplierId': 'sup-proveedor-local', 'trackStock': True}),  # Chicharrones
    ('-Ows7e7cpzlDYr5qV3HR', {'minStock': 10, 'supplierId': 'sup-proveedor-local', 'trackStock': True}),  # Lomo Saltado
]

for prod_id, data in updates:
    url = f'{db_url}/branches/monteverde/catalog/products/{prod_id}.json?access_token={token}'
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, method='PATCH')
    req.add_header('Content-Type', 'application/json')
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        print(f'{prod_id}: OK -> {json.dumps(result)[:80]}')
    except urllib.error.HTTPError as e:
        print(f'{prod_id}: ERROR {e.code} {e.read().decode()[:100]}')

# Also clean up the bogus nodes (without dash) that were created by mistake
bogus_ids = ['Ow9Qf5wjd203yPe4TpB', 'Ow9SN6ur9EeKNRQg903', 'OwnW-hU2Vxp8KcHtHVs', 'Ows7e7cpzlDYr5qV3HR']
for bogus_id in bogus_ids:
    url = f'{db_url}/branches/monteverde/catalog/products/{bogus_id}.json?access_token={token}'
    req = urllib.request.Request(url, method='DELETE')
    try:
        resp = urllib.request.urlopen(req)
        print(f'{bogus_id}: DELETED (bogus node)')
    except urllib.error.HTTPError as e:
        print(f'{bogus_id}: DELETE ERROR {e.code}')

print('\nDone!')

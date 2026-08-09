import json, os

path = os.environ['TEMP'] + '\\products.json'
with open(path) as f:
    d = json.load(f)

if not d:
    print('No products found at /branches/monteverde/catalog/products')
else:
    for k, v in sorted(d.items(), key=lambda x: x[1].get('name', '')):
        name = v.get('name', '?')
        min_stock = v.get('minStock', '-')
        supplier = v.get('supplierId', '-')
        stock = v.get('stock', '-')
        track = v.get('trackStock', '-')
        avail = v.get('available', True)
        print(f'{k}: {name} | minStock={min_stock} | supplierId={supplier} | stock={stock} | trackStock={track} | available={avail}')

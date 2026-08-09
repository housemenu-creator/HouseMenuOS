import json
with open('C:/Users/archiphone/AppData/Local/Temp/prods.json', encoding='utf-8') as f:
    d = json.load(f)
print(f'{len(d)} products')
for k in sorted(d.keys()):
    p = d[k]
    ms = p.get("minStock", "-")
    sid = str(p.get("supplierId", "-"))
    st = p.get("stock", "-")
    print(f'{k[:20]:20s} | {p.get("name","?"):30s} | minStock={ms} | supplierId={sid} | stock={st}')

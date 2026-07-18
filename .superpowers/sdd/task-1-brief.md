# Task 1: Extender Supplier CRUD

## Archivos a modificar

1. `apps/house-menu/src/lib/logisticsService.js` — funciones createSupplier, updateSupplier (lines 221-253)
2. `apps/house-menu/src/admin/tabs/LogisticsTab.jsx` — SuppliersSection (lines 571-654)

## Lo que hay que hacer

### En logisticsService.js

Extender `createSupplier` para incluir nuevos campos:

```javascript
export async function createSupplier(branchId, data) {
  const ref_ = ref(db, `${LOG(branchId)}/suppliers`);
  const newRef = push(ref_);
  const supplier = {
    name: data.name,
    contacto: data.contacto || '',
    telefono: data.telefono || '',
    email: data.email || '',
    direccion: data.direccion || '',
    tipoDocumento: data.tipoDocumento || 'informal',
    numDocumento: data.numDocumento || '',
    plazoPago: data.plazoPago || 'contado',
    categorias: data.categorias || [],
    activo: data.activo !== false,
    createdAt: nowISO(),
  };
  await set(newRef, supplier);
  return { success: true, id: newRef.key };
}
```

El `updateSupplier` actual ya hace `update(ref, safe)` — funciona sin cambios porque los nuevos campos se pasan en `data`.

### En LogisticsTab.jsx, SuppliersSection

1. **Actualizar estado inicial de `form`**: agregar `contacto`, `telefono`, `email`, `direccion`, `tipoDocumento`, `numDocumento`, `plazoPago`, `categorias`, `activo`

2. **Actualizar `resetForm`**: mismos campos

3. **Actualizar el form grid (líneas ~611-619)**: reemplazar los 4 inputs actuales con un grid de 3 columnas que incluya:
   - Nombre
   - Contacto
   - Teléfono
   - Email
   - Dirección
   - Tipo Documento (select: RUC/DNI/Informal)
   - Nro Documento (solo si tipo !== 'informal', condicional)
   - Plazo Pago (select: contado/7d/15d/30d)
   - Notas (textarea, ya existe)

4. **Actualizar tarjetas de proveedor** (líneas ~633-651): mostrar nuevos campos (tipo doc, nro doc, plazo pago)

5. **Actualizar `handleSave`**: pasar `setEditing` con los campos nuevos

## Reglas

- NO cambiar otras secciones del archivo
- NO agregar dependencias
- Usar clases `cm-*` existentes
- `fmtCurrency(n)` ya existe ("S/ X.XX")

## Reporte

Escribir reporte en `.superpowers/sdd/task-1-report.md` con:
- Commits realizados
- Test de build: `npx vite build` output
- Cualquier preocupación

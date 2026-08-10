# Walkthrough — House-Portal-OS

## 2026-05-22: Sesión masiva — Delivery + WhatsApp + SUNAT

### Objetivo
Completar todas las mejoras pendientes del proyecto: sistema de entregas, WhatsApp/Telegram, facturación electrónica.

### Logros

#### Sistema de Delivery (4 áreas)
- **Repartidores**: CRUD completo en admin, toggle disponible/ocupado, asignación desde DispatchView
- **Zonas de delivery**: Configuración por sucursal con tarifa variable, ETA, umbral de gratis
- **Rastreo para clientes**: Nombre del repartidor + "En camino" en OrderTracker
- **Métricas**: KPIs (entregas hoy, tiempo promedio), ranking de repartidores, tabla de entregas

#### HousePySbot — Multi-canal (Telegram + WhatsApp)
- **Session Manager**: Historial compartido entre canales (últimos 10 mensajes)
- **WhatsApp (Baileys)**: Conexión vía QR, recibe y responde mensajes, reconexión automática
- **Web UI QR**: Servidor Express + Socket.IO en :3000 para escanear QR desde el celular
- **Telegram**: Refactorizado para usar el session manager compartido
- **Toggle por flag**: Telegram opcional (TELEGRAM_BOT_TOKEN) y WhatsApp opcional (WHATSAPP_ENABLED)

#### SUNAT Facturación Electrónica
- **FiscalManager**: Configuración de datos del contribuyente (RUC, razón social, dirección)
- **sunatService.js**: Generación de comprobantes (Factura/Boleta), contador automático de serie+correlativo
- **Impresión térmica**: Vista previa imprimible del CPE con formato SUNAT
- **Historial**: Lista de comprobantes emitidos con estado (pendiente/aceptado/rechazado)
- **Estructura lista para envío SUNAT real** cuando se configure certificado digital + SOL

#### Infraestructura
- **.gitignore** raíz creado (protege .env, wa_session, node_modules)
- **chaly compila**: TypeScript strict mode, 0 errores
- **house-menu compila**: Vite build, 0 errores

### Archivos creados
```
apps/housepysbot/src/
├── bot/whatsapp.ts           ← Conexión Baileys + manejo de mensajes
├── lib/session.ts            ← Historial compartido Telegram/WhatsApp
└── services/qr-server.ts     ← Web UI QR + Socket.IO

apps/house-menu/src/
├── lib/
│   ├── deliveryService.js    ← Drivers, zonas, asignaciones, logs
│   └── sunatService.js       ← Facturación electrónica SUNAT
├── admin/components/
│   ├── DeliveryManager.jsx   ← Admin: repartidores, zonas, métricas
│   └── FiscalManager.jsx     ← Admin: datos fiscales, generar CPE, historial

.gitignore                     ← Protege secrets
walkthrough.md                 ← Este archivo
```

### Archivos modificados
```
apps/housepysbot/
├── src/index.ts              ← Inicia Telegram + WhatsApp + QR server
├── src/bot/telegram.ts       ← Usa session.ts compartido
├── .env.example              ← WHATSAPP_ENABLED, QR_UI_PORT
└── package.json              ← @whiskeysockets/baileys, express, socket.io, qrcode

apps/house-menu/src/
├── pages/
│   ├── AdminView.jsx         ← Tabs: Delivery + Facturación
│   ├── DispatchView.jsx      ← Asignación de repartidores, driver info
│   └── OrderTracker.jsx      ← Driver name + ETA
└── components/
    └── CartDrawer.jsx        ← Selector de zonas de delivery con precio dinámico
```

## 2026-08-09: Voucher OCR — Recepción de órdenes de compra

### Objetivo
Automatizar la recepción de órdenes de compra con la boleta del proveedor: subir voucher → OCR (Gemini Flash) → fuzzy match → prefill → confirmación humana vía `receivePurchaseOrder` (sin cambios).

### Logros
- **Subida de voucher**: JPG/PNG/WebP ≤ 5MB a Storage en `branches/{bid}/vouchers/{oid}_{ts}`; metadata (`voucherUrl`, `voucherFileName`, `uploadedAt`) persistida en el PO de forma aditiva; preview + progreso en el modal
- **Extracción OCR**: `extractVoucher()` (Gemini 2.0 Flash, JSON mode, contexto con items esperados, downscale ≤ 2048px, timeout 8s, matriz de errores completa)
- **Fuzzy match**: `normalizeForMatch` (acentos, unidades, artículos) + score Jaccard/contención, one-to-one greedy, umbral 0.6; items sin match van a "Revisar manualmente"
- **Prefill con confirmación humana**: cantidades/costos prefilled con badge "Emparejado"; los edits del usuario siempre ganan (userTouched); totales en tiempo real
- **Confirmación**: "Confirmar recepción" usa `receiveQtys` (prefill + manual) → `receivePurchaseOrder` intacto (lock atómico, kardex, evento `purchase_order.delivered`); los campos de voucher sobreviven a la recepción; la doble recepción aborta sin duplicar movimientos
- **Degradación total**: sin voucher / sin API key / timeout / fallo de red → toast de error + entrada manual idéntica; "Reintentar extracción" re-ejecuta; toast de éxito incluye el nombre del voucher
- **Rollout gradual**: feature flag `VITE_ENABLE_VOUCHER_OCR=true` (off por defecto; activado en test env)
- **Testing**: 749 tests verdes (87 archivos) — suites nuevas de fuzzyMatch, extractVoucher, attachVoucher/storage, modal completo, y recepción (conservación de voucher + doble recepción)

### Archivos clave
```
apps/house-menu/src/
├── lib/aiService.ts              ← extractVoucher + AI_STEPS_EXTRACT_VOUCHER
├── lib/voucherMatch.js           ← normalizeForMatch + fuzzyMatch (puros)
├── lib/logisticsService.js       ← attachVoucher + campos aditivos en create/update PO
├── lib/storageService.js         ← uploadVoucher + validateVoucherFile (verificados)
├── admin/tabs/LogisticsTab.jsx   ← ReceiveOrderModal: upload, extracción, prefill, confirmación, flag 8.1
└── src/lib|admin/tabs/__tests__/ ← fuzzyMatch, aiService.extractVoucher, logisticsService.voucher,
                                    storageService.voucher, LogisticsTab.voucher, logisticsService.receivePurchaseOrder
```

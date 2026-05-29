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

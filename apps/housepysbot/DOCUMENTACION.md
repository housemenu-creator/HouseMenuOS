# HousePySbot — Sistema Multi-Agente

## Arquitectura General

HousePySbot es un sistema de **agentes de IA** que operan tu restaurante a través de Telegram y WhatsApp. Cada agente tiene una personalidad, un propósito y un conjunto de herramientas específico.

```
                    ┌────────────────────────┐
                    │      MCP TOOLS          │
                    │  (30 herramientas)      │
                    └──────┬────────┬─────────┘
                           │        │
              ┌────────────┘        └────────────┐
              ▼                                   ▼
    ┌──────────────────┐              ┌──────────────────┐
    │ AGENTE ATENCIÓN  │              │  AGENTE ADMIN     │
    │ Al Cliente       │              │  (Dueño/Gerente)  │
    │                  │              │                   │
    │ Telegram Público │              │ Telegram Privado  │
    │ WhatsApp Público │              │ (chat ID owner)   │
    └──────────────────┘              └──────────────────┘
                │                             │
                └──────────┬──────────────────┘
                           ▼
                   ┌──────────────┐
                   │  Firebase     │
                   │  RTDB         │
                   │  (datos)      │
                   └──────────────┘
```

## Agentes

### 1. Agente Atención al Cliente

| Propiedad | Valor |
|-----------|-------|
| **ID** | `atencion` |
| **Canales** | Telegram público (@HousePySbot), WhatsApp (+51 957 776 856) |
| **Personalidad** | Amable, rápido, directo. Peruano amiguero |
| **Propósito** | Atender clientes: mostrar menú, crear pedidos, consultar estado |

**Tools disponibles (6):**
| Tool | Descripción |
|------|-------------|
| `ver_menu` | Muestra el menú completo por categorías |
| `buscar_producto` | Busca productos por nombre o descripción |
| `crear_pedido` | Crea pedido con productos, calcula delivery |
| `consultar_pedido` | Estado de un pedido por su ID |
| `info_restaurante` | Dirección, horario, teléfono |
| `calcular_costo_zona` | Calcula costo de delivery según dirección |

**Qué NO puede hacer:**
- Gestionar caja (abrir/cerrar turnos)
- Modificar el menú (precios, disponibilidad)
- Asignar repartidores
- Generar comprobantes SUNAT
- Ver reportes de ventas

---

### 2. Agente Administración

| Propiedad | Valor |
|-----------|-------|
| **ID** | `admin` |
| **Canales** | Telegram privado (solo dueño, identificado por `ADMIN_CHAT_ID`) |
| **Personalidad** | Profesional, ejecutivo, directo, preciso |
| **Propósito** | Gestión completa del restaurante desde el chat |

**Tools disponibles (23):**
| Tool | Descripción |
|------|-------------|
| `resumen_dia` | Ventas del día o fecha específica |
| `abrir_turno` | Abre turno de caja con monto inicial |
| `cerrar_turno` | Cierra turno con conteo final |
| `ventas_por_metodo` | Desglose por método de pago |
| `toggle_disponible` | Activa/desactiva producto |
| `actualizar_precio` | Cambia precio de producto |
| `crear_producto` | Agrega producto al menú |
| `ver_stock` | Niveles de stock actuales |
| `ajustar_stock` | Incrementa/decrementa stock |
| `alertas_stock_bajo` | Productos bajo umbral |
| `cambiar_estado_pedido` | Actualiza estado de pedido |
| `cancelar_pedido` | Cancela pedido existente |
| `ver_repartidores` | Lista repartidores disponibles |
| `asignar_repartidor` | Asigna driver a pedido |
| `crear_zona_delivery` | Nueva zona de delivery |
| `actualizar_zona_delivery` | Edita zona existente |
| `info_restaurante` | Información del local |
| `actualizar_horario` | Cambia horario de atención |
| `actualizar_delivery` | Ajusta costo/free threshold |
| `generar_cpe` | Genera Factura/Boleta |
| `historial_cpes` | Historial de comprobantes |
| `ver_menu` | Menú completo |
| `calcular_costo_zona` | Calcula costo de delivery |

---

## Routing de mensajes

El router (`src/agents/router.ts`) determina qué agente maneja cada mensaje según su origen:

```
WhatsApp → siempre Agent Atención

Telegram:
  └─ chat ID == ADMIN_CHAT_ID → Agent Admin
  └─ cualquier otro chat       → Agent Atención
```

**Configuración:**
```env
# .env
ADMIN_CHAT_ID=123456789   # Tu ID de Telegram (@userinfobot)
```

Para obtener tu chat ID: inicia chat con [@userinfobot](https://t.me/userinfobot) en Telegram y presiona Start.

---

## MCP Tools (Motor de herramientas)

Las 30 herramientas están organizadas en 7 módulos dentro de `src/mcp/tools/`:

| Módulo | Archivo | Tools | Lectura/Escritura |
|--------|---------|-------|:---:|
| Órdenes | `orders.ts` | crear, consultar, cambiar estado, cancelar | RW |
| Menú | `menu.ts` | ver, buscar, toggle disponible, precio, crear | RW |
| Inventario | `inventory.ts` | ver stock, ajustar, alertas | RW |
| Delivery | `delivery.ts` | calcular costo, repartidores, asignar, CRUD zonas | RW |
| Caja | `caja.ts` | resumen, abrir turno, cerrar turno, ventas por método | RW |
| SUNAT | `sunat.ts` | generar CPE, historial | RW |
| Sucursal | `branch.ts` | info, actualizar horario, actualizar delivery | RW |

Todas las herramientas leen y escriben directamente en Firebase RTDB.

---

## Stack Técnico

| Componente | Tecnología |
|------------|-----------|
| **Lenguaje** | TypeScript 5.x |
| **Runtime** | Node.js 22 (o Bun) |
| **LLM** | OpenRouter (deepseek-v4-flash:free, fallback llama-3.3-70b) |
| **Firebase** | RTDB (lectura/escritura directa) |
| **WhatsApp** | Baileys (WebSocket, multi-device) |
| **Telegram** | Telegraf |
| **MCP SDK** | @modelcontextprotocol/sdk v1.29 |
| **Frontend** | React + Vite (house-menu) |

---

## Estructura del Proyecto

```
apps/housepysbot/src/
├── agents/
│   ├── config.ts       ← Definición de agentes (system prompts + tools)
│   └── router.ts       ← Routing de mensajes por origen
├── agent/
│   └── index.ts        ← Motor del agente (OpenRouter + tool execution)
├── bot/
│   ├── telegram.ts     ← Bot de Telegram (con routing multi-agente)
│   └── whatsapp.ts     ← Bot de WhatsApp (Siempre → Atención)
├── mcp/
│   ├── types.ts        ← Interfaces MCP
│   ├── registry.ts     ← Registro central de tools
│   ├── adapter.ts      ← MCP → OpenAI function calling
│   ├── server.ts       ← MCP Server (standalone, stdio)
│   └── tools/          ← 7 módulos de herramientas
│       ├── orders.ts
│       ├── menu.ts
│       ├── inventory.ts
│       ├── delivery.ts
│       ├── caja.ts
│       ├── sunat.ts
│       └── branch.ts
├── lib/
│   ├── firebase.ts     ← Conexión Firebase (exporta read + write)
│   ├── branch.ts       ← Información del restaurante
│   ├── menu.ts         ← Consultas de menú
│   ├── orders.ts       ← Consultas de pedidos
│   ├── session.ts      ← Historial de conversación
│   └── rateLimit.ts    ← Control de velocidad
└── services/
    └── qr-server.ts    ← Servidor QR para WhatsApp
```

---

## Flujo de un mensaje

```
Usuario escribe "2 Lomo Saltado" en WhatsApp
  ↓
bot/whatsapp.ts recibe el mensaje
  ↓
router.routeWhatsApp() → agentId = "atencion"
  ↓
agent/index.ts processMessage(texto, branchId, history, "atencion")
  ↓
1. getAgentConfig("atencion") → system prompt + allowedTools
2. buildSystemPrompt("atencion") → prompt con datos del restaurante
3. adapter.toOpenAiTools() → 30 tools
   ↓ filtro por allowedTools (solo 6 tools permitidas)
4. OpenRouter recibe: prompt + 6 tools + mensaje del usuario
5. OpenRouter responde con tool_call: crear_pedido(...)
6. adapter.executeTool("crear_pedido", args, branchId)
   ↓
   - Busca productos en Firebase
   - Calcula delivery fee
   - Crea pedido en Firebase
   - Devuelve resultado
7. OpenRouter recibe resultado → genera respuesta final
8. "¡Pedido #ABC123 creado! Total: S/ 45.00"
  ↓
bot/whatsapp.ts envía respuesta al usuario
```

---

## Comandos Rápidos (Telegram)

### Para clientes (Agente Atención)
| Comando | Acción |
|---------|--------|
| `/start` | Mensaje de bienvenida |
| `/help` | Lista de comandos |
| `/menu` | Ver menú completo |
| `/pedido ID` | Consultar estado de pedido |

### Para el dueño (Agente Admin)
| Comando | Acción |
|---------|--------|
| `/start` | Panel de admin |
| `/help` | Comandos admin |
| `/menu` | Ver menú completo |
| `/resumen` | Ventas del día |
| `/stock` | Niveles de stock |
| `/turno abrir 200` | Abrir caja con S/200 |
| `/turno cerrar 850` | Cerrar caja en S/850 |
| `/pedido ID` | Consultar pedido |

También puedes **escribir en lenguaje natural**:
- "Cierra la caja, tengo S/ 920"
- "Cuánto vendimos hoy?"
- "Desactiva el Arroz con Mariscos"
- "Agrega una Lúcuma Batida al menú a S/ 12"

---

## Variables de Entorno

Ver `.env.example` para todas las variables.

| Variable | Obligatorio | Descripción |
|----------|:-----------:|-------------|
| `OPENROUTER_API_KEY` | ✅ | API key de OpenRouter |
| `TELEGRAM_BOT_TOKEN` | depende | Token del bot de Telegram |
| `FIREBASE_DATABASE_URL` | ✅ | URL de Firebase RTDB |
| `WHATSAPP_ENABLED` | ❌ | `true` para activar WhatsApp |
| `ADMIN_CHAT_ID` | ❌ | Tu chat ID de Telegram para agente Admin |
| `HOUSEPYSBOT_BRANCH_ID` | ❌ | ID de sucursal (default: "default") |

---

## Despliegue

### Local (desarrollo)
```bash
cd apps/housepysbot
cp .env.example .env
# Editar .env con tus credenciales
npx tsx src/index.ts
```

### Producción (Fly.io - $0/mes)
```bash
# 1. Instalar flyctl
# 2. Configurar
fly launch
# 3. Hacer deploy
fly deploy
# 4. Configurar secrets
fly secrets set OPENROUTER_API_KEY=...
fly secrets set TELEGRAM_BOT_TOKEN=...
# 5. Crear volumen persistente (para sesión WhatsApp)
fly volumes create wa_data --size 1
```

---

## Próximos Pasos (Fase 2)

- **Agente Cocina**: Notificaciones automáticas de nuevos pedidos al grupo de cocina
- **Agente Monitor**: Health checks automáticos, alertas de conexión
- **Impresión automática**: Comandas en cocina al recibir pedido
- **Múltiples sucursales**: Cada sucursal con su propio equipo de agentes

# 🎮 Eternal Nexus: Realms of Value
## Game Design Document (GDD) & Tokenomics (v1.0)

### 1. Resumen Ejecutivo
**Eternal Nexus** es un RPG online multijugador (MMORPG ligero) con una economía híbrida.
- **Principio central:** "Jugar para disfrutar, con posibilidad de generar valor".
- **Modelo:** *Play and Earn* (no Play-to-Earn). Prioriza la estabilidad sobre el hype.
- **Validación Ácida:** El juego funciona y retiene jugadores aunque la capa cripto sea inexistente.

### 2. Core Loop
1. Explorar, combatir y completar misiones.
2. Obtener recursos, subir XP y mejorar habilidades.
3. Crear objetos (Crafting) e interactuar en el mercado P2P.
4. Quema de valor (Sinks: Reparaciones/Upgrades).

### 3.istemas Principales (Economía de Capa Dual)

#### Capa 1: Oro (Moneda Base Fija - Off-Chain)
Moneda inyectada y destruida directamente por los NPCs. Sujeta al *Sink-Rate* para evitar inflación masiva.
- **Farm Rate Medio**: ~100 Oro/Hora para casuales (Lv. Bajo). ~500 Oro/Hora endgame.
- **Sink Base (Tasa de Reparación)**: **35% del farmeo promedio**. Si un usuario de Tier MÁX farmea 500/h, pagar sus reparaciones le costará ~175.
- **Sink de Muerte**: Castigo duro (pérdida de durabilidad x10). Fomenta juego seguro y skill.
- **Tax de Mercado**: 5% retenido permanentemente por subastas de jugadores.
- **Upgrades**: Curva Exponencial (`Base * 1.5^N`).

#### Capa 2: Token $NEXUS (Escasez Agresiva - On-Chain)
El token de valor secundario.
- **Suministro Final Máximo**: 100,000,000 NEXUS.
- **Faucet Restringido**: Jugadores **NO** dropean NEXUS cazando monstruos. Se inyecta solo vía *Competitividad Semanal* (PvP, Rankings Top 100).
- **Destino del Ingreso**: Cuando un jugador gasta NEXUS en pases/upgrades premium: **70% vuelve a la piscina (Treasury)** y **30% se Quema (Burn Deflacionario)**.

#### Capa 3: Activos NFT & Creadores (Los Tierras/Crafters)
- **Terrenos Limitados (5,000 unidades iniciales)**.
- **Profesión Clave:** Para crear una reliquia legendaria (NFT) hace falta:
   a) Ítem Base in-game
   b) 1,000 Oro (Destruido)
   c) Un costo de Forja en NEXUS (Destruido).
- **Mercado:** Las cuentas free-to-play pueden pagar *Oro* a los dueños de Tierras/Crafters por sus servicios. La "Inversión" en terrenos se justifica captando clientes dentro del juego, no especulando.

### 4. Seguridad, Escalabilidad y Retención
- **Cero ROI**: No hay ingresos pasivos fijos. Todo proviene del flujo de la comunidad.
- **Banco Central Algorítmico**: Funciones Cloud detectan granjas de oro anómalas y alteran los *Drops Rates* de regiones saturadas (Bot Hunting).

# Security Guidelines — House-Portal-OS (ECC Inspired)

## Firebase RTDB Security

### Reglas Críticas
- Validar `auth.uid` en TODAS las rutas protegidas
- Usar `_role_cache/{auth.uid}` para verificación de roles RTDB
- `in` operator soportado: `root.child('branches/'+bid+'/_role_cache/'+auth.uid).val() in ['admin', 'superadmin']`

### Secret Management
- **NUNCA hardcodear API keys en el código fuente**
- Usar variables de entorno `VITE_FIREBASE_*` para el frontend
- Firebase Admin SDK secrets solo en Cloud Functions (config o env vars)
- NO committear `.env` — está en `.gitignore`

## Pre-commit Security Checklist
- [ ] No hay secrets hardcodeados (API keys, tokens, passwords)
- [ ] Todo input de usuario validado (Zod schemas)
- [ ] XSS prevention (escapar HTML, no `dangerouslySetInnerHTML`)
- [ ] Errores no filtran datos sensibles
- [ ] Rate limiting en Cloud Functions expuestas
- [ ] RTDB rules protegen escrituras no autorizadas

## AgentShield
ECC provee AgentShield (`ecc-agentshield` npm) para auditoría automatizada.
Ejecutar periódicamente sobre las RTDB security rules.

## Respuesta a Incidentes
1. **STOP** — detener cualquier deploy
2. **Identificar alcance** — qué datos están expuestos
3. **Rotar secrets** — API keys, tokens comprometidos
4. **Fix** — corregir reglas/código
5. **Verificar** — revisar todo el codebase por patrones similares

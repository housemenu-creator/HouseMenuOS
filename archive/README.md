# Archive — Apps archivadas

Estas apps se movieron acá para simplificar el monorepo. No están en el pipeline de Docker, nginx, ni npm workspaces.

| App | Fecha | Motivo |
|-----|-------|--------|
| `househub` | 2026-06-13 | Admin redundante — todo está en `house-menu` |
| `26play` | 2026-06-13 | Juego — fuera del core del negocio |
| `piramid-game` | 2026-06-13 | Juego — fuera del core del negocio |
| `sorteos-automaticos` | 2026-06-13 | Sorteos — fuera del core del negocio |
| `house-cleaning` | 2026-06-13 | Limpieza — fuera del core del negocio |
| `house-laundry` | 2026-06-13 | Lavandería — fuera del core del negocio |
| `worker-portal` | 2026-06-13 | No conectado a infraestructura; `portal-hub` es el empleado activo |

### Para restaurar una app

```bash
mv archive/apps/<app-name> apps/<app-name>
```

Y agregarla de vuelta al `workspaces` o Dockerfile correspondiente.

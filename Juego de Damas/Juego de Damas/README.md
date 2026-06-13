# Juego de Damas

Aplicacion web de Damas con:

- `TanStack Start + React` para frontend
- `Hono` para backend principal y microservicio de IA
- `Bun` como runtime y gestor de scripts
- `MongoDB` como persistencia
- `Clerk` para autenticacion
- `Stripe` para compras del marketplace
- `A*` para la toma de decisiones del oponente

## Estructura

- `apps/web`: lobby, tablero, ranking y marketplace
- `services/api`: auth, partidas, ranking, pagos y persistencia
- `services/ai`: microservicio de IA con A*
- `packages/shared-types`: contratos compartidos y motor de reglas
- `docs`: guias reproducibles

## Inicio rapido

1. Crear `.env` a partir de `.env.example`
2. Instalar dependencias con `bun install`
3. Levantar Mongo con `docker compose up -d mongo`
4. Ejecutar `bun run dev`

## Flujo principal

- Crear o continuar una partida desde el lobby
- Jugar como `red` en un tablero `8x8`
- El backend valida reglas oficiales del proyecto: capturas obligatorias, cadenas de captura y coronacion
- El microservicio de IA calcula la respuesta con busqueda A* a profundidad 3
- Las partidas se guardan en MongoDB y alimentan el ranking global
- El marketplace permite desbloquear y equipar skins con Stripe sandbox

## Documentacion

La guia de arquitectura y de integracion de Clerk + Stripe esta en [docs/guia-clerk-stripe-arquitectura.md](./docs/guia-clerk-stripe-arquitectura.md).

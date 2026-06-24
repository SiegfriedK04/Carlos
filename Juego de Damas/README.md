# Juego de Damas

Aplicacion web individual de damas con `TanStack Start`, `Bun`, `Hono`, `MongoDB`, `Docker Compose`, `Stripe` y un microservicio de IA separado.

## Variante elegida

Se implemento la variante **Inglesas / Americanas 8x8**:

- tablero de `8x8`
- movimiento diagonal
- capturas obligatorias
- capturas multiples
- coronacion al llegar a la ultima fila
- si una ficha normal corona durante una cadena de captura, el turno termina en ese punto

## Arquitectura

- `apps/web`: cliente TanStack Start con lobby, tablero, ranking, perfil, marketplace y doble login
- `services/api`: API principal en Hono para auth, partidas, ranking, persistencia y pagos
- `services/ai`: microservicio Bun + Hono con el algoritmo **A\*** obligatorio
- `packages/shared-types`: contratos compartidos, reglas del juego y utilidades del motor

### Flujo de IA

1. El frontend envia la jugada del jugador al backend.
2. El backend valida y persiste el movimiento.
3. El backend llama al microservicio `POST /ai/move`.
4. El microservicio explora el grafo de estados con **A\*** y devuelve `recommendedMove`.
5. El backend aplica esa respuesta, actualiza la partida y recalcula el ranking.

El payload del microservicio incluye el `boardState`, el `currentPlayer` y un `searchBudget` opcional.

## Login

Ahora existen dos caminos:

- `Login alterno local`: registro e inicio de sesion por `email + contrasena`
- `Clerk`: se mantiene como alternativa opcional si configuras sus llaves

El login local:

- guarda usuarios en MongoDB
- almacena la contrasena con hash usando `Bun.password.hash`
- valida el acceso con `Bun.password.verify`
- crea una sesion propia del API mediante token opaco

Regla de contrasena local:

- minimo 8 caracteres
- al menos una mayuscula
- al menos una minuscula
- al menos un numero
- al menos un simbolo

## Ranking

El ranking persiste en MongoDB y se calcula a partir de las partidas ganadas:

- gana quien cierre la partida
- mejor posicion por menor cantidad de movimientos del jugador
- desempate por fecha del logro

## Pago en linea

El marketplace usa Stripe en modo sandbox para comprar skins cosmeticos y equiparlos en la cuenta del jugador.

## Como correr

1. Crea `.env` a partir de `.env.example`.
2. Instala dependencias con `bun install`.
3. Levanta MongoDB con `docker compose up -d mongo`.
4. Ejecuta `bun run dev`.

Tambien puedes levantar todo con:

```bash
docker compose up --build
```

## Variables importantes

- `MONGODB_URI`
- `DB_NAME`
- `AI_SERVICE_URL`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CLERK_SECRET_KEY` y `CLERK_PUBLISHABLE_KEY` solo si quieres habilitar Clerk
- `VITE_CLERK_PUBLISHABLE_KEY` para exponer Clerk al frontend

## Tests

### Unitarios

```bash
bun run test:unit
```

Incluyen pruebas del motor de reglas y de la seleccion de jugadas con `A*`.

### End-to-end con Playwright

```bash
bun run test:e2e
```

Playwright esta configurado como una capa e2e liviana:

- usa `tests/e2e`
- levanta solo el frontend en `http://127.0.0.1:4173`
- mockea las APIs con `page.route(...)`
- evita depender de MongoDB, Clerk o el microservicio real durante las pruebas visuales

## Docker Compose

El archivo [docker-compose.yml](/C:/Users/gabri/OneDrive/Escritorio/Carlos/Juego%20de%20Damas/docker-compose.yml) levanta:

- `mongo`
- `api`
- `ai`
- `web`

## Limitaciones conocidas

- Playwright quedo configurado y los specs fueron creados, pero en este workspace Vite falla al arrancar desde la ruta actual de OneDrive por un error de permisos del entorno (`Access is denied` al resolver `vite.config.ts`). Si mueves el repo a una ruta local sin esa restriccion, el setup e2e queda listo para ejecutarse.
- La calidad de la jugada de la IA depende del presupuesto de exploracion (`searchBudget`) para mantener tiempos razonables del microservicio, pero la estrategia usada sigue siendo **A\*** sobre el grafo de estados.

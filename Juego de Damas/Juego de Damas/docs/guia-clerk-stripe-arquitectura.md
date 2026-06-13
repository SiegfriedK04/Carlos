# Guia reproducible de Clerk, Stripe, estilo visual y arquitectura

## Vision general

Esta base separa el sistema en tres piezas:

- `apps/web`: interfaz, rutas, tema, Clerk y Stripe en cliente
- `services/api`: autenticacion, usuarios, partidas, pagos, marketplace y puente al servicio de IA
- `services/ai`: microservicio que analiza el tablero y devuelve el mejor movimiento

La idea clave es que `Clerk` y `Stripe` no se integran solo para "que funcionen", sino para que queden reutilizables y alineados visualmente con cualquier aplicacion futura.

## Regla de damas aplicada en este proyecto

Para mantener consistencia con el modelo ya sembrado en la base, el proyecto implementa una variante `8x8` documentada de forma explicita:

- el jugador humano usa fichas `red`
- la IA usa fichas `black`
- los peones avanzan una diagonal hacia adelante
- las capturas son obligatorias
- las capturas multiples se resuelven en una sola jugada
- los peones pueden capturar hacia atras
- la coronacion ocurre al llegar a la ultima fila
- cuando un peon se corona durante una cadena de captura, el turno termina
- las damas coronadas se mueven una casilla diagonal por turno en cualquiera de las cuatro direcciones

Esta variante queda reflejada en el motor compartido del paquete `@damas/shared-types` para que frontend, API e IA trabajen con exactamente las mismas reglas.

## Flujo de Clerk

### En frontend

1. Se monta `ClerkProvider` en la raiz de la app.
2. Las vistas usan `useAuth()` para consultar `isSignedIn`, `isLoaded` y `getToken()`.
3. El token se envia como `Authorization: Bearer ...` al backend principal.

### En backend

1. El backend recibe el bearer token.
2. Usa `@clerk/backend` para validar la sesion.
3. Obtiene el usuario de Clerk.
4. Lo sincroniza con un usuario interno en MongoDB.
5. Devuelve el perfil de la aplicacion.

### Por que esta capa extra

No conviene depender solo del usuario remoto de Clerk para toda la logica. La aplicacion necesita su propio usuario interno para guardar:

- partidas
- ranking
- compras
- skins desbloqueadas
- configuraciones propias del juego

## Flujo de Stripe

### Checkout

1. El usuario selecciona un item del marketplace.
2. El frontend llama al backend principal.
3. El backend crea un `PaymentIntent`.
4. Antes de eso, registra un pago `pending` en MongoDB.
5. Devuelve `clientSecret`, `paymentIntentId` y `publishableKey`.
6. El frontend monta `Payment Element`.
7. El cliente confirma el pago.

### Confirmacion fuerte

La fuente fuerte de verdad debe ser el `webhook` de Stripe:

1. Stripe envia el evento al backend.
2. El backend actualiza el pago a `paid`, `failed` o `canceled`.
3. Si el pago fue exitoso, desbloquea el skin para el usuario.

## Theming de Clerk y Stripe

La regla reproducible es simple:

- la app define tokens visuales
- Clerk consume esos tokens mediante `appearance`
- Stripe consume esos tokens mediante `appearance`

No se deben dispersar colores hardcodeados en componentes individuales. El flujo recomendado es:

1. definir tema `light` y `dark`
2. exponer un helper `getClerkPanelAppearance(theme)`
3. exponer un helper `getStripeAppearance(theme)`
4. persistir el tema en `localStorage`
5. reflejar el tema activo en `document.documentElement.dataset.theme`

## Arquitectura utilizada

### Backend principal

Responsabilidades:

- autenticar con Clerk
- sincronizar usuarios
- exponer endpoints de juego
- persistir partidas
- gestionar ranking
- crear pagos con Stripe
- recibir webhooks
- consultar el microservicio de IA

### Microservicio IA

Responsabilidades:

- recibir `BoardState`
- analizar el turno actual
- devolver el movimiento recomendado

La IA queda desacoplada. Eso permite iterar el algoritmo A* sin tocar auth, pagos o la API de usuarios.

## Que es reutilizable y que es especifico de Damas

### Reutilizable

- estructura de monorepo
- integracion de Clerk
- sincronizacion a usuario interno
- integracion de Stripe
- webhook y persistencia de pagos
- sistema de tema
- separacion frontend / api / ai

### Especifico de Damas

- `BoardState`
- ranking por menor cantidad de movimientos
- marketplace de skins de fichas
- algoritmo A*
- reglas del tablero y capturas

## Checklist para repetir esto en otra app

1. Crear monorepo con `apps`, `services`, `packages`, `docs`
2. Definir tipos compartidos del dominio nuevo
3. Montar `ClerkProvider` y middleware de Clerk
4. Crear `GET /api/auth/me`
5. Sincronizar usuario Clerk -> usuario interno
6. Montar sistema de tema global
7. Crear adaptadores de Clerk y Stripe al tema
8. Implementar flujo de checkout con `PaymentIntent`
9. Persistir pagos antes del checkout
10. Cerrar el ciclo con `webhook`
11. Separar la logica especializada en un microservicio

## Variables de entorno

### Base

```env
CLIENT_ORIGIN=http://localhost:3000
WEB_PORT=3000
API_PORT=3001
AI_PORT=3002
VITE_API_URL=http://localhost:3001
MONGODB_URI=mongodb://localhost:27017/juego-damas
DB_NAME=juego-damas
AI_SERVICE_URL=http://localhost:3002
```

### Clerk

```env
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_SIGN_IN_FORCE_REDIRECT_URL=http://localhost:3000/
CLERK_SIGN_UP_FORCE_REDIRECT_URL=http://localhost:3000/
```

### Stripe

```env
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CHECKERBOARD_SKIN_PRICE_ID=
```

## Orden recomendado de implementacion real

1. levantar frontend, api, ai y mongo
2. validar `GET /health`
3. integrar Clerk y probar `GET /api/auth/me`
4. crear usuario interno
5. sembrar marketplace
6. crear checkout de ejemplo
7. conectar webhook
8. implementar tablero y persistencia
9. validar A* real, ranking y marketplace equipado

## Validacion local recomendada

1. crear `.env` desde `.env.example`
2. ejecutar `bun install`
3. levantar `docker compose up -d mongo`
4. levantar la app con `bun run dev`
5. confirmar `GET /health` en API e IA
6. iniciar sesion con Clerk
7. crear una partida y realizar varios movimientos validos
8. verificar que la partida persiste al recargar o reabrir sesion
9. completar un pago de prueba con Stripe sandbox
10. reenviar o recibir el webhook para marcar la compra y reflejar el skin

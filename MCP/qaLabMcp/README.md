# qaLabMcp

Servidor MCP local en Python para exponer tools a GitHub Copilot Chat en modo Agent dentro de Visual Studio Code.

## Requisitos

- Visual Studio Code
- Python instalado en Windows
- Extension de Python en VS Code
- GitHub Copilot Chat con sesion iniciada
- Carpeta `qaLabMcp` abierta en VS Code

## Estructura

El proyecto debe quedar con esta estructura:

```text
qaLabMcp/
  .vscode/
    mcp.json
  datos_prueba.json
  server.py
  README.md
```

## Instalacion

1. Verifica Python:

```powershell
python --version
```

2. Instala el SDK de MCP:

```powershell
python -m pip install "mcp[cli]"
```

3. Verifica que el servidor compile:

```powershell
python -m py_compile server.py
```

## Como ejecutarlo en VS Code

1. Abre la carpeta `qaLabMcp` en VS Code.
2. Confirma que exista el archivo `.vscode/mcp.json`.
3. Abre la paleta de comandos con `Ctrl+Shift+P`.
4. Ejecuta `MCP: List Servers`.
5. Selecciona `qaLabMcp`.
6. Elige `Start Server`.

Importante:

- No ejecutes `python server.py` en otra terminal.
- VS Code es quien debe iniciar el servidor usando transporte `stdio`.

## Tools disponibles

El servidor expone estas tools:

- `validar_cliente(cip, telefono, email)`
- `generar_caso_prueba(endpoint, metodo, escenario)`
- `calcular_percentil_simple(valores, percentil)`
- `clasificar_error_http(status_code)`
- `evaluar_sla(p95_ms, limite_ms)`
- `validar_respuesta_api(status_code, tiempo_ms, limite_ms, tiene_token)`
- `buscar_cliente(cip)`

## Pruebas desde Copilot Chat

Abre GitHub Copilot Chat, cambia a modo `Agent` y verifica que aparezcan las tools del servidor.

Luego prueba estos prompts:

### Parte 1: pruebas base

1. Validar cliente:

```text
Usa la tool validar_cliente con CIP 12345, telefono 6677-8899 y correo prueba@demo.com
```

2. Generar caso de prueba:

```text
Usa la tool generar_caso_prueba para POST /api/login con credenciales invalidas
```

3. Calcular percentil:

```text
Usa la tool calcular_percentil_simple para calcular el percentil 95 de [120,130,150,300,90,100,500,220]
```

## Retos practicos

Prueba tambien estas tools:

1. Clasificacion HTTP:

```text
Usa la tool clasificar_error_http con status_code 500
```

Resultado esperado: `Error del servidor`

2. Evaluacion SLA:

```text
Usa la tool evaluar_sla con p95_ms 480 y limite_ms 500
```

Resultado esperado: `cumple = true`

3. Validacion de respuesta API:

```text
Usa la tool validar_respuesta_api con status_code 200, tiempo_ms 350, limite_ms 500 y tiene_token true
```

Resultado esperado: `valido = true`

4. Busqueda en archivo JSON:

```text
Usa la tool buscar_cliente con cip 12345
```

Si el cliente existe, la tool devolvera sus datos. Si no existe, mostrara un mensaje de no encontrado.

## Archivos importantes

- [server.py]
- [datos_prueba.json]
- [.vscode/mcp.json]


from __future__ import annotations

import json
import math
import re
from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP


mcp = FastMCP("qaLabMcp", log_level="WARNING")
DATA_FILE = Path(__file__).with_name("datos_prueba.json")
EMAIL_REGEX = re.compile(r"^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$", re.IGNORECASE)


def _normalizar_cip(cip: str) -> str:
    return "".join(ch for ch in cip if ch.isdigit())


def _normalizar_telefono(telefono: str) -> str:
    digitos = "".join(ch for ch in telefono if ch.isdigit())
    if len(digitos) == 8:
        return f"{digitos[:4]}-{digitos[4:]}"
    return digitos


def _cargar_clientes() -> list[dict[str, Any]]:
    with DATA_FILE.open("r", encoding="utf-8") as handle:
        return json.load(handle)


@mcp.tool()
def validar_cliente(cip: str, telefono: str, email: str) -> dict[str, Any]:
    """Valida y normaliza el CIP, telefono y correo electronico de un cliente."""
    errores: list[str] = []
    cip_normalizado = _normalizar_cip(cip)
    telefono_normalizado = _normalizar_telefono(telefono)
    email_normalizado = email.strip().lower()

    if not cip_normalizado or len(cip_normalizado) < 5:
        errores.append("El CIP debe contener al menos 5 digitos.")

    if len(telefono_normalizado.replace("-", "")) != 8:
        errores.append("El telefono debe contener exactamente 8 digitos.")

    if not EMAIL_REGEX.match(email_normalizado):
        errores.append("El correo electronico no tiene un formato valido.")

    return {
        "valido": not errores,
        "datos_normalizados": {
            "cip": cip_normalizado,
            "telefono": telefono_normalizado,
            "email": email_normalizado,
        },
        "errores": errores,
    }


@mcp.tool()
def generar_caso_prueba(endpoint: str, metodo: str, escenario: str) -> dict[str, Any]:
    """Genera un caso de prueba funcional para un endpoint HTTP."""
    metodo_normalizado = metodo.strip().upper()
    titulo = f"{metodo_normalizado} {endpoint} - {escenario.strip()}"

    return {
        "titulo": titulo,
        "objetivo": f"Validar el comportamiento de {endpoint} cuando ocurre el escenario: {escenario}.",
        "precondiciones": [
            "La API debe estar desplegada y accesible.",
            "El ambiente de pruebas debe tener datos controlados para el escenario.",
        ],
        "pasos": [
            f"Preparar la solicitud {metodo_normalizado} hacia {endpoint}.",
            f"Configurar el escenario de prueba: {escenario}.",
            "Enviar la solicitud a la API.",
            "Registrar codigo de estado, cuerpo y tiempo de respuesta.",
        ],
        "datos_prueba": {
            "endpoint": endpoint,
            "metodo": metodo_normalizado,
            "escenario": escenario,
        },
        "resultado_esperado": [
            "La API responde con un codigo consistente con el escenario probado.",
            "El mensaje de error o exito es claro y utilizable por el cliente.",
            "No se exponen datos sensibles en la respuesta.",
        ],
    }


@mcp.tool()
def calcular_percentil_simple(valores: list[float], percentil: float) -> dict[str, Any]:
    """Calcula un percentil simple usando el metodo nearest-rank."""
    if not valores:
        raise ValueError("La lista de valores no puede estar vacia.")
    if not 0 <= percentil <= 100:
        raise ValueError("El percentil debe estar entre 0 y 100.")

    valores_ordenados = sorted(valores)
    if percentil == 0:
        indice = 0
    else:
        indice = math.ceil((percentil / 100) * len(valores_ordenados)) - 1
    indice = max(0, min(indice, len(valores_ordenados) - 1))

    return {
        "metodo": "nearest-rank",
        "valores_ordenados": valores_ordenados,
        "percentil": percentil,
        "indice": indice,
        "resultado": valores_ordenados[indice],
    }


@mcp.tool()
def clasificar_error_http(status_code: int) -> dict[str, Any]:
    """Clasifica un codigo HTTP en categorias de respuesta."""
    if 200 <= status_code <= 299:
        clasificacion = "Exito"
    elif 300 <= status_code <= 399:
        clasificacion = "Redireccion"
    elif 400 <= status_code <= 499:
        clasificacion = "Error del cliente"
    elif 500 <= status_code <= 599:
        clasificacion = "Error del servidor"
    else:
        clasificacion = "Codigo fuera de rango HTTP comun"

    return {"status_code": status_code, "clasificacion": clasificacion}


@mcp.tool()
def evaluar_sla(p95_ms: float, limite_ms: float) -> dict[str, Any]:
    """Evalua si un p95 cumple el SLA definido."""
    cumple = p95_ms <= limite_ms
    return {
        "cumple": cumple,
        "p95_ms": p95_ms,
        "limite_ms": limite_ms,
        "diferencia_ms": limite_ms - p95_ms,
    }


@mcp.tool()
def validar_respuesta_api(
    status_code: int, tiempo_ms: float, limite_ms: float, tiene_token: bool
) -> dict[str, Any]:
    """Valida una respuesta API por codigo 2xx, tiempo dentro del limite y presencia de token."""
    es_2xx = 200 <= status_code <= 299
    cumple_tiempo = tiempo_ms <= limite_ms
    valido = es_2xx and cumple_tiempo and tiene_token

    return {
        "valido": valido,
        "detalle": {
            "status_2xx": es_2xx,
            "cumple_tiempo": cumple_tiempo,
            "tiene_token": tiene_token,
        },
        "entrada": {
            "status_code": status_code,
            "tiempo_ms": tiempo_ms,
            "limite_ms": limite_ms,
        },
    }


@mcp.tool()
def buscar_cliente(cip: str) -> dict[str, Any]:
    """Busca un cliente por CIP en el archivo local datos_prueba.json."""
    cip_buscado = _normalizar_cip(cip)

    for cliente in _cargar_clientes():
        if _normalizar_cip(str(cliente.get("cip", ""))) == cip_buscado:
            return {
                "encontrado": True,
                "cliente": cliente,
            }

    return {
        "encontrado": False,
        "mensaje": f"No se encontro un cliente con el CIP {cip_buscado}.",
    }


if __name__ == "__main__":
    mcp.run(transport="stdio")

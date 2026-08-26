import math
import re
from datetime import date, datetime, time, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Query

from app.database import radicados_collection
from app.routers.configuracion import (
    obtener_dias_entrega_proxima,
)


router = APIRouter(
    prefix="/api/radicados",
    tags=["Radicados"],
)


TODAS_LAS_REFERENCIAS = "__todas__"

CAMPOS_ORDENAMIENTO = {
    "fecha_ingreso": "Fecha ingreso",
    "fecha_limite": "Fecha limite",
    "fecha_entrega": "Fecha entrega final",
    "cliente": "Cliente",
    "referencia": "Referencia",
    "tipo": "Tipo",
    "cantidad": "Cantidad",
    "orden_compra": "Orden de compra",
    "talla": "Talla",
}

ESTADOS_FILTRO = {
    "en_proceso": "En proceso",
    "entrega_proxima": "Entrega próxima",
    "entregado": "Entregado",
    "entregado_a_tiempo": "Entregado a tiempo",
    "entregado_tarde": "Entregado tarde",
    "entregado_sin_fecha": "Entregado sin fecha",
    "vencido_sin_entregar": "Vencido sin entregar",
}


def expresion_texto_normalizado(campo: str) -> dict:
    return {
        "$toUpper": {
            "$trim": {
                "input": {
                    "$convert": {
                        "input": f"${campo}",
                        "to": "string",
                        "onError": "",
                        "onNull": "",
                    }
                }
            }
        }
    }


def expresion_igualdad(
    campo: str,
    valor: str,
) -> dict:
    return {
        "$eq": [
            expresion_texto_normalizado(campo),
            valor.strip().upper(),
        ]
    }


def organizar_opciones(
    valores: list,
) -> list[str]:
    opciones = {
        str(valor).strip()
        for valor in valores
        if valor is not None
        and str(valor).strip()
    }

    def clave_ordenamiento(valor: str):
        return [
            (
                int(parte)
                if parte.isdigit()
                else parte.casefold()
            )
            for parte in re.split(
                r"(\d+)",
                valor,
            )
        ]

    return sorted(
        opciones,
        key=clave_ordenamiento,
    )


def convertir_numero(valor) -> float:
    try:
        return float(valor or 0)
    except (TypeError, ValueError):
        return 0


def obtener_fecha(valor) -> date | None:
    if isinstance(valor, datetime):
        return valor.date()

    if isinstance(valor, date):
        return valor

    return None


def calcular_estado(
    documento: dict,
    dias_entrega_proxima: int,
) -> str:
    cantidad = convertir_numero(
        documento.get("Cantidad")
    )

    unidades_despachadas = convertir_numero(
        documento.get(
            "Unidades despachadas"
        )
    )

    fecha_limite = obtener_fecha(
        documento.get("Fecha limite")
    )

    fecha_entrega = obtener_fecha(
        documento.get(
            "Fecha entrega final"
        )
    )

    entregado = (
        cantidad > 0
        and unidades_despachadas >= cantidad
    )

    if entregado:
        if fecha_limite is None:
            return "Entregado"

        if fecha_entrega is None:
            return "Entregado sin fecha"

        if fecha_entrega <= fecha_limite:
            return "Entregado a tiempo"

        return "Entregado tarde"

    if fecha_limite is None:
        return "En proceso"

    fecha_actual = datetime.now(
        ZoneInfo("America/Bogota")
    ).date()

    dias_restantes = (
        fecha_limite - fecha_actual
    ).days

    if dias_restantes < 0:
        return "Vencido sin entregar"

    if (
        dias_restantes
        <= dias_entrega_proxima
    ):
        return "Entrega próxima"

    return "En proceso"


def serializar_documento(
    documento: dict,
    dias_entrega_proxima: int,
) -> dict:
    documento["_id"] = str(
        documento["_id"]
    )

    documento["Estado"] = calcular_estado(
        documento,
        dias_entrega_proxima,
    )

    cantidad = convertir_numero(
        documento.get("Cantidad")
    )

    unidades_despachadas = convertir_numero(
        documento.get(
            "Unidades despachadas"
        )
    )

    unidades_pendientes = max(
        cantidad - unidades_despachadas,
        0,
    )

    if unidades_pendientes.is_integer():
        unidades_pendientes = int(
            unidades_pendientes
        )

    documento["Unidades pendientes"] = (
        unidades_pendientes
    )

    return documento


@router.get("/opciones-filtros")
def consultar_opciones_filtros(
    referencia: str | None = None,
    talla: str | None = None,
):
    filtros_referencia: dict = {}
    filtros_tipo: dict = {}

    referencia_es_todas = (
        referencia == TODAS_LAS_REFERENCIAS
    )

    if (
        referencia
        and not referencia_es_todas
    ):
        condicion_referencia = (
            expresion_igualdad(
                "Referencia",
                referencia,
            )
        )

        filtros_referencia["$expr"] = (
            condicion_referencia
        )

        filtros_tipo["$expr"] = (
            condicion_referencia
        )

    tallas = []

    if (
        referencia
        and not referencia_es_todas
    ):
        tallas = (
            radicados_collection.distinct(
                "Talla",
                filtros_referencia,
            )
        )

    if (
        talla
        and referencia
        and not referencia_es_todas
    ):
        filtros_tipo["$expr"] = {
            "$and": [
                expresion_igualdad(
                    "Referencia",
                    referencia,
                ),
                expresion_igualdad(
                    "Talla",
                    talla,
                ),
            ]
        }

    tipos = []

    if referencia:
        tipos = (
            radicados_collection.distinct(
                "Tipo",
                filtros_tipo,
            )
        )

    return {
        "clientes": organizar_opciones(
            radicados_collection.distinct(
                "Cliente"
            )
        ),
        "referencias": organizar_opciones(
            radicados_collection.distinct(
                "Referencia"
            )
        ),
        "hojas": organizar_opciones(
            radicados_collection.distinct(
                "_metadatos.hoja_origen"
            )
        ),
        "tallas": organizar_opciones(
            tallas
        ),
        "tipos": organizar_opciones(
            tipos
        ),
    }


@router.get("")
def consultar_radicados(
    pagina: int = Query(
        default=1,
        ge=1,
    ),
    limite: int = Query(
        default=20,
        ge=1,
        le=200,
    ),
    cliente: str | None = None,
    referencia: str | None = None,
    talla: str | None = None,
    tipo: str | None = None,
    orden_compra: str | None = None,
    hoja_origen: str | None = None,
    fecha_inicial: date | None = None,
    fecha_final: date | None = None,
    estado: Literal[
        "en_proceso",
        "entrega_proxima",
        "entregado",
        "entregado_a_tiempo",
        "entregado_tarde",
        "entregado_sin_fecha",
        "vencido_sin_entregar",
    ] | None = None,
    ordenar_por: Literal[
        "fecha_ingreso",
        "fecha_limite",
        "fecha_entrega",
        "cliente",
        "referencia",
        "tipo",
        "cantidad",
        "orden_compra",
        "talla",
    ] = "fecha_ingreso",
    direccion: Literal[
        "asc",
        "desc",
    ] = "desc",
):
    filtros: dict = {}
    expresiones: list[dict] = []

    if cliente:
        filtros["Cliente"] = {
            "$regex": re.escape(
                cliente.strip()
            ),
            "$options": "i",
        }

    if (
        referencia
        and referencia
        != TODAS_LAS_REFERENCIAS
    ):
        expresiones.append(
            expresion_igualdad(
                "Referencia",
                referencia,
            )
        )

    if talla:
        expresiones.append(
            expresion_igualdad(
                "Talla",
                talla,
            )
        )

    if tipo:
        expresiones.append(
            expresion_igualdad(
                "Tipo",
                tipo,
            )
        )

    if orden_compra:
        expresiones.append(
            expresion_igualdad(
                "Orden de compra",
                orden_compra,
            )
        )

    if hoja_origen:
        filtros["_metadatos.hoja_origen"] = {
            "$regex": (
                f"^{re.escape(hoja_origen.strip())}$"
            ),
            "$options": "i",
        }

    if fecha_inicial or fecha_final:
        filtro_fecha: dict = {}

        if fecha_inicial:
            filtro_fecha["$gte"] = (
                datetime.combine(
                    fecha_inicial,
                    time.min,
                )
            )

        if fecha_final:
            filtro_fecha["$lt"] = (
                datetime.combine(
                    fecha_final
                    + timedelta(days=1),
                    time.min,
                )
            )

        filtros["Fecha ingreso"] = (
            filtro_fecha
        )

    if expresiones:
        filtros["$expr"] = (
            expresiones[0]
            if len(expresiones) == 1
            else {
                "$and": expresiones
            }
        )

    campo_ordenamiento = (
        CAMPOS_ORDENAMIENTO[
            ordenar_por
        ]
    )

    sentido_ordenamiento = (
        1
        if direccion == "asc"
        else -1
    )

    ordenamiento = [
        (
            campo_ordenamiento,
            sentido_ordenamiento,
        ),
        (
            "_id",
            sentido_ordenamiento,
        ),
    ]

    dias_entrega_proxima = (
        obtener_dias_entrega_proxima()
    )

    registros_a_omitir = (
        pagina - 1
    ) * limite

    if estado:
        cursor = (
            radicados_collection
            .find(filtros)
            .sort(ordenamiento)
        )

        estado_buscado = (
            ESTADOS_FILTRO[estado]
        )

        registros_filtrados = [
            registro
            for registro in (
                serializar_documento(
                    documento,
                    dias_entrega_proxima,
                )
                for documento in cursor
            )
            if registro["Estado"]
            == estado_buscado
        ]

        total_registros = len(
            registros_filtrados
        )

        registros = (
            registros_filtrados[
                registros_a_omitir:
                registros_a_omitir
                + limite
            ]
        )
    else:
        total_registros = (
            radicados_collection
            .count_documents(filtros)
        )

        cursor = (
            radicados_collection
            .find(filtros)
            .sort(ordenamiento)
            .skip(registros_a_omitir)
            .limit(limite)
        )

        registros = [
            serializar_documento(
                documento,
                dias_entrega_proxima,
            )
            for documento in cursor
        ]

    total_paginas = (
        math.ceil(
            total_registros / limite
        )
        if total_registros
        else 0
    )

    return {
        "pagina": pagina,
        "limite": limite,
        "total_registros": (
            total_registros
        ),
        "total_paginas": (
            total_paginas
        ),
        "dias_entrega_proxima": (
            dias_entrega_proxima
        ),
        "ordenamiento": {
            "campo": ordenar_por,
            "direccion": direccion,
        },
        "filtros": {
            "cliente": cliente,
            "referencia": referencia,
            "talla": talla,
            "tipo": tipo,
            "orden_compra": (
                orden_compra
            ),
            "hoja_origen": hoja_origen,
            "fecha_inicial": (
                fecha_inicial
            ),
            "fecha_final": fecha_final,
            "estado": estado,
        },
        "registros": registros,
    }
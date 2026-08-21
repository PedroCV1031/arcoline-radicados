import math
import re
from datetime import date, datetime, time, timedelta
from typing import Literal

from fastapi import APIRouter, Query

from app.database import radicados_collection


router = APIRouter(
    prefix="/api/radicados",
    tags=["Radicados"],
)


CAMPOS_ORDENAMIENTO = {
    "fecha_inicio": "Fecha inicio",
    "cliente": "Cliente",
    "referencia": "Referencia",
    "cantidad": "Cantidad",
    "orden_compra": "Orden de compra",
    "talla": "Talla",
}


def serializar_documento(documento: dict) -> dict:
    documento["_id"] = str(documento["_id"])
    return documento


def organizar_opciones(valores: list) -> list[str]:
    opciones = {
        str(valor).strip()
        for valor in valores
        if valor is not None and str(valor).strip()
    }

    return sorted(opciones, key=str.casefold)


@router.get("/opciones-filtros")
def consultar_opciones_filtros():
    return {
        "clientes": organizar_opciones(
            radicados_collection.distinct("Cliente")
        ),
        "referencias": organizar_opciones(
            radicados_collection.distinct("Referencia")
        ),
        "hojas": organizar_opciones(
            radicados_collection.distinct(
                "_metadatos.hoja_origen"
            )
        ),
        "tallas": organizar_opciones(
            radicados_collection.distinct("Talla")
        ),
    }


@router.get("")
def consultar_radicados(
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=20, ge=1, le=200),
    cliente: str | None = None,
    referencia: str | None = None,
    orden_compra: str | None = None,
    hoja_origen: str | None = None,
    talla: str | None = None,
    fecha_inicial: date | None = None,
    fecha_final: date | None = None,
    ordenar_por: Literal[
        "fecha_inicio",
        "cliente",
        "referencia",
        "cantidad",
        "orden_compra",
        "talla",
    ] = "fecha_inicio",
    direccion: Literal["asc", "desc"] = "desc",
):
    filtros: dict = {}
    expresiones: list[dict] = []

    if cliente:
        filtros["Cliente"] = {
            "$regex": re.escape(cliente.strip()),
            "$options": "i",
        }

    if referencia:
        expresiones.append(
            {
                "$eq": [
                    {
                        "$toUpper": {
                            "$toString": "$Referencia",
                        }
                    },
                    referencia.strip().upper(),
                ]
            }
        )

    if orden_compra:
        expresiones.append(
            {
                "$eq": [
                    {
                        "$toUpper": {
                            "$toString": "$Orden de compra",
                        }
                    },
                    orden_compra.strip().upper(),
                ]
            }
        )

    if talla:
        expresiones.append(
            {
                "$eq": [
                    {
                        "$toUpper": {
                            "$toString": "$Talla",
                        }
                    },
                    talla.strip().upper(),
                ]
            }
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
            filtro_fecha["$gte"] = datetime.combine(
                fecha_inicial,
                time.min,
            )

        if fecha_final:
            filtro_fecha["$lt"] = datetime.combine(
                fecha_final + timedelta(days=1),
                time.min,
            )

        filtros["Fecha inicio"] = filtro_fecha

    if expresiones:
        filtros["$expr"] = (
            expresiones[0]
            if len(expresiones) == 1
            else {"$and": expresiones}
        )

    campo_ordenamiento = CAMPOS_ORDENAMIENTO[ordenar_por]
    sentido_ordenamiento = 1 if direccion == "asc" else -1

    total_registros = radicados_collection.count_documents(
        filtros
    )

    registros_a_omitir = (pagina - 1) * limite

    cursor = (
        radicados_collection
        .find(filtros)
        .sort(
            [
                (
                    campo_ordenamiento,
                    sentido_ordenamiento,
                ),
                (
                    "_id",
                    sentido_ordenamiento,
                ),
            ]
        )
        .skip(registros_a_omitir)
        .limit(limite)
    )

    registros = [
        serializar_documento(documento)
        for documento in cursor
    ]

    total_paginas = (
        math.ceil(total_registros / limite)
        if total_registros
        else 0
    )

    return {
        "pagina": pagina,
        "limite": limite,
        "total_registros": total_registros,
        "total_paginas": total_paginas,
        "ordenamiento": {
            "campo": ordenar_por,
            "direccion": direccion,
        },
        "filtros": {
            "cliente": cliente,
            "referencia": referencia,
            "orden_compra": orden_compra,
            "hoja_origen": hoja_origen,
            "talla": talla,
            "fecha_inicial": fecha_inicial,
            "fecha_final": fecha_final,
        },
        "registros": registros,
    }
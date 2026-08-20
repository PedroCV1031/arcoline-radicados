import math
import re
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Query

from app.database import radicados_collection

router = APIRouter(
    prefix="/api/radicados",
    tags=["Radicados"]
)


def serializar_documento(documento: dict) -> dict:
    documento["_id"] = str(documento["_id"])
    return documento


@router.get("")
def consultar_radicados(
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=50, ge=1, le=200),
    cliente: str | None = None,
    referencia: str | None = None,
    fecha_inicial: date | None = None,
    fecha_final: date | None = None
):
    filtros = {}

    if cliente:
        filtros["Cliente"] = {
            "$regex": re.escape(cliente.strip()),
            "$options": "i"
        }

    if referencia:
        filtros["$expr"] = {
            "$eq": [
                {
                    "$toUpper": {
                        "$toString": "$Referencia"
                    }
                },
                referencia.strip().upper()
            ]
        }

    if fecha_inicial or fecha_final:
        filtro_fecha = {}

        if fecha_inicial:
            filtro_fecha["$gte"] = datetime.combine(
                fecha_inicial,
                time.min
            )

        if fecha_final:
            filtro_fecha["$lt"] = datetime.combine(
                fecha_final + timedelta(days=1),
                time.min
            )

        filtros["Fecha inicio"] = filtro_fecha

    total_registros = radicados_collection.count_documents(filtros)
    registros_a_omitir = (pagina - 1) * limite

    cursor = (
        radicados_collection
        .find(filtros)
        .sort("Fecha inicio", -1)
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
        "registros": registros
    }
import re
from collections import defaultdict
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, HTTPException

from app.database import radicados_collection

router = APIRouter(
    prefix="/api/ventas",
    tags=["Ventas"]
)


def expresion_referencia_normalizada():
    return {
        "$toUpper": {
            "$trim": {
                "input": {
                    "$convert": {
                        "input": "$Referencia",
                        "to": "string",
                        "onError": "SIN REFERENCIA",
                        "onNull": "SIN REFERENCIA"
                    }
                }
            }
        }
    }


def normalizar_numero(valor):
    if isinstance(valor, float) and valor.is_integer():
        return int(valor)

    return valor


@router.get("/semanales")
def consultar_ventas_semanales(
    fecha_inicial: date | None = None,
    fecha_final: date | None = None,
    cliente: str | None = None,
    referencia: str | None = None
):
    if (
        fecha_inicial
        and fecha_final
        and fecha_final < fecha_inicial
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "La fecha final no puede ser anterior "
                "a la fecha inicial"
            )
        )

    filtro_fecha = {
        "$type": "date"
    }

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

    filtros = {
        "Fecha inicio": filtro_fecha
    }

    if cliente:
        filtros["Cliente"] = {
            "$regex": re.escape(cliente.strip()),
            "$options": "i"
        }

    if referencia:
        filtros["$expr"] = {
            "$eq": [
                expresion_referencia_normalizada(),
                referencia.strip().upper()
            ]
        }

    pipeline = [
        {
            "$match": filtros
        },
        {
            "$set": {
                "referencia_normalizada": (
                    expresion_referencia_normalizada()
                ),
                "cantidad_numerica": {
                    "$convert": {
                        "input": "$Cantidad",
                        "to": "double",
                        "onError": 0,
                        "onNull": 0
                    }
                }
            }
        },
        {
            "$set": {
                "inicio_semana": {
                    "$dateTrunc": {
                        "date": "$Fecha inicio",
                        "unit": "week",
                        "startOfWeek": "monday",
                        "timezone": "UTC"
                    }
                }
            }
        },
        {
            "$group": {
                "_id": {
                    "semana": "$inicio_semana",
                    "referencia": "$referencia_normalizada"
                },
                "unidades": {
                    "$sum": "$cantidad_numerica"
                }
            }
        },
        {
            "$sort": {
                "_id.semana": 1,
                "_id.referencia": 1
            }
        }
    ]

    resultado = list(
        radicados_collection.aggregate(pipeline)
    )

    datos = []
    totales_referencia = defaultdict(float)
    semanas = set()
    total_unidades = 0

    for registro in resultado:
        semana = registro["_id"]["semana"]
        referencia_actual = registro["_id"]["referencia"]
        unidades = normalizar_numero(registro["unidades"])

        semana_texto = semana.date().isoformat()

        datos.append({
            "semana": semana_texto,
            "referencia": referencia_actual,
            "unidades": unidades
        })

        semanas.add(semana_texto)
        totales_referencia[referencia_actual] += unidades
        total_unidades += unidades

    resumen_referencias = [
        {
            "referencia": referencia_actual,
            "unidades": normalizar_numero(unidades)
        }
        for referencia_actual, unidades
        in sorted(
            totales_referencia.items(),
            key=lambda elemento: elemento[1],
            reverse=True
        )
    ]

    return {
        "filtros": {
            "fecha_inicial": fecha_inicial,
            "fecha_final": fecha_final,
            "cliente": cliente,
            "referencia": referencia
        },
        "total_unidades": normalizar_numero(total_unidades),
        "total_semanas": len(semanas),
        "total_referencias": len(totales_referencia),
        "referencias": resumen_referencias,
        "datos": datos
    }
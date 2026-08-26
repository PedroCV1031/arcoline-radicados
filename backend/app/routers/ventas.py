import re
from collections import defaultdict
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, HTTPException

from app.database import radicados_collection


router = APIRouter(
    prefix="/api/ventas",
    tags=["Ventas"],
)


TODAS_LAS_REFERENCIAS = "__todas__"


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


def expresion_igualdad(campo: str, valor: str) -> dict:
    return {
        "$eq": [
            expresion_texto_normalizado(campo),
            valor.strip().upper(),
        ]
    }


def normalizar_numero(valor):
    if isinstance(valor, float) and valor.is_integer():
        return int(valor)

    return valor


def obtener_lunes(fecha: date) -> date:
    return fecha - timedelta(days=fecha.weekday())


def generar_semanas(
    fecha_inicial: date | None,
    fecha_final: date | None,
    semanas_con_datos: set[str],
) -> list[str]:
    fechas_con_datos = sorted(
        date.fromisoformat(semana)
        for semana in semanas_con_datos
    )

    if fecha_inicial:
        primera_semana = obtener_lunes(fecha_inicial)
    elif fechas_con_datos:
        primera_semana = fechas_con_datos[0]
    else:
        return []

    if fecha_final:
        ultima_semana = obtener_lunes(fecha_final)
    elif fechas_con_datos:
        ultima_semana = fechas_con_datos[-1]
    else:
        return []

    if ultima_semana < primera_semana:
        return []

    semanas = []
    semana_actual = primera_semana

    while semana_actual <= ultima_semana:
        semanas.append(semana_actual.isoformat())
        semana_actual += timedelta(days=7)

    return semanas


@router.get("/semanales")
def consultar_ventas_semanales(
    fecha_inicial: date | None = None,
    fecha_final: date | None = None,
    cliente: str | None = None,
    referencia: str | None = None,
    talla: str | None = None,
    tipo: str | None = None,
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
            ),
        )

    referencia_es_todas = (
        referencia == TODAS_LAS_REFERENCIAS
    )

    if talla and (
        not referencia
        or referencia_es_todas
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Para filtrar por talla debe seleccionar "
                "una referencia específica"
            ),
        )

    if tipo and not referencia:
        raise HTTPException(
            status_code=400,
            detail=(
                "Para filtrar por tipo debe seleccionar "
                "una referencia o todas las referencias"
            ),
        )

    filtro_fecha: dict = {
        "$type": "date",
    }

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

    filtros: dict = {
        "Fecha ingreso": filtro_fecha,
    }

    expresiones: list[dict] = []

    if cliente:
        filtros["Cliente"] = {
            "$regex": re.escape(cliente.strip()),
            "$options": "i",
        }

    if referencia and not referencia_es_todas:
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

    if expresiones:
        filtros["$expr"] = (
            expresiones[0]
            if len(expresiones) == 1
            else {"$and": expresiones}
        )

    pipeline = [
        {
            "$match": filtros,
        },
        {
            "$set": {
                "referencia_normalizada": (
                    expresion_texto_normalizado(
                        "Referencia"
                    )
                ),
                "cantidad_numerica": {
                    "$convert": {
                        "input": "$Cantidad",
                        "to": "double",
                        "onError": 0,
                        "onNull": 0,
                    }
                },
            }
        },
        {
            "$set": {
                "inicio_semana": {
                    "$dateTrunc": {
                        "date": "$Fecha ingreso",
                        "unit": "week",
                        "startOfWeek": "monday",
                        "timezone": "UTC",
                    }
                }
            }
        },
        {
            "$group": {
                "_id": {
                    "semana": "$inicio_semana",
                    "referencia": (
                        "$referencia_normalizada"
                    ),
                },
                "unidades": {
                    "$sum": "$cantidad_numerica",
                },
            }
        },
        {
            "$sort": {
                "_id.semana": 1,
                "_id.referencia": 1,
            }
        },
    ]

    resultado = list(
        radicados_collection.aggregate(pipeline)
    )

    datos = []
    totales_referencia = defaultdict(float)
    semanas_con_datos: set[str] = set()
    total_unidades = 0.0

    for registro in resultado:
        semana = registro["_id"]["semana"]
        referencia_actual = (
            registro["_id"]["referencia"]
        )

        unidades = normalizar_numero(
            registro["unidades"]
        )

        semana_texto = semana.date().isoformat()

        datos.append({
            "semana": semana_texto,
            "referencia": referencia_actual,
            "unidades": unidades,
        })

        semanas_con_datos.add(semana_texto)

        totales_referencia[
            referencia_actual
        ] += unidades

        total_unidades += unidades

    semanas = generar_semanas(
        fecha_inicial=fecha_inicial,
        fecha_final=fecha_final,
        semanas_con_datos=semanas_con_datos,
    )

    resumen_referencias = [
        {
            "referencia": referencia_actual,
            "unidades": normalizar_numero(unidades),
        }
        for referencia_actual, unidades in sorted(
            totales_referencia.items(),
            key=lambda elemento: elemento[1],
            reverse=True,
        )
    ]

    return {
        "filtros": {
            "fecha_inicial": fecha_inicial,
            "fecha_final": fecha_final,
            "cliente": cliente,
            "referencia": referencia,
            "talla": talla,
            "tipo": tipo,
        },
        "total_unidades": normalizar_numero(
            total_unidades
        ),
        "total_semanas": len(semanas),
        "total_referencias": len(
            totales_referencia
        ),
        "semanas": semanas,
        "referencias": resumen_referencias,
        "datos": datos,
    }
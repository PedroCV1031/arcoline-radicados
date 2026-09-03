import os

import certifi
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "arcoline_db")
MONGODB_COLLECTION = os.getenv("MONGODB_COLLECTION", "radicados")

if not MONGODB_URI:
    raise RuntimeError(
        "No se encontró MONGODB_URI en las variables de entorno"
    )

client = MongoClient(
    MONGODB_URI,
    tls=True,
    tlsCAFile=certifi.where(),
    serverSelectionTimeoutMS=10000,
)

database = client[MONGODB_DATABASE]
radicados_collection = database[MONGODB_COLLECTION]
configuracion_collection = database["configuracion"]


def asegurar_indices_radicados() -> None:
    radicados_collection.create_index(
        [("Area", 1)],
        name="idx_area",
    )

    radicados_collection.create_index(
        [("_metadatos.hoja_origen", 1)],
        name="idx_hoja_origen",
    )

    radicados_collection.create_index(
        [
            ("_metadatos.hoja_origen", 1),
            ("_clave_registro", 1),
        ],
        name="uq_hoja_clave_registro",
        unique=True,
        partialFilterExpression={
            "_clave_registro": {"$type": "string"},
        },
    )

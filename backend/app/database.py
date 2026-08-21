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
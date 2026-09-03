# Arcoline Radicados

Aplicación web interna para gestionar los radicados de producción de Arcoline. Permite importar y exportar información en Excel, consultar los registros almacenados en MongoDB Atlas, controlar el estado de las entregas y analizar la producción semanal por referencia, cliente o área.

## Aplicación desplegada

- Frontend: [arcoline-radicados.vercel.app](https://arcoline-radicados.vercel.app)
- Backend: [arcoline-radicados.onrender.com](https://arcoline-radicados.onrender.com)
- Documentación de la API: [arcoline-radicados.onrender.com/docs](https://arcoline-radicados.onrender.com/docs)

Todas las funciones de la plataforma requieren autenticación.

## Funcionalidades

### Autenticación

- Inicio y cierre de sesión.
- Sesiones firmadas mediante JWT.
- Almacenamiento del token en una cookie segura `HttpOnly`.
- Contraseña almacenada como hash Argon2.
- Protección de los endpoints de la aplicación.

### Importación y exportación de Excel

- Carga de archivos `.xlsx` y `.xlsm` de hasta 20 MB.
- Detección automática de las hojas que cumplen la estructura requerida.
- Selección de una o varias hojas válidas.
- Actualización selectiva: solo se insertan registros nuevos o se actualizan registros cuyo contenido cambió.
- Conservación de los registros sin cambios para reducir escrituras en MongoDB.
- Identidad interna calculada por la aplicación; el Excel no necesita una columna de identificador.
- Asignación progresiva de claves internas a registros antiguos cuando vuelven a ser analizados.
- Detección y rechazo de filas duplicadas dentro del Excel y de coincidencias ambiguas causadas por duplicados ya existentes en MongoDB.
- Validación individual de las filas antes de insertarlas.
- Rechazo de filas incompletas o con valores inválidos.
- Corrección automática de unidades despachadas superiores a la cantidad recibida.
- Resumen de filas leídas, rechazadas, corregidas, insertadas, actualizadas, sin cambios y con clave asignada.
- Metadatos de trazabilidad para cada registro importado.
- Exportación de una o varias hojas de origen almacenadas en MongoDB.
- Generación de un libro con una hoja por origen, apto para volver a importarse.
- Exportación consolidada en una sola hoja con la columna adicional `Hoja de origen`; este formato es de consulta y no puede reimportarse directamente.
- Salida en formato de tabla de Excel, con encabezados, filtros y anchos de columna preparados.

### Consulta de radicados

- Tabla paginada de los registros almacenados en MongoDB.
- Visualización de fecha de ingreso, fecha límite y fecha de entrega.
- Visualización de cliente, orden de compra, área, referencia, talla, tipo, cantidades, unidades pendientes, estado y hoja de origen.
- Filtros por cliente, orden de compra, área, referencia, talla, tipo, hoja de origen, fechas de ingreso y estado.
- Ordenamiento ascendente o descendente por diferentes campos.
- Selección de la cantidad de registros por página.
- Colores diferenciados para representar el estado de cada radicado.
- Configuración persistente de los días considerados como entrega próxima.

### Producción semanal

- Agrupación de unidades por semana y referencia, cliente o área, sin separar automáticamente por talla.
- Filtros por periodo, cliente, área, referencia, talla y tipo.
- Inclusión de semanas sin producción dentro del periodo seleccionado.
- Redondeo de las cantidades a unidades enteras para evitar decimales producidos por errores humanos de digitación.
- Selección de la cantidad de categorías visibles según la agrupación elegida.
- Agrupación de las categorías restantes como `OTRAS` u `OTROS`, según corresponda.
- Gráficas de barras apiladas, barras agrupadas, líneas y torta.
- La gráfica de torta se limita a una sola semana e incluye una leyenda con categoría, porcentaje y unidades.
- Las semanas se presentan como intervalos completos, por ejemplo `24/08/26–30/08/26`.
- Tablas paginadas con el detalle semanal y los totales por la categoría seleccionada.
- Fechas iniciales configuradas automáticamente con el mes actual.

## Reglas de filtros dependientes

Los filtros de área, referencia, talla y tipo respetan estas reglas:

- Sin referencia seleccionada, los filtros de talla y tipo permanecen deshabilitados.
- Con una referencia específica, se habilitan talla y tipo.
- Las tallas disponibles corresponden únicamente a la referencia seleccionada.
- Al seleccionar referencia y talla, los tipos disponibles corresponden a esa combinación.
- La opción de todas las referencias permite filtrar por tipo sin exigir una talla.
- El filtro de área es independiente y utiliza los valores normalizados almacenados en mayúsculas.

## Estados de los radicados

Un radicado se considera entregado cuando las unidades despachadas son iguales o superiores a la cantidad recibida. Las unidades pendientes se calculan como:

```text
máximo(Cantidad - Unidades despachadas, 0)
```

Los estados disponibles son:

| Estado | Condición |
|---|---|
| `En proceso` | No ha sido entregado y no está próximo a vencer, o no tiene fecha límite. |
| `Entrega próxima` | No ha sido entregado y su fecha límite está dentro del número de días configurado. |
| `Vencido sin entregar` | No ha sido entregado y la fecha límite ya pasó. |
| `Entregado` | Fue completado y no tiene fecha límite. |
| `Entregado a tiempo` | La fecha de entrega es anterior o igual a la fecha límite. |
| `Entregado tarde` | La fecha de entrega es posterior a la fecha límite. |
| `Entregado sin fecha` | Las unidades fueron completadas, pero falta la fecha de entrega necesaria para comparar con la fecha límite. |

El valor inicial para considerar una entrega próxima es de 3 días. Puede modificarse desde la página de radicados y el nuevo valor queda almacenado en MongoDB como configuración general.

## Tecnologías

### Backend

- Python 3.11+
- FastAPI
- Uvicorn
- PyMongo
- Pandas
- OpenPyXL
- MongoDB Atlas
- JWT
- Argon2

### Frontend

- React
- TypeScript
- Vite
- Axios
- React Router
- Recharts

### Infraestructura

- Render para la API.
- Vercel para el frontend.
- MongoDB Atlas para los datos y la configuración general.
- GitHub para control de versiones e integración con los despliegues.

## Estructura principal

```text
arcoline-radicados/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── configuracion.py
│   │   │   ├── importaciones.py
│   │   │   ├── radicados.py
│   │   │   └── ventas.py
│   │   ├── auth.py
│   │   ├── database.py
│   │   └── main.py
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── pages/
│   │   │   ├── ImportacionPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RadicadosPage.tsx
│   │   │   └── VentasSemanalesPage.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── App.css
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vercel.json
├── .gitignore
└── README.md
```

## Requisitos para desarrollo

- Python 3.11 o superior.
- Node.js 20 o superior.
- npm.
- Git.
- Acceso a un proyecto de MongoDB Atlas.

## Instalación local

### 1. Clonar el repositorio

```powershell
git clone https://github.com/PedroCV1031/arcoline-radicados.git
cd arcoline-radicados
```

### 2. Configurar el backend

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Completar `backend/.env` con valores válidos:

```env
MONGODB_URI=mongodb+srv://usuario:contraseña@cluster.mongodb.net/
MONGODB_DATABASE=arcoline_db
MONGODB_COLLECTION=radicados
FRONTEND_URL=http://localhost:5173

APP_USERNAME=usuario_de_la_aplicacion
APP_PASSWORD_HASH=hash_argon2
JWT_SECRET_KEY=clave_secreta_larga_y_aleatoria
SESSION_HOURS=8
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
```

Iniciar la API desde `backend`:

```powershell
uvicorn app.main:app --reload
```

La API estará disponible en `http://127.0.0.1:8000` y su documentación en `http://127.0.0.1:8000/docs`.

### 3. Configurar el frontend

En otra terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
```

Contenido de `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Iniciar el frontend:

```powershell
npm run dev
```

Abrir `http://localhost:5173`.

## Variables de entorno

### Backend

| Variable | Descripción |
|---|---|
| `MONGODB_URI` | Cadena de conexión privada a MongoDB Atlas. |
| `MONGODB_DATABASE` | Nombre de la base de datos. |
| `MONGODB_COLLECTION` | Nombre de la colección de radicados. |
| `FRONTEND_URL` | Origen exacto autorizado por CORS, sin `/` al final. |
| `APP_USERNAME` | Usuario de acceso a la plataforma. |
| `APP_PASSWORD_HASH` | Hash Argon2 de la contraseña. Nunca debe contener la contraseña en texto plano. |
| `JWT_SECRET_KEY` | Clave larga y aleatoria usada para firmar las sesiones. |
| `SESSION_HOURS` | Duración de la sesión en horas. |
| `COOKIE_SECURE` | `false` en desarrollo local y `true` bajo HTTPS. |
| `COOKIE_SAMESITE` | `lax` en local y `none` cuando frontend y backend usan dominios diferentes. |

### Frontend

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de la API, sin `/` al final. |

Los archivos `.env` nunca deben subirse al repositorio. Solo deben versionarse los archivos `.env.example`, sin secretos reales.

## Estructura requerida del Excel

El archivo debe tener extensión `.xlsx` o `.xlsm` y un tamaño máximo de 20 MB.

Una hoja se considera válida únicamente si su primera fila contiene exactamente estas columnas y en este orden:

1. `Fecha ingreso`
2. `Fecha limite`
3. `Cliente`
4. `Orden de compra`
5. `Area`
6. `Referencia`
7. `Talla`
8. `Tipo`
9. `Cantidad`
10. `Unidades despachadas`
11. `Fecha entrega final`

Las columnas `Area` y `Tipo` deben existir. `Area` es obligatoria en cada fila y se almacena internamente en mayúsculas; `Tipo` puede quedar vacío. Las hojas que no cumplen la estructura no se muestran como opciones de importación.

### Requisitos mínimos de cada fila

Para ser importada, una fila debe contener valores válidos en:

- `Fecha ingreso`
- `Cliente`
- `Area`
- `Referencia`
- `Talla`
- `Cantidad`

Las fechas y los valores numéricos también se validan. Las filas que no cumplen las reglas se rechazan sin impedir la importación de las demás.

Si `Unidades despachadas` supera a `Cantidad`, el valor se corrige automáticamente para que sea igual a `Cantidad` y la corrección se informa en el resultado de la importación.

### Identidad y duplicados

El identificador de MongoDB (`_id`) y las claves auxiliares son internos: no se leen desde el Excel ni deben añadirse como columnas. Para reconocer un mismo registro, la aplicación genera una clave determinística a partir de la hoja de origen y de estos campos:

- `Fecha ingreso`
- `Cliente`
- `Orden de compra`
- `Referencia`
- `Talla`
- `Cantidad`

`Area`, `Tipo`, fechas de entrega y unidades despachadas forman parte del contenido que puede actualizarse, pero no cambian la identidad del registro. Si una misma clave aparece más de una vez dentro de una hoja del Excel, las repeticiones se rechazan indicando la fila original. Si la clave coincide con varios documentos ya duplicados en MongoDB, la fila también se rechaza y se informa claramente para evitar una actualización ambigua.

Los registros existentes que todavía no tengan claves internas no requieren una migración manual: cuando una hoja vuelve a importarse, la aplicación calcula y asigna esas claves dentro de la misma actualización.

### Comportamiento de la importación

1. El usuario selecciona un archivo.
2. El backend identifica las hojas válidas.
3. El usuario selecciona las hojas que desea cargar.
4. La plataforma solicita confirmación explícita.
5. Todas las hojas seleccionadas se validan antes de modificar MongoDB.
6. Cada fila aceptada se compara con los documentos existentes de su hoja de origen.
7. Los registros nuevos se insertan, los modificados se actualizan y los idénticos permanecen sin escrituras de contenido.
8. Los registros que existen en MongoDB pero no aparecen en el archivo no se eliminan automáticamente.
9. Las operaciones se ejecutan dentro de una transacción para evitar actualizaciones parciales entre las hojas seleccionadas.
10. La interfaz informa las filas leídas, rechazadas y corregidas, además de los registros insertados, actualizados, sin cambios y con identidad asignada.

Cada documento importado incluye:

```json
{
  "_metadatos": {
    "archivo_origen": "RADICADO ARCOLINE 2024.xlsx",
    "hoja_origen": "OCT 2026",
    "fila_origen": 1173,
    "fecha_importacion": "fecha ISO",
    "lote_importacion": "identificador UUID"
  }
}
```

Los registros actualizados conservan su `_id`. Su trazabilidad añade la fecha y el lote de la última actualización, mientras que los registros sin cambios conservan sus datos anteriores.

### Comportamiento de la exportación

1. El usuario cambia la operación de `Importar` a `Exportar`.
2. La plataforma consulta las hojas de origen disponibles y muestra cuántos registros contiene cada una.
3. El usuario selecciona una o varias hojas.
4. Puede generar una hoja de Excel por cada hoja de origen o consolidar todo en una sola hoja.
5. En el modo por hojas, el archivo conserva exactamente la estructura importable descrita anteriormente.
6. En el modo consolidado, se agrega `Hoja de origen` como primera columna y el archivo se destina a consulta; para reimportarlo habría que separarlo nuevamente y recuperar la estructura exacta.

## Endpoints principales

### Autenticación

| Método | Ruta | Función |
|---|---|---|
| `POST` | `/api/autenticacion/login` | Inicia una sesión. |
| `POST` | `/api/autenticacion/logout` | Cierra la sesión. |
| `GET` | `/api/autenticacion/me` | Comprueba la sesión actual. |

### Radicados

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/radicados` | Consulta paginada, filtrada y ordenada. |
| `GET` | `/api/radicados/opciones-filtros` | Obtiene las opciones disponibles para los filtros dependientes. |

### Importaciones

| Método | Ruta | Función |
|---|---|---|
| `POST` | `/api/importaciones/hojas` | Analiza un archivo y devuelve sus hojas válidas. |
| `POST` | `/api/importaciones/cargar` | Valida y actualiza selectivamente las hojas confirmadas. |
| `GET` | `/api/importaciones/exportacion/hojas` | Lista las hojas de origen disponibles y su cantidad de registros. |
| `POST` | `/api/importaciones/exportar` | Genera y descarga el libro Excel solicitado. |

### Producción semanal

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/ventas/semanales` | Agrupa las unidades por semana y por referencia, cliente o área. |

### Configuración

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/api/configuracion/entregas` | Consulta los días configurados para entregas próximas. |
| `PUT` | `/api/configuracion/entregas` | Actualiza y conserva la configuración en MongoDB. |

### Estado del servicio

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/` | Indica que la aplicación está activa. |
| `GET` | `/api/health` | Comprueba la API y la conexión con MongoDB. |

## Verificaciones antes de subir cambios

### Backend

```powershell
cd backend
python -m compileall app
```

### Frontend

```powershell
cd frontend
npm run lint
npm run build
```

### Repositorio

```powershell
git status
git diff --check
```

## Despliegue

### Render

Configuración del servicio web:

```text
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Variables relevantes de producción:

```env
FRONTEND_URL=https://arcoline-radicados.vercel.app
COOKIE_SECURE=true
COOKIE_SAMESITE=none
```

También deben configurarse en Render las credenciales de MongoDB, el usuario de la aplicación, el hash de la contraseña y la clave JWT. Los rangos de IP de salida de Render deben estar autorizados en **MongoDB Atlas → Security → Network Access**.

### Vercel

Configuración del proyecto:

```text
Framework: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

Variable de producción:

```env
VITE_API_URL=https://arcoline-radicados.onrender.com
```

Después de modificar una variable `VITE_*`, debe desplegarse nuevamente el frontend.

## Flujo de trabajo con Git

Crear una rama desde `main`:

```powershell
git switch main
git pull
git switch -c desarrollo/nombre-del-cambio
```

Después de verificar los cambios:

```powershell
git add .
git commit -m "Descripción clara del cambio"
git push -u origin desarrollo/nombre-del-cambio
```

Crear un Pull Request hacia `main`. Los despliegues de producción se actualizan a partir de esa rama.

## Seguridad

- No guardar credenciales, hashes reales, tokens ni cadenas de conexión en GitHub.
- Mantener `backend/.env` y `frontend/.env` ignorados por Git.
- Usar HTTPS y cookies seguras en producción.
- Restringir en MongoDB Atlas el acceso de red a las direcciones necesarias.
- Cambiar periódicamente las credenciales y la clave de firma de las sesiones.
- Evitar mostrar errores internos de MongoDB o datos sensibles en la interfaz.
- No compartir capturas que expongan variables de entorno o cadenas de conexión.

## Uso interno

Este proyecto fue desarrollado para la gestión interna de la producción de Arcoline. No se distribuye bajo una licencia de código abierto.

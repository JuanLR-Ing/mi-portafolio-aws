# Arquitectura - Plataforma de mi portafolio como desarrollador de Software

Este documento explica cómo armé la plataforma de mi portafolio. Permite publicar un portafolio como página estática, que cargue rápido desde cualquier país y que algunos archivos puedan ser privados. Todo se define con AWS CDK en TypeScript y se despliega con un solo `cdk deploy`.

## Qué construí

- Un bucket de S3 privado donde van los archivos del portafolio.
- Una distribución de CloudFront que sirve esos archivos.
- Una tabla de DynamoDB con los datos de cada portafolio.
- Dos roles de IAM: uno para escribir en S3 y otro para leer la tabla.
- Una clave pública en CloudFront para poder firmar enlaces de archivos privados.

## Diagrama

```
Usuario --> CloudFront --> Bucket S3 (privado)
               |
               +-- /private/*  solo responde con URL firmada

Rol Writer --> Bucket S3        (puede subir archivos)
Rol Reader --> Tabla DynamoDB   (puede leer datos)
```

## Decisiones de diseño

**S3.** El bucket tiene todo el acceso público bloqueado. Lo dejé con cifrado por defecto y con la opción de exigir HTTPS. Para poder borrarlo con `cdk destroy` usé `removalPolicy: DESTROY` y `autoDeleteObjects: true`, así se vacía solo. No le puse nombre fijo porque los nombres de S3 son únicos en todo el mundo y CDK genera uno propio.

**CloudFront.** Lee el bucket usando OAC (Origin Access Control). Con eso el bucket solo acepta lecturas que vengan de mi distribución. También redirige HTTP a HTTPS y muestra `index.html` cuando se entra a la raíz.

**DynamoDB.** La clave de partición es `studentId` (texto). Elegí el modo `PAY_PER_REQUEST` porque no tiene costo fijo y aquí casi no hay uso.

**IAM.** Creé dos roles dentro del stack, no a mano en la consola:

- `PortfolioWriterRole`: solo puede subir objetos al bucket. No puede listar ni borrar, y no tiene acceso a DynamoDB.
- `PortfolioReaderRole`: solo puede leer la tabla. No puede escribir en ella y no tiene acceso a S3.

Para darles permisos usé los métodos `grant` de CDK (`bucket.grantPut` y `table.grantReadData`), que generan permisos limitados a ese bucket y a esa tabla.

## Seguridad

Si alguien entra directo a la URL del bucket recibe un 403, porque el bucket bloquea el acceso público y su única regla de lectura es para mi distribución de CloudFront. Los roles solo los pueden asumir usuarios de mi propia cuenta.

## Boss Fight

**Archivos privados.** Usé URLs firmadas de CloudFront. Generé un par de claves RSA con Node: la clave pública está en `cdk/keys/public_key.pem` y se registra en CloudFront desde el stack, y la clave privada la guardé fuera del proyecto para no subirla nunca a GitHub. La ruta `private/*` es un comportamiento aparte de la distribución que solo responde si la URL viene firmada. Para firmar usé el comando `aws cloudfront sign` y los enlaces duran una hora. Escogí CloudFront en vez de URLs firmadas de S3 porque así el bucket sigue sin acceso directo.

**Price Class.** Empecé con `PriceClass_100` y después la cambié a `PriceClass_200`, como pedía el reto. Una cosa que revisé en la página de precios de AWS: la clase 200 incluye Norteamérica, Europa, África, Medio Oriente y Asia, pero no Sudamérica. Eso significa que desde Colombia el contenido se sirve desde servidores de otras regiones. Funciona igual, con un poco más de latencia. Para tener servidores en Sudamérica habría que usar `PriceClass_All`.

**Público y privado juntos.** Hay dos rutas sobre el mismo bucket: la normal (`/*`) es pública y `private/*` pide firma. Cada estudiante privado tiene su carpeta `private/<studentId>/`.

## Cómo lo desplegué

Dentro de la carpeta `cdk/`:

```
cdk bootstrap     (una sola vez por cuenta y región)
npm run build
cdk synth
cdk deploy
```

Para borrar todo: `cdk destroy`. Trabajé en la región us-east-1 con un usuario de IAM propio y no con la cuenta root.

Los ítems de prueba de DynamoDB están en `data/portfolios.json` y los cargué con `aws dynamodb put-item`.

## Pruebas que hice

- Archivo público por la URL de CloudFront: devuelve 200 con el contenido.
- Acceso directo al bucket: devuelve 403.
- Archivo privado sin firma: devuelve 403.
- Archivo privado con URL firmada: devuelve 200.
- Tabla de DynamoDB: existe con la clave `studentId` y tiene 2 ítems (uno público y uno privado).
- Rol Writer: pudo subir un archivo a S3, pero no pudo listar el bucket ni leer DynamoDB.
- Rol Reader: pudo leer la tabla, pero no pudo escribir en ella ni subir a S3.

## Problemas que tuve

- Después de instalar AWS CLI el comando `aws` no se reconocía. Tuve que cerrar y volver a abrir la terminal.
- Los comandos `npm` y `cdk` solo funcionan dentro de la carpeta `cdk/`. Al principio los ejecuté en la carpeta de afuera y fallaron.
- La primera prueba por CloudFront dio 403 porque todavía no había subido el archivo. Con OAC, S3 responde 403 (y no 404) cuando el archivo no existe.
- Guardé el JSON como `portafolios.json` y el script buscaba `portfolios.json`, por eso no lo encontraba.

## Costos y limpieza

Todo es de pago por uso, así que con casi cero tráfico el costo es mínimo. Al terminar ejecuto `cdk destroy`. El stack `CDKToolkit` que crea `cdk bootstrap` queda en la cuenta, con un costo muy bajo, y se puede borrar a mano.
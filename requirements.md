# Requisitos - Plataforma de portafolios estudiantiles

## Contexto

La Universidad del Valle necesita una plataforma económica y escalable donde los estudiantes puedan subir sus portafolios (HTML, CSS, imágenes y PDFs). El sitio debe cargar rápido desde cualquier país, mantener privados los archivos sensibles de algunos estudiantes, ser barato de operar y poder crearse y destruirse fácilmente con infraestructura como código.

## Requisitos

1. Un bucket de S3 para guardar los archivos estáticos del portafolio.
2. Una distribución de CloudFront para servir el contenido con baja latencia en todo el mundo.
3. Una tabla de DynamoDB con los metadatos de cada portafolio (estudiante, fecha, URL).
4. Roles de IAM con mínimo privilegio: el stack debe definir quién puede escribir en S3 y quién puede leer en DynamoDB.
5. Todo debe desplegarse con un solo `cdk deploy`.

## Servicios usados

- S3: guarda los archivos del portafolio.
- CloudFront: CDN global con caché.
- DynamoDB: guarda los metadatos.
- IAM: controla los permisos.

## Entregables

- Stack de CDK desplegado sin errores.
- Bucket de S3 con el acceso público bloqueado.
- Distribución de CloudFront con el bucket como origen.
- Tabla de DynamoDB con al menos un ítem de prueba.
- Roles de IAM definidos dentro del stack, no creados a mano.
- URL de CloudFront que sirva un archivo de prueba.

## Criterios de éxito

- Al abrir el portafolio por la URL de CloudFront se ve el contenido correcto.
- Al entrar directo al bucket de S3 se obtiene un error 403.
- `cdk synth` genera la plantilla sin errores.
- La tabla de DynamoDB existe con la clave de partición correcta.

## Boss Fight

El cliente cambia los requisitos:

- Algunos archivos del portafolio deben ser privados y solo accesibles con un enlace firmado.
- El tráfico debe optimizarse para usuarios de América Latina, Europa y Asia al mismo tiempo.

Lo que cambia:

- Configurar URLs firmadas (de S3 o de CloudFront) para los archivos privados.
- Ajustar CloudFront para usar Price Class 200.
- El stack debe soportar archivos públicos y privados sin romper lo que ya funciona.

## Limpieza

Al terminar hay que borrar todos los recursos con `cdk destroy`. S3 no elimina buckets con contenido, así que hay que vaciar el bucket antes o configurar `autoDeleteObjects: true`.
# Plataforma de mi portafolio como desarrollador de Software

Proyecto del Reto 1 de AWS Student Builder Group - Universidad del Valle. Es la plataforma donde publico mi portafolio como desarrollador de software, hecha con AWS CDK en TypeScript. También sirve para que otros estudiantes publiquen el suyo: los archivos se entregan de forma global y algunos pueden ser privados.

## Qué hace

- Guarda los archivos del portafolio en un bucket de S3 privado.
- Los sirve con CloudFront, que lee el bucket sin que este sea público.
- Guarda los datos de cada portafolio en una tabla de DynamoDB.
- Define dos roles de IAM con permisos mínimos: uno para subir archivos y otro para leer la tabla.
- Permite archivos privados en la ruta `private/`, que solo se pueden ver con una URL firmada.

## Estructura del repositorio

```
mi-portafolio-aws/
  cdk/            proyecto de CDK (stack, claves públicas, configuración)
  application/    página del portafolio
  data/           datos de prueba para DynamoDB
  docs/           documentación de la arquitectura
  README.md
  requirements.md
```

## Requisitos previos

- Node.js 18 o superior
- AWS CLI configurado con credenciales (`aws configure`)
- AWS CDK CLI: `npm install -g aws-cdk`

## Cómo desplegarlo

Todo se hace dentro de la carpeta `cdk/`:

```
cd cdk
npm install
cdk bootstrap
cdk synth
cdk deploy
```

`cdk bootstrap` solo se hace una vez por cuenta y región. Al terminar `cdk deploy` se muestran los datos que se necesitan después: el nombre del bucket, la URL de CloudFront, el nombre de la tabla y el `PublicKeyId`.

## Claves para las URLs firmadas

El stack lee la clave pública desde `cdk/keys/public_key.pem`. La clave privada no está en el repositorio y no debe subirse nunca. Para crear un par de claves propio (en Windows, la privada queda en una carpeta fuera del proyecto):

```
mkdir keys
mkdir "$env:USERPROFILE\portafolio-keys"
node -e "const c=require('crypto'),fs=require('fs'),p=require('path');const k=c.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs1',format:'pem'}});fs.writeFileSync('keys/public_key.pem',k.publicKey);fs.writeFileSync(p.join(process.env.USERPROFILE,'portafolio-keys','private_key.pem'),k.privateKey);"
```

Para generar un enlace firmado de un archivo privado:

```
aws cloudfront sign --url "https://<tu-distribucion>.cloudfront.net/private/<studentId>/index.html" --key-pair-id <PublicKeyId> --private-key file://<ruta>/private_key.pem --date-less-than <fecha-de-vencimiento>
```

## Cómo probarlo

1. Subir un archivo al bucket con `aws s3 cp`.
2. Abrirlo por la URL de CloudFront: debe responder 200.
3. Abrirlo por la URL directa del bucket: debe responder 403.
4. Abrir un archivo de `private/` sin firma: debe responder 403. Con la URL firmada: 200.

Los datos de `data/portfolios.json` se pueden cargar a la tabla con `aws dynamodb put-item`.

## Limpiar los recursos

```
cd cdk
cdk destroy
```

El bucket se vacía solo porque tiene `autoDeleteObjects` activado.

## Más información

La explicación de la arquitectura y de las decisiones que tomé está en `docs/architecture.md`.
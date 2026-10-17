import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';

export class PortfolioStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly table: dynamodb.Table;
  public readonly writerRole: iam.Role;
  public readonly readerRole: iam.Role;

constructor(scope: Construct, id: string, props?: cdk.StackProps) {
  super(scope, id, props);


  this.bucket = new s3.Bucket(this, 'PortfolioBucket', {
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    encryption: s3.BucketEncryption.S3_MANAGED,
    enforceSSL: true,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
  });


  const publicKey = new cloudfront.PublicKey(this, 'PortfolioPublicKey', {
    encodedKey: fs.readFileSync(path.join(__dirname, '../keys/public_key.pem'), 'utf8'),
  });

  const keyGroup = new cloudfront.KeyGroup(this, 'PortfolioKeyGroup', {
    items: [publicKey],
  });


  const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(this.bucket);

  this.distribution = new cloudfront.Distribution(this, 'PortfolioDistribution', {
    comment: 'CDN de portafolios estudiantiles - Univalle',
    defaultRootObject: 'index.html',
    priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
    defaultBehavior: {
      origin: s3Origin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    },
    additionalBehaviors: {
      'private/*': {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        trustedKeyGroups: [keyGroup],
      },
    },
  });


  this.table = new dynamodb.Table(this, 'PortfoliosTable', {
    partitionKey: { name: 'studentId', type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  });


  this.writerRole = new iam.Role(this, 'PortfolioWriterRole', {
    assumedBy: new iam.AccountRootPrincipal(),
    description: 'Puede subir archivos de portafolios al bucket S3',
  });

  this.bucket.grantPut(this.writerRole);


  this.readerRole = new iam.Role(this, 'PortfolioReaderRole', {
    assumedBy: new iam.AccountRootPrincipal(),
    description: 'Puede leer los metadatos de portafolios en DynamoDB',
  });

  this.table.grantReadData(this.readerRole);


  new cdk.CfnOutput(this, 'BucketName', {
    value: this.bucket.bucketName,
  });

  new cdk.CfnOutput(this, 'CloudFrontURL', {
    value: `https://${this.distribution.distributionDomainName}`,
  });

  new cdk.CfnOutput(this, 'TableName', {
    value: this.table.tableName,
  });

  new cdk.CfnOutput(this, 'WriterRoleArn', {
    value: this.writerRole.roleArn,
  });

  new cdk.CfnOutput(this, 'ReaderRoleArn', {
    value: this.readerRole.roleArn,
  });

  new cdk.CfnOutput(this, 'PublicKeyId', {
    value: publicKey.publicKeyId,
  });
}
}
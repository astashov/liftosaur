import * as cdk from "@aws-cdk/core";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigw from "@aws-cdk/aws-apigateway";
import * as sm from "@aws-cdk/aws-secretsmanager";

export class LiftosaurCdkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, isDev: boolean, props?: cdk.StackProps) {
    super(scope, id, props);

    const suffix = isDev ? "Dev" : "";
    const env = isDev ? "dev" : "prod";

    const depsLayer = new lambda.LayerVersion(this, `LftNodeDependencies${suffix}`, {
      code: lambda.Code.fromAsset("dist-lambda", {
        bundling: {
          image: lambda.Runtime.NODEJS_14_X.bundlingDockerImage,
          command: [
            "bash",
            "-c",
            "mkdir -p /asset-output/nodejs && cd /asset-output/nodejs && cp /asset-input/{package.json,package-lock.json} . && npm ci",
          ],
          environment: { HOME: "/tmp/home" },
        },
      }),
    });

    const usersTable = new dynamodb.Table(this, `LftUsers${suffix}`, {
      tableName: `lftUsers${suffix}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });
    usersTable.addGlobalSecondaryIndex({
      indexName: `lftUsersGoogleId${suffix}`,
      partitionKey: { name: "googleId", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const googleAuthKeysTable = new dynamodb.Table(this, `LftGoogleAuthKeys${suffix}`, {
      tableName: `lftGoogleAuthKeys${suffix}`,
      partitionKey: { name: "token", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const historyRecordsTable = new dynamodb.Table(this, `LftHistoryRecords${suffix}`, {
      tableName: `lftHistoryRecords${suffix}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "date", type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const statsTable = new dynamodb.Table(this, `LftStats${suffix}`, {
      tableName: `lftStats${suffix}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const programsTable = new dynamodb.Table(this, `LftPrograms${suffix}`, {
      tableName: `lftPrograms${suffix}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const secretArns = {
      dev: {
        cookieSecret: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyCookieSecretDev-0eiLCe",
      },
      prod: {
        cookieSecret: "arn:aws:secretsmanager:us-west-2:547433167554:secret:LftKeyCookieSecret-FwRXge",
      },
    };

    const secret = sm.Secret.fromSecretAttributes(this, `LftKeyCookieSecret${suffix}`, {
      secretArn: secretArns[env].cookieSecret,
    });

    const lambdaFunction = new lambda.Function(this, `LftLambda${suffix}`, {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("dist-lambda"),
      layers: [depsLayer],
      handler: "lambda/index.handler",
      environment: {
        IS_DEV: `${isDev}`,
      },
    });

    new apigw.LambdaRestApi(this, `LftEndpoint${suffix}`, { handler: lambdaFunction });

    secret.grantRead(lambdaFunction);
    usersTable.grantReadWriteData(lambdaFunction);
    googleAuthKeysTable.grantReadWriteData(lambdaFunction);
    historyRecordsTable.grantReadWriteData(lambdaFunction);
    statsTable.grantReadWriteData(lambdaFunction);
    programsTable.grantReadWriteData(lambdaFunction);
  }
}

const app = new cdk.App();
new LiftosaurCdkStack(app, "LiftosaurStack", false);
new LiftosaurCdkStack(app, "LiftosaurStackDev", true);

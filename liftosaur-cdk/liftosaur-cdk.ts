import * as cdk from "@aws-cdk/core";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigw from "@aws-cdk/aws-apigateway";

export class LiftosaurCdkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, isDev: boolean, props?: cdk.StackProps) {
    super(scope, id, props);

    const suffix = isDev ? "Dev" : "";

    const depsLayer = new lambda.LayerVersion(this, `LiftosaurNodeDependencies${suffix}`, {
      code: lambda.Code.fromAsset("dist-lambda", {
        exclude: ["*", "!package.json", "!package-lock.json"],
        bundling: {
          image: lambda.Runtime.NODEJS_14_X.bundlingDockerImage,
          command: [
            "bash",
            "-c",
            "mkdir /asset-output/nodejs && cd $_ && " +
              "cp /asset-input/{package.json,package-lock.json} . && " +
              "npm ci",
          ],
          environment: { HOME: "/tmp/home" },
        },
      }),
    });

    const liftosaurHitsTable = new dynamodb.Table(this, `LiftosaurHits${suffix}`, {
      tableName: `liftosaurHits${suffix}`,
      partitionKey: { name: "path", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const lambdaFunction = new lambda.Function(this, `LiftosaurLambda${suffix}`, {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("dist-lambda"),
      layers: [depsLayer],
      handler: "index.handler",
      environment: {
        IS_DEV: `${isDev}`,
      },
    });

    new apigw.LambdaRestApi(this, `LiftosaurEndpoint${suffix}`, { handler: lambdaFunction });

    liftosaurHitsTable.grantReadWriteData(lambdaFunction);
  }
}

const app = new cdk.App();
new LiftosaurCdkStack(app, "LiftosaurStack", false);
new LiftosaurCdkStack(app, "LiftosaurStackDev", true);

#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigw from "@aws-cdk/aws-apigateway";

export class LiftosaurCdkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const depsLayer = new lambda.LayerVersion(this, "LiftosaurNodeDependencies", {
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

    const table = new dynamodb.Table(this, "LiftosaurHits", {
      tableName: "liftosaur_Hits",
      partitionKey: { name: "path", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const lambdaFunction = new lambda.Function(this, "LiftosaurLambda", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("dist-lambda"),
      layers: [depsLayer],
      handler: "index.handler",
    });

    new apigw.LambdaRestApi(this, "LiftosaurEndpoint", { handler: lambdaFunction });

    table.grantReadWriteData(lambdaFunction);
  }
}

const app = new cdk.App();
new LiftosaurCdkStack(app, "LiftosaurStack");

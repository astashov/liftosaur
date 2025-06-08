import * as cdk from "aws-cdk-lib";
import { aws_dynamodb as dynamodb } from "aws-cdk-lib";
import { aws_lambda as lambda } from "aws-cdk-lib";
import { aws_apigateway as apigw } from "aws-cdk-lib";
import { aws_secretsmanager as sm } from "aws-cdk-lib";
import { aws_s3 as s3 } from "aws-cdk-lib";
import { aws_certificatemanager as acm } from "aws-cdk-lib";
import { aws_iam as iam } from "aws-cdk-lib";
import { aws_events, aws_events_targets } from "aws-cdk-lib";
import { LftS3Buckets } from "../lambda/dao/buckets";
import childProcess from "child_process";

export class LiftosaurCdkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, isDev: boolean, props?: cdk.StackProps) {
    super(scope, id, props);

    const suffix = isDev ? "Dev" : "";
    const env = isDev ? "dev" : "prod";

    const depsLayer = new lambda.LayerVersion(this, `LftNodeDependencies${suffix}`, {
      code: lambda.Code.fromAsset("dist-lambda", {
        bundling: {
          image: lambda.Runtime.NODEJS_18_X.bundlingImage,
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
      pointInTimeRecovery: true,
    });
    usersTable.addGlobalSecondaryIndex({
      indexName: `lftUsersGoogleId${suffix}`,
      partitionKey: { name: "googleId", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    usersTable.addGlobalSecondaryIndex({
      indexName: `lftUsersAppleId${suffix}`,
      partitionKey: { name: "appleId", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    usersTable.addGlobalSecondaryIndex({
      indexName: `lftUsersNickname${suffix}`,
      partitionKey: { name: "nickname", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const affiliatesTable = new dynamodb.Table(this, `LftAffiliates${suffix}`, {
      tableName: `lftAffiliates${suffix}`,
      partitionKey: { name: "affiliateId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });

    const subscriptionDetailsTable = new dynamodb.Table(this, `LftSubscriptionDetails${suffix}`, {
      tableName: `lftSubscriptionDetails${suffix}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });

    const googleAuthKeysTable = new dynamodb.Table(this, `LftGoogleAuthKeys${suffix}`, {
      tableName: `lftGoogleAuthKeys${suffix}`,
      partitionKey: { name: "token", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });

    const appleAuthKeysTable = new dynamodb.Table(this, `LftAppleAuthKeys${suffix}`, {
      tableName: `lftAppleAuthKeys${suffix}`,
      partitionKey: { name: "token", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });

    const historyRecordsTable = new dynamodb.Table(this, `LftHistoryRecords${suffix}`, {
      tableName: `lftHistoryRecords${suffix}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });
    historyRecordsTable.addGlobalSecondaryIndex({
      indexName: `lftHistoryRecordsDate${suffix}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "date", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const statsTable = new dynamodb.Table(this, `LftStats${suffix}`, {
      tableName: `lftStats${suffix}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "name", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });
    statsTable.addGlobalSecondaryIndex({
      indexName: `lftStatsTimestamp${suffix}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const logsTable = new dynamodb.Table(this, `LftLogs${suffix}`, {
      tableName: `lftLogs${suffix}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "action", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });
    logsTable.addGlobalSecondaryIndex({
      indexName: `lftLogsDate${suffix}`,
      partitionKey: { name: "year", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "month", type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const userProgramsTable = new dynamodb.Table(this, `LftUserPrograms${suffix}`, {
      tableName: `lftUserPrograms${suffix}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });

    const programsTable = new dynamodb.Table(this, `LftPrograms${suffix}`, {
      tableName: `lftPrograms${suffix}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });

    const urlsTable = new dynamodb.Table(this, `LftUrls${suffix}`, {
      tableName: `lftUrls${suffix}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });

    const freeUsersTable = new dynamodb.Table(this, `LftFreeUsers${suffix}`, {
      tableName: `lftFreeUsers${suffix}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });

    const couponsTable = new dynamodb.Table(this, `LftCoupons${suffix}`, {
      tableName: `lftCoupons${suffix}`,
      partitionKey: { name: "code", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });

    const debugTable = new dynamodb.Table(this, `LftDebug${suffix}`, {
      tableName: `lftDebug${suffix}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });

    const eventsTable = new dynamodb.Table(this, `LftEvents${suffix}`, {
      tableName: `lftEvents${suffix}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.NUMBER },
      timeToLiveAttribute: "ttl",
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });

    const secretArns = {
      dev: {
        all: "arn:aws:secretsmanager:us-west-2:366191129585:secret:lftAppSecretsDev-RVo7cG",
      },
      prod: {
        all: "arn:aws:secretsmanager:us-west-2:366191129585:secret:lftAppSecrets-cRCeI1",
      },
    };

    const allSecrets = sm.Secret.fromSecretAttributes(this, `LftAllSecrets${suffix}`, {
      secretCompleteArn: secretArns[env].all,
    });

    const bucket = new s3.Bucket(this, `LftS3Caches${suffix}`, {
      bucketName: `${LftS3Buckets.caches}${suffix.toLowerCase()}`,
      lifecycleRules: [{ expiration: cdk.Duration.days(1) }],
    });

    const debugbucket = new s3.Bucket(this, `LftS3Debugs${suffix}`, {
      bucketName: `${LftS3Buckets.debugs}${suffix.toLowerCase()}`,
      lifecycleRules: [{ expiration: cdk.Duration.days(365) }],
    });

    const exceptionsbucket = new s3.Bucket(this, `LftS3Exceptions${suffix}`, {
      bucketName: `${LftS3Buckets.exceptions}${suffix.toLowerCase()}`,
      lifecycleRules: [{ expiration: cdk.Duration.days(30) }],
    });

    const storagesBucket = new s3.Bucket(this, `LftS3Storages${suffix}`, {
      bucketName: `${LftS3Buckets.storages}${suffix.toLowerCase()}`,
      lifecycleRules: [{ expiration: cdk.Duration.days(14) }],
    });

    const statsBucket = new s3.Bucket(this, `LftS3Stats${suffix}`, {
      bucketName: `${LftS3Buckets.stats}${suffix.toLowerCase()}`,
    });

    const programsBucket = new s3.Bucket(this, `LftS3Programs${suffix}`, {
      bucketName: `${LftS3Buckets.programs}${suffix.toLowerCase()}`,
    });

    const commitHash = childProcess.execSync("git rev-parse --short HEAD").toString().trim();
    const fullCommitHash = childProcess.execSync("git rev-parse HEAD").toString().trim();
    const lambdaFunction = new lambda.Function(this, `LftLambda${suffix}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("dist-lambda"),
      memorySize: 2048,
      layers: [depsLayer],
      timeout: cdk.Duration.seconds(isDev ? 240 : 300),
      handler: "lambda/run.handler",
      environment: {
        IS_LOCAL: "false",
        IS_DEV: `${isDev}`,
        COMMIT_HASH: commitHash,
        FULL_COMMIT_HASH: fullCommitHash,
      },
    });

    const statsLambdaFunction = new lambda.Function(this, `LftStatsLambda${suffix}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      functionName: `LftStatsLambda${suffix}`,
      code: lambda.Code.fromAsset("dist-lambda"),
      memorySize: 512,
      layers: [depsLayer],
      timeout: cdk.Duration.seconds(300),
      handler: `lambda/run.LftStatsLambda${suffix}`,
      environment: {
        IS_DEV: `${isDev}`,
      },
    });
    const rule = new aws_events.Rule(this, `LftStatsLambdaRule${suffix}`, {
      schedule: aws_events.Schedule.cron({
        minute: "57",
        hour: "23",
        month: "*",
        weekDay: "*",
        year: "*",
      }),
    });

    rule.addTarget(new aws_events_targets.LambdaFunction(statsLambdaFunction));

    const cert = acm.Certificate.fromCertificateArn(
      this,
      `LftEndpointCert${suffix}`,
      "arn:aws:acm:us-west-2:366191129585:certificate/2e317b03-2624-4b47-a116-2cc66107d65b"
    );

    const restApi = new apigw.RestApi(this, `LftEndpoint${suffix}`, {
      defaultIntegration: new apigw.LambdaIntegration(lambdaFunction),
      binaryMediaTypes: ["*/*"],
      domainName: {
        domainName: `api3${isDev ? "-dev" : ""}.liftosaur.com`,
        certificate: cert,
      },
    });
    restApi.root.addProxy();

    bucket.grantReadWrite(lambdaFunction);
    debugbucket.grantReadWrite(lambdaFunction);
    exceptionsbucket.grantReadWrite(lambdaFunction);
    programsBucket.grantReadWrite(lambdaFunction);
    statsBucket.grantReadWrite(lambdaFunction);
    storagesBucket.grantReadWrite(lambdaFunction);
    statsBucket.grantReadWrite(statsLambdaFunction);
    allSecrets.grantRead(lambdaFunction);
    allSecrets.grantRead(statsLambdaFunction);
    usersTable.grantReadWriteData(lambdaFunction);
    usersTable.grantReadWriteData(statsLambdaFunction);
    googleAuthKeysTable.grantReadWriteData(lambdaFunction);
    appleAuthKeysTable.grantReadWriteData(lambdaFunction);
    historyRecordsTable.grantReadWriteData(lambdaFunction);
    statsTable.grantReadWriteData(lambdaFunction);
    programsTable.grantReadWriteData(lambdaFunction);
    userProgramsTable.grantReadWriteData(lambdaFunction);
    subscriptionDetailsTable.grantReadWriteData(lambdaFunction);
    logsTable.grantReadWriteData(lambdaFunction);
    logsTable.grantReadWriteData(statsLambdaFunction);
    eventsTable.grantReadWriteData(lambdaFunction);
    urlsTable.grantReadWriteData(lambdaFunction);
    affiliatesTable.grantReadWriteData(lambdaFunction);
    freeUsersTable.grantReadWriteData(lambdaFunction);
    couponsTable.grantReadWriteData(lambdaFunction);
    debugTable.grantReadWriteData(lambdaFunction);
    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["ses:SendEmail", "SES:SendRawEmail"],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );
  }
}

const app = new cdk.App();
new LiftosaurCdkStack(app, "LiftosaurStackDev", true);
new LiftosaurCdkStack(app, "LiftosaurStack", false);

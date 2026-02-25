import * as cdk from "aws-cdk-lib";
import { aws_dynamodb as dynamodb } from "aws-cdk-lib";
import { aws_lambda as lambda } from "aws-cdk-lib";
import { aws_apigateway as apigw } from "aws-cdk-lib";
import { aws_secretsmanager as sm } from "aws-cdk-lib";
import { aws_s3 as s3 } from "aws-cdk-lib";
import { aws_certificatemanager as acm } from "aws-cdk-lib";
import { aws_iam as iam } from "aws-cdk-lib";
import { aws_events, aws_events_targets } from "aws-cdk-lib";
import { aws_cloudfront as cloudfront } from "aws-cdk-lib";
import { aws_cloudfront_origins as origins } from "aws-cdk-lib";
import { aws_s3_deployment as s3Deployment } from "aws-cdk-lib";
import { aws_s3_notifications } from "aws-cdk-lib";
import { aws_codepipeline as codepipeline } from "aws-cdk-lib";
import { aws_codepipeline_actions as codepipeline_actions } from "aws-cdk-lib";
import { aws_codebuild as codebuild } from "aws-cdk-lib";
import { Construct } from "constructs";
import { LftS3Buckets } from "../lambda/dao/buckets";
import childProcess from "child_process";
import localdomain from "../localdomain";

function getCommitHashes(): { commitHash: string; fullCommitHash: string } {
  const commitHash = childProcess.execSync("git rev-parse --short HEAD").toString().trim();
  const fullCommitHash = childProcess.execSync("git rev-parse HEAD").toString().trim();
  return { commitHash, fullCommitHash };
}

export class LiftosaurCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, isDev: boolean, props?: cdk.StackProps) {
    super(scope, id, props);

    const suffix = isDev ? "Dev" : "";
    const env = isDev ? "dev" : "prod";

    const depsLayer = new lambda.LayerVersion(this, `LftNodeDependencies${suffix}`, {
      code: lambda.Code.fromAsset("dist-lambda", {
        bundling: {
          image: lambda.Runtime.NODEJS_24_X.bundlingImage,
          command: [
            "bash",
            "-c",
            "mkdir -p /asset-output/nodejs && cd /asset-output/nodejs && cp /asset-input/{package.json,package-lock.json} . && npm ci && npm install --os=linux --cpu=x64 sharp",
          ],
          environment: { HOME: "/tmp/home" },
        },
      }),
    });

    const usersTable = new dynamodb.Table(this, `LftUsers${suffix}`, {
      tableName: `lftUsers${suffix}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
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
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });
    affiliatesTable.addGlobalSecondaryIndex({
      indexName: `lftAffiliatesUserId${suffix}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const subscriptionDetailsTable = new dynamodb.Table(this, `LftSubscriptionDetails${suffix}`, {
      tableName: `lftSubscriptionDetails${suffix}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });
    subscriptionDetailsTable.addGlobalSecondaryIndex({
      indexName: `lftSubscriptionDetailsOriginalTransactionId${suffix}`,
      partitionKey: { name: "originalTransactionId", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const paymentsTable = new dynamodb.Table(this, `LftPayments${suffix}`, {
      tableName: `lftPayments${suffix}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });
    paymentsTable.addGlobalSecondaryIndex({
      indexName: `lftPaymentsTransactionId${suffix}`,
      partitionKey: { name: "transactionId", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const googleAuthKeysTable = new dynamodb.Table(this, `LftGoogleAuthKeys${suffix}`, {
      tableName: `lftGoogleAuthKeys${suffix}`,
      partitionKey: { name: "token", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    const appleAuthKeysTable = new dynamodb.Table(this, `LftAppleAuthKeys${suffix}`, {
      tableName: `lftAppleAuthKeys${suffix}`,
      partitionKey: { name: "token", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    const historyRecordsTable = new dynamodb.Table(this, `LftHistoryRecords${suffix}`, {
      tableName: `lftHistoryRecords${suffix}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
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
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
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
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
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
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    const programsTable = new dynamodb.Table(this, `LftPrograms${suffix}`, {
      tableName: `lftPrograms${suffix}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    const urlsTable = new dynamodb.Table(this, `LftUrls${suffix}`, {
      tableName: `lftUrls${suffix}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });
    urlsTable.addGlobalSecondaryIndex({
      indexName: `lftUrlsUserId${suffix}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const freeUsersTable = new dynamodb.Table(this, `LftFreeUsers${suffix}`, {
      tableName: `lftFreeUsers${suffix}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    const couponsTable = new dynamodb.Table(this, `LftCoupons${suffix}`, {
      tableName: `lftCoupons${suffix}`,
      partitionKey: { name: "code", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    const debugTable = new dynamodb.Table(this, `LftDebug${suffix}`, {
      tableName: `lftDebug${suffix}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    const eventsTable = new dynamodb.Table(this, `LftEvents${suffix}`, {
      tableName: `lftEvents${suffix}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.NUMBER },
      timeToLiveAttribute: "ttl",
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });
    eventsTable.addGlobalSecondaryIndex({
      indexName: `lftEventsName${suffix}`,
      partitionKey: { name: "name", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const aiLogsTable = new dynamodb.Table(this, `LftAiLogs${suffix}`, {
      tableName: `lftAiLogs${suffix}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: "ttl",
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    const aiMuscleCaches = new dynamodb.Table(this, `LftAiMuscleCaches${suffix}`, {
      tableName: `lftAiMuscleCaches${suffix}`,
      partitionKey: { name: "key", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    // Add GSI for querying by userId
    aiLogsTable.addGlobalSecondaryIndex({
      indexName: "userId-timestamp-index",
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "timestamp", type: dynamodb.AttributeType.NUMBER },
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
      cors: [
        {
          allowedHeaders: ["*"],
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: [
            "http://localhost:3000",
            "https://www.liftosaur.com",
            "https://stage.liftosaur.com",
            `https://${localdomain.main}.liftosaur.com:8080`,
            "liftosaur://www.liftosaur.com",
            "liftosaur://stage.liftosaur.com",
            `liftosaur://${localdomain.main}.liftosaur.com:8080`,
          ],
          maxAge: 3000,
        },
      ],
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

    const assetsBucket = new s3.Bucket(this, `LftS3Assets${suffix}`, {
      bucketName: `${LftS3Buckets.assets}${suffix.toLowerCase()}`,
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
    });

    const userimagesbucket = new s3.Bucket(this, `LftS3UserImages${suffix}`, {
      bucketName: `${LftS3Buckets.userimages}${suffix.toLowerCase()}`,
      cors: [
        {
          allowedHeaders: ["*"],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.HEAD],
          allowedOrigins: [
            "http://localhost:3000",
            "https://www.liftosaur.com",
            "https://stage.liftosaur.com",
            "https://api3.liftosaur.com",
            "https://api3-dev.liftosaur.com",
            `https://${localdomain.main}.liftosaur.com:8080`,
            `https://${localdomain.api}.liftosaur.com:8080`,
            "liftosaur://www.liftosaur.com",
            "liftosaur://stage.liftosaur.com",
            `liftosaur://${localdomain.main}.liftosaur.com:8080`,
          ],
          exposedHeaders: ["ETag"],
          maxAge: 3000,
        },
      ],
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
    });

    const imageResizerFunction = new lambda.Function(this, `LftImageResizer${suffix}`, {
      runtime: lambda.Runtime.NODEJS_24_X,
      code: lambda.Code.fromAsset("dist-lambda"),
      memorySize: 1536,
      layers: [depsLayer],
      timeout: cdk.Duration.seconds(60),
      handler: "lambda/imageResizer.handler",
      environment: {
        IS_DEV: `${isDev}`,
      },
    });

    userimagesbucket.grantReadWrite(imageResizerFunction);
    userimagesbucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new aws_s3_notifications.LambdaDestination(imageResizerFunction),
      { prefix: "user-uploads/" }
    );

    const { commitHash, fullCommitHash } = getCommitHashes();
    const lambdaFunction = new lambda.Function(this, `LftLambda${suffix}`, {
      runtime: lambda.Runtime.NODEJS_24_X,
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
        HOST: isDev ? "https://stage.liftosaur.com" : "https://www.liftosaur.com",
      },
    });

    const statsLambdaFunction = new lambda.Function(this, `LftStatsLambda${suffix}`, {
      runtime: lambda.Runtime.NODEJS_24_X,
      functionName: `LftStatsLambda${suffix}`,
      code: lambda.Code.fromAsset("dist-lambda"),
      memorySize: 2048,
      layers: [depsLayer],
      timeout: cdk.Duration.seconds(900),
      handler: `lambda/run.LftStatsLambda${suffix}`,
      environment: {
        IS_DEV: `${isDev}`,
      },
    });
    const rule = new aws_events.Rule(this, `LftStatsLambdaRule${suffix}`, {
      schedule: aws_events.Schedule.cron({
        minute: "40",
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

    const streamingCert = acm.Certificate.fromCertificateArn(
      this,
      `LftEndpointStreamingCert${suffix}`,
      "arn:aws:acm:us-east-1:366191129585:certificate/8f13a85c-6103-4863-8867-46825961b377"
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

    aiLogsTable.grantReadWriteData(lambdaFunction);
    aiMuscleCaches.grantReadWriteData(lambdaFunction);
    bucket.grantReadWrite(lambdaFunction);
    debugbucket.grantReadWrite(lambdaFunction);
    exceptionsbucket.grantReadWrite(lambdaFunction);
    paymentsTable.grantReadWriteData(lambdaFunction);
    programsBucket.grantReadWrite(lambdaFunction);
    assetsBucket.grantReadWrite(lambdaFunction);
    userimagesbucket.grantReadWrite(lambdaFunction);
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

    // Streaming Lambda for AI conversion
    const streamingLambdaFunction = new lambda.Function(this, `LftStreamingLambda${suffix}`, {
      runtime: lambda.Runtime.NODEJS_24_X,
      functionName: `LftStreamingLambda${suffix}`,
      code: lambda.Code.fromAsset("dist-lambda"),
      memorySize: 1024,
      layers: [depsLayer],
      timeout: cdk.Duration.seconds(300),
      handler: "lambda/run.streamingHandler",
      environment: {
        IS_LOCAL: "false",
        IS_DEV: `${isDev}`,
        COMMIT_HASH: commitHash,
        FULL_COMMIT_HASH: fullCommitHash,
      },
    });

    // Grant necessary permissions
    allSecrets.grantRead(streamingLambdaFunction);
    usersTable.grantReadWriteData(streamingLambdaFunction);
    aiLogsTable.grantReadWriteData(streamingLambdaFunction);

    // Add Lambda Function URL with streaming response
    const functionUrl = streamingLambdaFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE, // Public access
      cors: {
        allowedOrigins: isDev
          ? [
              `https://${localdomain.main}.liftosaur.com:8080`,
              "https://stage.liftosaur.com",
              "https://www.liftosaur.com",
            ]
          : ["https://www.liftosaur.com"],
        allowedMethods: [lambda.HttpMethod.POST],
        allowedHeaders: ["Content-Type", "Cookie"],
        allowCredentials: true,
        maxAge: cdk.Duration.days(1),
      },
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM, // Enable streaming
    });

    // Extract the Lambda Function URL domain
    const functionUrlDomain = cdk.Fn.select(2, cdk.Fn.split("/", functionUrl.url));

    // Create a response headers policy for CORS
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, `LftStreamingResponseHeaders${suffix}`, {
      corsBehavior: {
        accessControlAllowOrigins: isDev
          ? [
              `https://${localdomain.main}.liftosaur.com:8080`,
              "https://stage.liftosaur.com",
              "https://www.liftosaur.com",
            ]
          : ["https://www.liftosaur.com"],
        accessControlAllowHeaders: ["Content-Type", "Cookie"],
        accessControlAllowMethods: ["POST", "OPTIONS"],
        accessControlAllowCredentials: true,
        originOverride: true,
      },
    });

    // Create CloudFront distribution for custom domain
    const streamingDistribution = new cloudfront.Distribution(this, `LftStreamingDistribution${suffix}`, {
      defaultBehavior: {
        origin: new origins.HttpOrigin(functionUrlDomain, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        responseHeadersPolicy,
      },
      domainNames: [`streaming-api${isDev ? "-dev" : ""}.liftosaur.com`],
      certificate: streamingCert,
    });

    // Output the CloudFront distribution domain
    new cdk.CfnOutput(this, `StreamingDistributionDomain${suffix}`, {
      value: streamingDistribution.distributionDomainName,
      description: "CloudFront distribution for streaming endpoint",
    });

    // Output the custom domain
    new cdk.CfnOutput(this, `StreamingCustomDomain${suffix}`, {
      value: `https://streaming-api${isDev ? "-dev" : ""}.liftosaur.com`,
      description: "Custom domain for streaming endpoint (requires DNS setup)",
    });

    // --- Static assets S3 bucket + CloudFront distribution ---

    const staticBucket = new s3.Bucket(this, `LftS3Static${suffix}`, {
      bucketName: `lftstatic${suffix.toLowerCase()}`,
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      websiteIndexDocument: "index.html",
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
    });

    const stripStaticPrefix = new cloudfront.Function(this, `LftStripStaticPrefix${suffix}`, {
      functionName: `LftStripStaticPrefix${suffix}`,
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          event.request.uri = event.request.uri.replace(/^\\/static/, '');
          return event.request;
        }
      `),
    });

    const s3Origin = new origins.S3StaticWebsiteOrigin(staticBucket);

    const addCharset = new cloudfront.Function(this, `LftAddCharset${suffix}`, {
      functionName: `LftAddCharset${suffix}`,
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var resp = event.response;
          var ct = resp.headers['content-type'];
          if (ct && ct.value && ct.value.indexOf('charset') === -1) {
            if (ct.value.indexOf('javascript') !== -1 || ct.value.indexOf('text/') === 0) {
              resp.headers['content-type'] = { value: ct.value + '; charset=utf-8' };
            }
          }
          return resp;
        }
      `),
    });

    const s3CorsPolicy = new cloudfront.ResponseHeadersPolicy(this, `LftS3Cors${suffix}`, {
      corsBehavior: {
        accessControlAllowOrigins: ["*"],
        accessControlAllowHeaders: ["*"],
        accessControlAllowMethods: ["GET", "HEAD"],
        accessControlAllowCredentials: false,
        originOverride: false,
      },
    });

    const s3CachedBehavior: cloudfront.BehaviorOptions = {
      origin: s3Origin,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      responseHeadersPolicy: s3CorsPolicy,
      functionAssociations: [
        {
          function: addCharset,
          eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
        },
      ],
    };

    const mainDomain = isDev ? "stage.liftosaur.com" : "www.liftosaur.com";

    const rewriteUrls = new cloudfront.Function(this, `LftRewriteUrls${suffix}`, {
      functionName: `LftRewriteUrls${suffix}`,
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var uri = event.request.uri;
          if (uri === '/' || uri === '/about') {
            event.request.uri = '/main';
          } else if (uri === '/record') {
            event.request.uri = '/api/record';
          } else if (uri === '/recordimage') {
            event.request.uri = '/api/recordimage';
          } else if (uri.indexOf('/programimage/') === 0) {
            event.request.uri = '/api' + uri;
          } else if (uri === '/app') {
            return { statusCode: 301, statusDescription: 'Moved Permanently', headers: { location: { value: '/app/' } } };
          } else if (uri === '/docs') {
            return { statusCode: 301, statusDescription: 'Moved Permanently', headers: { location: { value: '/blog/docs' } } };
          } else if (uri === '/blog') {
            return { statusCode: 301, statusDescription: 'Moved Permanently', headers: { location: { value: '/blog/' } } };
          }
          return event.request;
        }
      `),
    });

    const externalImagesOrigin = new origins.HttpOrigin("liftosaurimages2.s3-us-west-2.amazonaws.com");
    const userImagesBucket = isDev ? "liftosauruserimagesdev" : "liftosauruserimages";
    const userImagesOrigin = new origins.HttpOrigin(`${userImagesBucket}.s3-us-west-2.amazonaws.com`);

    const stripPathPrefix = new cloudfront.Function(this, `LftStripPathPrefix${suffix}`, {
      functionName: `LftStripPathPrefix${suffix}`,
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          event.request.uri = event.request.uri.replace(/^\\/[^\\/]+/, '');
          return event.request;
        }
      `),
    });

    const programsCacheKey = new cloudfront.Function(this, `LftProgramsCacheKey${suffix}`, {
      functionName: `LftProgramsCacheKey${suffix}`,
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var cookies = event.request.cookies || {};
          var authState = cookies['session'] ? 'yes' : 'no';
          event.request.headers['x-auth-state'] = { value: authState };
          return event.request;
        }
      `),
    });

    const programsCachePolicy = new cloudfront.CachePolicy(this, `LftProgramsCachePolicy${suffix}`, {
      cachePolicyName: `LftProgramsCachePolicy${suffix}`,
      defaultTtl: cdk.Duration.hours(24),
      maxTtl: cdk.Duration.days(7),
      minTtl: cdk.Duration.seconds(0),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList("X-Auth-State"),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
    });

    const mainDistribution = new cloudfront.Distribution(this, `LftMainDistribution${suffix}`, {
      certificate: streamingCert,
      domainNames: [mainDomain],
      defaultBehavior: {
        origin: new origins.HttpOrigin(cdk.Fn.parseDomainName(restApi.url), {
          originPath: `/${restApi.deploymentStage.stageName}`,
        }),
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          {
            function: rewriteUrls,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      additionalBehaviors: {
        "/programs": {
          origin: new origins.HttpOrigin(cdk.Fn.parseDomainName(restApi.url), {
            originPath: `/${restApi.deploymentStage.stageName}`,
          }),
          cachePolicy: programsCachePolicy,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [
            {
              function: programsCacheKey,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
        },
        "/static/*": {
          origin: s3Origin,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [
            {
              function: stripStaticPrefix,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
        },
        "*.js": s3CachedBehavior,
        "*.css": s3CachedBehavior,
        "*.map": s3CachedBehavior,
        "*.html": s3CachedBehavior,
        "*.txt": s3CachedBehavior,
        "*.webmanifest": s3CachedBehavior,
        "*.zip": s3CachedBehavior,
        "*.m4r": s3CachedBehavior,
        "/app/*": s3CachedBehavior,
        "/icons/*": s3CachedBehavior,
        "/fonts/*": s3CachedBehavior,
        "/images/*": s3CachedBehavior,
        "/programdata/*": s3CachedBehavior,
        "/blog/*": s3CachedBehavior,
        "/docs/*": s3CachedBehavior,
        "/.well-known/*": s3CachedBehavior,
        "/externalimages/*": {
          origin: externalImagesOrigin,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [
            {
              function: stripPathPrefix,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
        },
        "/userimages/*": {
          origin: userImagesOrigin,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [
            {
              function: stripPathPrefix,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
        },
      },
    });

    new s3Deployment.BucketDeployment(this, `LftDeployStatic${suffix}`, {
      sources: [s3Deployment.Source.asset("dist")],
      destinationBucket: staticBucket,
      distribution: mainDistribution,
      distributionPaths: ["/*"],
      memoryLimit: 1024,
      ephemeralStorageSize: cdk.Size.mebibytes(1024),
    });

    new cdk.CfnOutput(this, `MainDistributionDomain${suffix}`, {
      value: mainDistribution.distributionDomainName,
      description: "CloudFront distribution domain for main site",
    });
  }
}

class LiftosaurPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, isDev: boolean, props?: cdk.StackProps) {
    super(scope, id, props);

    const suffix = isDev ? "Dev" : "";
    const branch = isDev ? "redesign" : "master";
    const stackName = isDev ? "LiftosaurStackDev" : "LiftosaurStack";

    const sourceOutput = new codepipeline.Artifact();

    const buildProject = new codebuild.PipelineProject(this, `LftBuild${suffix}`, {
      projectName: `LiftosaurBuild${suffix}`,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            "runtime-versions": { nodejs: "22" },
            commands: ["npm ci", "npm install -g aws-cdk"],
          },
          build: {
            commands: [
              ...(isDev ? ["export STAGE=1"] : []),
              "npm run build:prepare",
              "npm run build:lambda",
              `cdk deploy ${stackName} --require-approval never`,
            ],
          },
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
        computeType: codebuild.ComputeType.MEDIUM,
      },
      timeout: cdk.Duration.minutes(30),
    });

    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: ["arn:aws:iam::*:role/cdk-*"],
      })
    );
    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "cloudformation:*",
          "s3:*",
          "lambda:*",
          "iam:*",
          "apigateway:*",
          "dynamodb:*",
          "events:*",
          "cloudfront:*",
          "acm:*",
          "secretsmanager:GetSecretValue",
          "ses:*",
          "ssm:GetParameter",
          "ecr:*",
          "logs:*",
        ],
        resources: ["*"],
      })
    );

    const sourceAction = new codepipeline_actions.CodeStarConnectionsSourceAction({
      actionName: "GitHub",
      connectionArn: "arn:aws:codeconnections:us-west-2:366191129585:connection/818034fa-10b0-45f0-9895-3d7d2b9991fd",
      owner: "astashov",
      repo: "liftosaur",
      branch,
      output: sourceOutput,
      codeBuildCloneOutput: true,
      triggerOnPush: false,
    });

    new codepipeline.Pipeline(this, `LftPipeline${suffix}`, {
      pipelineName: `Liftosaur${suffix}`,
      pipelineType: codepipeline.PipelineType.V2,
      triggers: [
        {
          providerType: codepipeline.ProviderType.CODE_STAR_SOURCE_CONNECTION,
          gitConfiguration: {
            sourceAction,
            pushFilter: [{ branchesIncludes: [branch] }],
          },
        },
      ],
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction],
        },
        {
          stageName: "BuildAndDeploy",
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: "BuildAndDeploy",
              project: buildProject,
              input: sourceOutput,
            }),
          ],
        },
      ],
    });
  }
}

const app = new cdk.App();
new LiftosaurCdkStack(app, "LiftosaurStackDev", true);
new LiftosaurCdkStack(app, "LiftosaurStack", false);
new LiftosaurPipelineStack(app, "LiftosaurPipelineDev", true);
new LiftosaurPipelineStack(app, "LiftosaurPipeline", false);

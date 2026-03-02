import {
  DynamoDBClient,
  DescribeTableCommand,
  DeleteTableCommand,
} from '@aws-sdk/client-dynamodb';
import { S3Client, HeadBucketCommand, GetObjectCommand, waitUntilBucketNotExists, ListObjectVersionsCommand, DeleteObjectsCommand, DeleteBucketCommand } from '@aws-sdk/client-s3';
import { CognitoIdentityProviderClient, DescribeUserPoolCommand, DescribeUserPoolClientCommand } from '@aws-sdk/client-cognito-identity-provider';
import { LambdaClient, GetFunctionCommand, GetLayerVersionByArnCommand, ListLayerVersionsCommand, InvokeCommand, ListEventSourceMappingsCommand } from '@aws-sdk/client-lambda';
import { LexModelBuildingServiceClient, GetBotCommand } from '@aws-sdk/client-lex-model-building-service';
import { RekognitionClient, DescribeCollectionCommand } from '@aws-sdk/client-rekognition';
import { AppSyncClient, GetGraphqlApiCommand } from '@aws-sdk/client-appsync';
import { CloudWatchLogsClient, DescribeLogStreamsCommand, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { CloudWatchEventsClient, ListRuleNamesByTargetCommand } from '@aws-sdk/client-cloudwatch-events';
import { KinesisClient, PutRecordsCommand } from '@aws-sdk/client-kinesis';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { AmplifyBackendClient, CreateBackendConfigCommand, GetBackendJobCommand } from '@aws-sdk/client-amplifybackend';
import _ from 'lodash';
import { getProjectMeta } from './projectMeta';

export const getDDBTable = async (tableName: string, region: string) => {
  const service = new DynamoDBClient({ region });
  return await service.send(new DescribeTableCommand({ TableName: tableName }));
};

export const checkIfBucketExists = async (bucketName: string, region: string) => {
  const s3Client = new S3Client({ region });
  return await s3Client.send(new HeadBucketCommand({ Bucket: bucketName}));
};

export const bucketNotExists = async (bucket: string) => {
  const s3 = new S3Client({});
  try {
    await waitUntilBucketNotExists({ client: s3, maxWaitTime: 300 }, { Bucket: bucket });
    return true;
  } catch (error) {
    if (error.state === 'SUCCESS') {
      return true;
    }
    throw error;
  }
};

export const getDeploymentBucketObject = async (projectRoot: string, objectKey: string) => {
  const meta = getProjectMeta(projectRoot);
  const deploymentBucket = meta.providers.awscloudformation.DeploymentBucketName;
  const s3 = new S3Client({});
  const command = new GetObjectCommand({
    Bucket: deploymentBucket,
    Key: objectKey,
  });
  const result = await s3.send(command);
  const bodyString = await result.Body.transformToString();
  return bodyString;
};

export const deleteS3Bucket = async (bucket: string, providedS3Client: S3Client | undefined = undefined) => {
  const s3 = providedS3Client ? providedS3Client : new S3Client({});
  let continuationToken: { KeyMarker?: string; VersionIdMarker?: string } = undefined;
  const objectKeyAndVersion: { Key: string; VersionId: string }[] = [];
  let truncated = false;
  do {
    const command = new ListObjectVersionsCommand({
      Bucket: bucket,
      ...continuationToken,
    });
    const results = await s3.send(command);

    results.Versions?.forEach(({ Key, VersionId }) => {
      objectKeyAndVersion.push({ Key, VersionId });
    });

    results.DeleteMarkers?.forEach(({ Key, VersionId }) => {
      objectKeyAndVersion.push({ Key, VersionId });
    });

    continuationToken = { KeyMarker: results.NextKeyMarker, VersionIdMarker: results.NextVersionIdMarker };
    truncated = results.IsTruncated;
  } while (truncated);
  const chunkedResult = _.chunk(objectKeyAndVersion, 1000);
  const deleteReq = chunkedResult
    .map(r => {
      return {
        Bucket: bucket,
        Delete: {
          Objects: r,
          Quiet: true,
        },
      };
    })
    .map(delParams => {
      const deleteCommand = new DeleteObjectsCommand(delParams);
      return s3.send(deleteCommand);
    });
  await Promise.all(deleteReq);
  const deleteBucketCommand = new DeleteBucketCommand({ Bucket: bucket });
  await s3.send(deleteBucketCommand);
  await bucketNotExists(bucket);
};

export const getUserPool = async (userpoolId, region) => {
  let res;
  try {
    const client = new CognitoIdentityProviderClient({ region });
    res = await client.send(new DescribeUserPoolCommand({ UserPoolId: userpoolId }));
  } catch (e) {
    console.log(e);
  }
  return res;
};

export const getLambdaFunction = async (functionName, region) => {
  const lambda = new LambdaClient({ region });
  let res;
  try {
    res = await lambda.send(new GetFunctionCommand({ FunctionName: functionName }));
  } catch (e) {
    console.log(e);
  }
  return res;
};

export const getUserPoolClients = async (userPoolId: string, clientIds: string[], region: string) => {
  const provider = new CognitoIdentityProviderClient({ region });
  const res = [];
  try {
    for (let i = 0; i < clientIds.length; i++) {
      const clientData = await provider.send(new DescribeUserPoolClientCommand({
        UserPoolId: userPoolId,
        ClientId: clientIds[i],
      }));
      res.push(clientData);
    }
  } catch (e) {
    console.log(e);
  }
  return res;
};

export const getBot = async (botName: string, region: string) => {
  const service = new LexModelBuildingServiceClient({ region });
  return await service.send(new GetBotCommand({ name: botName, versionOrAlias: '$LATEST' }));
};

export const getFunction = async (functionName: string, region: string) => {
  const service = new LambdaClient({ region });
  return await service.send(new GetFunctionCommand({ FunctionName: functionName }));
};

export const getLayerVersion = async (functionArn: string, region: string) => {
  const service = new LambdaClient({ region });
  return await service.send(new GetLayerVersionByArnCommand({ Arn: functionArn }));
};

export const listVersions = async (layerName: string, region: string) => {
  const service = new LambdaClient({ region });
  return await service.send(new ListLayerVersionsCommand({ LayerName: layerName }));
};

export const invokeFunction = async (functionName: string, payload: string, region: string) => {
  const service = new LambdaClient({ region });
  return await service.send(new InvokeCommand({ FunctionName: functionName, Payload: payload }));
};

export const getCollection = async (collectionId: string, region: string) => {
  const service = new RekognitionClient({ region });
  return await service.send(new DescribeCollectionCommand({ CollectionId: collectionId }));
};

export const getTable = async (tableName: string, region: string) => {
  const service = new DynamoDBClient({ region });
  return await service.send(new DescribeTableCommand({ TableName: tableName }));
};

export const getEventSourceMappings = async (functionName: string, region: string) => {
  const service = new LambdaClient({ region });
  return (await service.send(new ListEventSourceMappingsCommand({ FunctionName: functionName }))).EventSourceMappings;
};

export const deleteTable = async (tableName: string, region: string) => {
  const service = new DynamoDBClient({ region });
  return await service.send(new DeleteTableCommand({ TableName: tableName }));
};

export const getAppSyncApi = async (appSyncApiId: string, region: string) => {
  const service = new AppSyncClient({ region });
  return await service.send(new GetGraphqlApiCommand({ apiId: appSyncApiId }));
};

export const getCloudWatchLogs = async (region: string, logGroupName: string, logStreamName: string | undefined = undefined) => {
  const cloudwatchlogs = new CloudWatchLogsClient({ region });

  let targetStreamName = logStreamName;
  if (targetStreamName === undefined) {
    const describeStreamsResp = await cloudwatchlogs.send(new DescribeLogStreamsCommand({
      logGroupName,
      descending: true,
      orderBy: 'LastEventTime'
    }));
    if (describeStreamsResp.logStreams === undefined || describeStreamsResp.logStreams.length == 0) {
      return [];
    }

    targetStreamName = describeStreamsResp.logStreams[0].logStreamName;
  }

  const logsResp = await cloudwatchlogs.send(new GetLogEventsCommand({ logGroupName, logStreamName: targetStreamName }));
  return logsResp.events || [];
};

export const describeCloudFormationStack = async (stackName: string, region: string, profileConfig?: any) => {
  const service = profileConfig ? new CloudFormationClient(profileConfig) : new CloudFormationClient({ region });
  return (await service.send(new DescribeStacksCommand({ StackName: stackName }))).Stacks.find(
    stack => stack.StackName === stackName || stack.StackId === stackName,
  );
};

export const putKinesisRecords = async (data: string, partitionKey: string, streamName: string, region: string) => {
  const kinesis = new KinesisClient({ region });

  return await kinesis.send(new PutRecordsCommand({
    Records: [
      {
        Data: new Uint8Array(Buffer.from(data)),
        PartitionKey: partitionKey,
      },
    ],
    StreamName: streamName,
  }));
};

export const getCloudWatchEventRule = async (targetName: string, region: string) => {
  const service = new CloudWatchEventsClient({ region });
  var params = {
    TargetArn: targetName /* required */,
  };
  let ruleName;
  try {
    ruleName = await service.send(new ListRuleNamesByTargetCommand(params));
  } catch (e) {
    console.log(e);
  }
  return ruleName;
};

export const setupAmplifyAdminUI = async (appId: string, region: string) => {
  const amplifyBackend = new AmplifyBackendClient({ region });

  return await amplifyBackend.send(new CreateBackendConfigCommand({ AppId: appId }));
};

export const getAmplifyBackendJobStatus = async (jobId: string, appId: string, envName: string, region: string) => {
  const amplifyBackend = new AmplifyBackendClient({ region });

  return await amplifyBackend.send(new GetBackendJobCommand({
    JobId: jobId,
    AppId: appId,
    BackendEnvironmentName: envName,
  }));
};

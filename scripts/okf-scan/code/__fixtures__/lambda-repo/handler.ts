import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const ddb = new DynamoDBClient({});
const sqs = new SQSClient({});

export const handler = async (event: unknown) => {
  await ddb.send(new PutItemCommand({ TableName: process.env.ORDERS_TABLE, Item: {} }));
  await sqs.send(new SendMessageCommand({ QueueUrl: "https://literal-queue-url", MessageBody: "hi" }));
  return { statusCode: 200 };
};

import { GetQueueUrlCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "./sqsClient"
import { SQSError } from "../errors";
// Set the parameters
const params = { QueueName: "video-processing-queue.fifo" };
const command = new GetQueueUrlCommand(params);

export const getQueueURL = async () => {
  const data = await sqsClient.send(command).catch(() => {
    throw new SQSError("Error getting queue URL", "EMPTY_QUEUE_URL");
  })

  if (!data?.QueueUrl) {
    throw new SQSError("Error getting queue URL", "EMPTY_QUEUE_URL");
  }

  return data;
};

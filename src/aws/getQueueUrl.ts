import { GetQueueUrlCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "./sqsClient"

// Set the parameters
const params = { QueueName: "video-processing-queue.fifo" };

export const getQueueURL = async () => {
  try {
    const data = await sqsClient.send(new GetQueueUrlCommand(params));
    return data;
  } catch (err) {
    console.log("Error", err);
  }
};

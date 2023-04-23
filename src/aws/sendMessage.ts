import { SendMessageCommandInput, SendMessageCommand } from "@aws-sdk/client-sqs";
import { getQueueURL } from "./getQueueUrl";
import { sqsClient } from "./sqsClient";

export async function sendMessage(messageParams: SendMessageCommandInput) {
  const data = await sqsClient.send(new SendMessageCommand(messageParams));
  return data;
}
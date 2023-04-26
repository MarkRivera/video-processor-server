import { SendMessageCommandInput, SendMessageCommand } from "@aws-sdk/client-sqs";
import { getQueueURL } from "./getQueueUrl";

import { randomUUID } from "crypto";
import { sqsClient } from "./sqsClient";
import { SQSError } from "../errors";

function generateMessageParams(queueUrl: string, videoData: Record<string, any>): SendMessageCommandInput {
  return {
    MessageAttributes: {
      FileName: {
        DataType: "String",
        StringValue: videoData.filename
      },

      Document: {
        DataType: "String",
        StringValue: JSON.stringify(videoData)
      }
    },

    MessageBody: "Video Sent by Video Server",
    QueueUrl: queueUrl,
    MessageDeduplicationId: randomUUID(),
    MessageGroupId: videoData.filename
  };
}

export async function sendMessage(tmpFileName: string, document: Record<string, any>) {
  const queueUrlData = await getQueueURL();

  const videoData = {
    filename: tmpFileName,
    ...document
  };

  const url = queueUrlData.QueueUrl as string; // NOTE: The thrown errors are handled in the caller function and should protect against an undefined QueueUrl
  const messageParams = generateMessageParams(url, videoData)

  const data = await sqsClient.send(new SendMessageCommand(messageParams)).catch((error) => {
    throw new SQSError('Error sending message to SQS', 'SQS_SEND_MESSAGE', { error })
  });

  return data;
}
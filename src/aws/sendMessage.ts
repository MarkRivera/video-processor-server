import { SendMessageCommandInput, SendMessageCommand } from "@aws-sdk/client-sqs";
import { getQueueURL } from "./getQueueUrl";

import { randomUUID } from "crypto";
import { sqsClient } from "./sqsClient";

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

  if (!queueUrlData?.QueueUrl) {
    // TODO: Handle gracefully, user shouldn't lose their video upload because of an error here, maybe retry a few times before deleting  
    return { msg: "There was an error with sending this video to a queue" }
  }

  const videoData = {
    filename: tmpFileName,
    ...document
  };

  const url = queueUrlData.QueueUrl
  const messageParams = generateMessageParams(url, videoData)

  const data = await sqsClient.send(new SendMessageCommand(messageParams));
  return data;
}
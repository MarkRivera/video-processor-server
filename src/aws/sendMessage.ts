import { SendMessageCommandInput, SendMessageCommand } from "@aws-sdk/client-sqs";
import { getQueueURL } from "./getQueueUrl";
import { sqsClient } from "./sqsClient";
import { deleteFile, getBucket } from "../db/gridfs";
import { ObjectId } from "mongodb";
import { randomUUID } from "crypto";

function generateMessageParams(queueUrl: string, videoData: {
  filename: string;
  video_id: ObjectId;
}): SendMessageCommandInput {
  return {
    MessageAttributes: {
      FileName: {
        DataType: "String",
        StringValue: videoData.filename
      },

      ObjectId: {
        DataType: "String",
        StringValue: videoData.video_id.toString()
      }
    },

    MessageBody: "Video Sent by Video Server",
    QueueUrl: queueUrl,
    MessageDeduplicationId: randomUUID(),
    MessageGroupId: videoData.video_id.toString()
  };
}

export async function sendMessage(video_id: ObjectId, filename: string) {
  const queueUrlData = await getQueueURL();


  if (!queueUrlData?.QueueUrl) {
    // TODO: Handle gracefully, user shouldn't lose their video upload because of an error here, maybe retry a few times before deleting  
    const bucket = await getBucket()
    await deleteFile(video_id, bucket);
    return { msg: "There was an error with sending this video to a queue" }
  }

  const videoData = {
    filename,
    video_id,
  };

  const url = queueUrlData.QueueUrl
  const messageParams = generateMessageParams(url, videoData)

  // const data = await sqsClient.send(new SendMessageCommand(messageParams));
  // return data;
}
import * as dotenv from 'dotenv'
dotenv.config();

import { RedisService } from '../redis/RedisService';
import { ConsumeMessage } from "amqplib";
import { TaskQueue } from "./connect";
import { uploadMutlipartToRawS3Bucket } from "../aws/s3/upload";
import { updateData, uploadData } from '../db/db';
import { sendMessage } from '../aws/sendMessage';
import { ObjectId } from 'mongodb';

type Message = {
  tmpFileName: string;
  isLastChunk: boolean;
  chunk: string;
  totalChunks: string;
  currentChunk: string;
  upload_id: string;
}

const idCache: Record<string, ObjectId> = {};

async function consumeMessage(msg: ConsumeMessage | null) {
  const cacheClient = await RedisService.initClient();
  await cacheClient.connect();

  const queueChannel = await TaskQueue.getChannel();
  if (!msg) {
    return;
  };
  const data = Buffer.from(msg.content).toString();
  const message: Message = JSON.parse(data);
  const { isLastChunk, tmpFileName, chunk, currentChunk, totalChunks, upload_id } = message;

  const document = {
    tmpFileName,
    upload_id,
    totalChunks,
    progress: 0
  }

  await cacheClient.hSet(tmpFileName, {
    id: "",
    tmpFileName,
    upload_id,
    totalChunks,
  });

  let fileCache = await cacheClient.hGetAll(tmpFileName);
  const buffer = Buffer.from(chunk, "base64");
  const isFirstChunk = parseInt(currentChunk) === 0;



  try {
    if (!fileCache["id"] && isFirstChunk) {
      let _id = await uploadData(document);
      await cacheClient.hSet(tmpFileName, {
        id: _id.toString()
      })
    }

    const { ETag, PartNumber } = await uploadMutlipartToRawS3Bucket(tmpFileName, buffer, parseInt(currentChunk), isLastChunk, upload_id) // Upload to S3 bucket in chunks
    cacheClient.hSet(ETag, { ETag, PartNumber });
    fileCache[""]

    if (fileCache["id"]) {
      const _id = new ObjectId(fileCache["id"])
      await updateData(_id);
    }

    if (isLastChunk) {
      delete idCache[tmpFileName];
      // await sendMessage(tmpFileName, document)
    }
  } catch (error) {
    console.error(error)
  }

  queueChannel.ack(msg)
}

async function receiveRabbitMessage() {
  console.log("Waiting to consume messages")
  const queueChannel = await TaskQueue.getChannel();
  await TaskQueue.getOrCreateQueue("S3 Rabbit Queue");

  queueChannel.consume(
    "S3 Rabbit Queue",
    consumeMessage,
    {
      noAck: false
    });
}

receiveRabbitMessage()
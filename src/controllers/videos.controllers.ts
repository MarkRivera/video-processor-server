import { FastifyReply, FastifyRequest } from 'fastify';
import { UUID, randomUUID } from 'crypto';
import { createOrGetGridFS, deleteFile, downloadMetadata, downloadMetadataById, upload } from '../db/gridfs';
import { ObjectId } from 'mongodb';
import { Multipart } from '@fastify/multipart';
import { SendMessageCommandInput } from '@aws-sdk/client-sqs';
import { getQueueURL } from '../aws/getQueueUrl';
import { sendMessage } from '../aws/sendMessage';

type FileChunks = Record<UUID, Buffer[]>;
const chunks: FileChunks = {};
interface CreateVideoBody {
  chunkIndex: string;
  totalChunks: string;
  uuid: UUID;
}

async function uploadToBucket(bufferList: Buffer[], filename: string, uuid: UUID): Promise<ObjectId> {
  const completeFileBuffer = Buffer.concat(bufferList);
  const bucket = await getBucket();
  const video_id = upload(bucket, completeFileBuffer, filename || "File", {
    uuid
  })

  bufferList.length = 0;
  bufferList = []

  return video_id;
}

export async function getVideosMetadata() {
  try {
    const bucket = await getBucket();
    const videos = await downloadMetadata(bucket);
    return videos;
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message || "Encountered trouble getting videos!";
      console.error(message)
    }
  }
}

export async function getSingleVideoMetadata(req: any, res: any) {
  try {
    const id = req.params.id;
    const isValidId = ObjectId.isValid(id)
    if (isValidId) {
      const bucket = await getBucket();
      const videos = await downloadMetadataById(new ObjectId(id), bucket);

      return videos.shift() || { msg: "Sorry, no video found" };
    } else {
      throw new Error("Invalid Id!")
    }
  } catch (error) {
    console.error("Having trouble getting 1 video!", error)
    return { msg: "Looks like your Id was invalid!" }
  }
}

function generateMessageParams(queueUrl: string, videoData: {
  filename: string;
  id: ObjectId;
  uuid: UUID;
}): SendMessageCommandInput {
  console.log(videoData.id.toString())
  return {
    MessageAttributes: {
      FileName: {
        DataType: "String",
        StringValue: videoData.filename
      },

      ObjectId: {
        DataType: "String",
        StringValue: videoData.id.toString()
      }
    },
    MessageBody: "Video Sent by Video Server",
    QueueUrl: queueUrl,
    MessageDeduplicationId: randomUUID(),
    MessageGroupId: videoData.uuid
  };
}

export async function createVideo(req: FastifyRequest<{ Body: CreateVideoBody }>, res: FastifyReply) {
  let data = req.parts();
  const parts = await createPartsObject(data); // Possibly slow, lets test it later
  const { uuid, chunk, totalChunks, chunkIndex, filename } = parts;

  chunks[uuid] = [];
  let bufferList = chunks[uuid];
  bufferList.push(chunk)

  if (isLastChunk(chunkIndex, totalChunks)) {
    const video_id = await uploadToBucket(bufferList, filename, uuid);
    delete chunks[uuid];
    const queueUrlData = await getQueueURL();

    if (!queueUrlData?.QueueUrl) {
      // TODO: Handle gracefully, user shouldn't lose their video upload because of an error here, maybe retry a few times before deleting  
      const bucket = await getBucket()
      await deleteFile(new ObjectId(video_id), bucket);
      return { msg: "There was an error with sending this video to a queue" }
    }

    const videoData = {
      filename,
      id: video_id,
      uuid
    };
    const url = queueUrlData.QueueUrl
    const messageParams = generateMessageParams(url, videoData)

    await sendMessage(messageParams);

    return { msg: "Completed video upload", video_id };
  }
}

export async function deleteVideo(req: any, res: any) {
  try {
    const id = req.params.id;
    const isValidId = ObjectId.isValid(id)

    if (isValidId) {
      const bucket = await getBucket();
      await deleteFile(new ObjectId(id), bucket)
    } else {
      throw new Error("Invalid Id!")
    }

    return { msg: "File deletion successful!" }
  } catch (error) {
    console.error("Encountered error while deleting!", error)
    return { msg: "Sorry, there was en error while deleting!" }
  }
}

// UTIL

function isLastChunk(chunkIndex: number, totalChunks: number): boolean {
  return chunkIndex === totalChunks - 1;
}

async function createPartsObject(data: AsyncIterableIterator<Multipart>) {
  const parts: Record<string, any> = {};

  for await (const part of data) {
    if (part.type === 'file') {
      part.file.on('data', (chunk) => {
        parts.chunk = chunk
      })

      part.file.on('error', (err) => { throw err })
    }

    else if (part.fieldname === 'uuid') {
      parts.uuid = part.value
    }

    else if (part.fieldname === "filename") {
      parts.filename = part.value
    }

    else {
      let value = parseInt(part.value as string);
      let fieldname = part.fieldname;
      parts[fieldname] = value;
    }
  }

  return parts;
}

const getBucket = async () => {
  const bucket = await createOrGetGridFS();
  if (!bucket) {
    throw new Error("Trouble getting bucket!")
  }

  return bucket;
}
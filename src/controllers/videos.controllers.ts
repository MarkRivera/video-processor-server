import { FastifyReply, FastifyRequest } from 'fastify';
import { UUID } from 'crypto';
import fs from 'fs';
import db from '../db/connect';
import { createOrGetGridFS, deleteFile, downloadMetadata, downloadMetadataById, upload } from '../db/gridfs';
import { ObjectId } from 'mongodb';


const getBucket = async () => {
  const bucket = await createOrGetGridFS();
  if (!bucket) {
    throw new Error("Trouble getting bucket!")
  }

  return bucket;
}

type FileChunks = Record<UUID, Buffer[]>;
const chunks: FileChunks = {};

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
      const video = await downloadMetadataById(new ObjectId(id), bucket);
      return video;
    } else {
      throw new Error("Invalid Id!")
    }
  } catch (error) {
    console.error("Having trouble getting 1 video!", error)
  }
}

interface CreateVideoBody {
  chunkIndex: string;
  totalChunks: string;
  uuid: UUID;
}

function isLastChunk(chunkIndex: number, totalChunks: number): boolean {
  return chunkIndex === totalChunks - 1;
}

export async function createVideo(req: FastifyRequest<{ Body: CreateVideoBody }>, res: FastifyReply) {
  let data = req.parts();
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

  const { uuid, chunk, totalChunks, chunkIndex, filename } = parts;

  chunks[uuid] = [];
  let bufferList = chunks[uuid];
  bufferList.push(chunk)

  if (isLastChunk(chunkIndex, totalChunks)) {
    const completeFileBuffer = Buffer.concat(bufferList);

    console.log({ chunks })
    const bucket = await getBucket();
    const video_id = upload(bucket, completeFileBuffer, filename || "Test", {
      uuid
    })

    bufferList.length = 0;
    bufferList = []
    delete chunks[uuid];
    return { msg: "Completed video upload", video_id }
  }

  return { msg: "Expected a completed video but is here instead" }
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
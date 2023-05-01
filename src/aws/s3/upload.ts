import { s3Client } from "./s3";
import { PutObjectCommand, CreateMultipartUploadCommand, CompleteMultipartUploadCommand, UploadPartCommand, AbortMultipartUploadCommand, CompletedPart } from "@aws-sdk/client-s3";
import { EnvError, MultipartChunkUploadError } from "../../errors";

let etags: {
  ETag: string,
  PartNumber: number,
}[] = [];

export async function createMultipartUpload(filename: string) {
  if (!process.env.BUCKET_NAME_RAW) {
    throw new EnvError('Missing BUCKET_NAME_RAW env variable');
  }

  const command = new CreateMultipartUploadCommand({
    Bucket: process.env.BUCKET_NAME_RAW,
    Key: filename,
  })

  return s3Client.send(command).catch(() => {
    throw new MultipartChunkUploadError('Error creating multipart upload', 'MULTIPART_CHUNK_INIT')
  })
}

export async function uploadParts(buffer: Buffer, uploadId: string, chunkNumber: number, filename: string) {
  const command = new UploadPartCommand({
    Bucket: process.env.BUCKET_NAME_RAW,
    Key: filename,
    UploadId: uploadId,
    Body: buffer,
    PartNumber: chunkNumber + 1, // Must be between 1 and 10000
  })

  return s3Client.send(command).catch(() => {
    throw new MultipartChunkUploadError('Error Uploading Part', 'MUTLIPART_CHUNK_UPLOAD', { uploadId, filename });
  })
}

export async function abortMultipartUpload(filename: string, uploadId: string) {
  const command = new AbortMultipartUploadCommand({
    Bucket: process.env.BUCKET_NAME_RAW,
    Key: filename,
    UploadId: uploadId,
  })

  return s3Client.send(command).catch(() => {
    throw new MultipartChunkUploadError('Error aborting multipart upload', 'MULTIPART_CHUNK_ABORT', { uploadId, filename })
  })
}

export async function closeMultipartUpload(tmpFilename: string, uploadId: string, etags: CompletedPart[]) {
  const command = new CompleteMultipartUploadCommand({
    Bucket: process.env.BUCKET_NAME_RAW,
    Key: tmpFilename,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: etags.map((data, idx) => {
        return {
          ETag: data.ETag,
          PartNumber: idx + 1,
        }
      })
    }
  })

  etags = [];
  return s3Client.send(command).catch((err) => {
    throw new MultipartChunkUploadError('Error completing multipart upload', 'MULTIPART_CHUNK_COMPLETE', { uploadId, filename: tmpFilename })
  })
}

export async function uploadMutlipartToRawS3Bucket(tmpFilename: string, chunk: Buffer, chunkNumber: number, isLastChunk: boolean, upload_id: string) {
  const data = await uploadParts(chunk, upload_id, chunkNumber, tmpFilename);

  return {
    ETag: data.ETag as string,
    PartNumber: chunkNumber + 1,
  }
  etags.push(
    {
      ETag: data.ETag as string,
      PartNumber: chunkNumber + 1,
    }
  )

  if (isLastChunk) {
    await closeMultipartUpload(tmpFilename, upload_id, etags)
    etags = []
  }
}

export async function uploadToRawS3Bucket(filename: string, buffer: Buffer) {
  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME_RAW,
    Key: filename,
    Body: buffer,
  })

  try {
    return s3Client.send(command)
  } catch (error) {
    console.error(error)
    throw new Error('Error uploading to S3')
  }
}
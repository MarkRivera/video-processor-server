import { s3Client } from "./s3";
import { PutObjectCommand, CreateMultipartUploadCommand, CompleteMultipartUploadCommand, UploadPartCommand, AbortMultipartUploadCommand, CompletedPart } from "@aws-sdk/client-s3";

let etags: {
  ETag: string,
  PartNumber: number,
}[] = [];

export async function createMultipartUpload(filename: string) {
  if (!process.env.BUCKET_NAME_RAW) {
    throw new Error('Missing BUCKET_NAME_RAW env variable');
  }

  const command = new CreateMultipartUploadCommand({
    Bucket: process.env.BUCKET_NAME_RAW,
    Key: filename,
  })

  try {
    return await s3Client.send(command)
  }
  catch (error) {
    console.error(error)
    throw new Error('Error creating multipart upload')
  }
}

export async function uploadParts(buffer: Buffer, uploadId: string, chunkNumber: number, filename: string) {
  const command = new UploadPartCommand({
    Bucket: process.env.BUCKET_NAME_RAW,
    Key: filename,
    UploadId: uploadId,
    Body: buffer,
    PartNumber: chunkNumber + 1, // Must be between 1 and 10000
  })

  try {
    return await s3Client.send(command)
  } catch (error) {
    console.error(error)
    if (error instanceof Error) throw error;
  }
}

export async function abortMultipartUpload(filename: string, uploadId: string) {
  const command = new AbortMultipartUploadCommand({
    Bucket: process.env.BUCKET_NAME_RAW,
    Key: filename,
    UploadId: uploadId,
  })

  try {
    return await s3Client.send(command)
  } catch (error) {
    console.error(error)
    throw new Error('Error aborting multipart upload')
  }
}

export async function closeMultipartUpload(filename: string, uploadId: string, etags: CompletedPart[]) {
  const command = new CompleteMultipartUploadCommand({
    Bucket: process.env.BUCKET_NAME_RAW,
    Key: filename,
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

  try {
    const res = await s3Client.send(command)
    etags = []
    return res;
  } catch (error) {
    console.error(error)
    throw new Error('Error closing multipart upload')
  }
}

export async function uploadMutlipartToRawS3Bucket(filename: string, chunk: Buffer, chunkNumber: number, isLastChunk: boolean, upload_id: string) {
  if (!upload_id) {
    throw new Error('Upload ID is missing!')
  }

  try {
    const data = await uploadParts(chunk, upload_id, chunkNumber, filename);
    if (!data) throw new Error('Error uploading last chunk')

    etags.push(
      {
        ETag: data.ETag?.replace(/^"|"$/g, "") as string, // Remove quotes from ETag
        PartNumber: chunkNumber + 1,
      }
    )

    if (isLastChunk) {
      await closeMultipartUpload(filename, upload_id, etags) // Might not need to await this
      etags = []
    }
  } catch (error) {
    console.error(error)
    if (error instanceof Error) throw new Error(error.message)
  }
}

export async function uploadToRawS3Bucket(filename: string, buffer: Buffer) {
  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME_RAW,
    Key: filename,
    Body: buffer,
  })

  try {
    return await s3Client.send(command)
  } catch (error) {
    console.error(error)
    throw new Error('Error uploading to S3')
  }
}
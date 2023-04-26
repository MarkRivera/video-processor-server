import { s3Client } from "./s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function downloadFile(filename: string) {
  if (!process.env.BUCKET_NAME_RAW) {
    throw new Error('Missing BUCKET_NAME_RAW env variable');
  }

  const command = new GetObjectCommand({
    Bucket: process.env.BUCKET_NAME_RAW,
    Key: filename,
  })

  try {
    return await s3Client.send(command)
  }
  catch (error) {
    console.error(error)
    throw new Error('Error downloading file')
  }
}
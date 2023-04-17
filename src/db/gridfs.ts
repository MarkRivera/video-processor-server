import { createReadStream } from "fs";
import { Readable } from "stream";
import db from "./connect";
import { GridFSBucket, ObjectId } from "mongodb";

export async function createOrGetGridFS() {
  try {
    const client = await db();
    const selectedDB = client.db("user-videos");
    return new GridFSBucket(selectedDB, { bucketName: "videos-bucket" });

  } catch (err) {
    // TODO: Handle Err
    console.error("Something went wrong creating or getting GridFS", err)
  }
}

export function upload(bucket: GridFSBucket, buffer: Buffer, filename: string, metadata: Record<string, any> = {}) {
  const readableStreamBuffer = Readable.from(buffer);

  const stream = readableStreamBuffer
    .pipe(bucket.openUploadStream(filename, {
      chunkSizeBytes: 1048576,
      metadata
    }))
    .addListener('error', (err) => {
      // TODO: Handle Error
      console.error("Something went wrong with uploading to the bucket!", err)
    })

  return stream.id;
};

export async function downloadMetadataById(_id: ObjectId, bucket: GridFSBucket) {
  const cursor = bucket.find({
    _id
  })
  const data = await cursor.toArray()
  cursor.close();
  return data
}

export async function downloadMetadata(bucket: GridFSBucket) {
  const cursor = bucket.find({});
  const data = await cursor.toArray();
  cursor.close();
  return data;
}

export async function downloadFileData(_id: ObjectId, bucket: GridFSBucket) {
  const stream = bucket.openDownloadStream(_id)
  return stream;
}

export async function deleteFile(_id: ObjectId, bucket: GridFSBucket) {
  try {
    await bucket.delete(_id)
  } catch (error) {
    // TODO: Handle Error
    console.error("Something went wrong with deleting a file!", error)
  }
};

export async function deleteBucket(bucket: GridFSBucket) {
  try {
    bucket.drop();
  } catch (error) {
    // TODO: Handle Error
    console.error("Something went wrong with deleting the bucket!", error)
  }
};

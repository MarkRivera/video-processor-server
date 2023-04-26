import db from "./connect";
import { GridFSBucket, ObjectId } from "mongodb";
import { createReadStream } from "fs";

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

export const getBucket = async () => {
  const bucket = await createOrGetGridFS();
  if (!bucket) {
    throw new Error("Trouble getting bucket!")
  }

  return bucket;
}

export function upload(bucket: GridFSBucket, tmpFileName: string, metadata: Record<string, any> = {}) {
  return createReadStream('./tmp/' + tmpFileName)
    .pipe(bucket.openUploadStream(metadata.filename, {
      chunkSizeBytes: 1048576,
      metadata
    }))
};

export async function uploadToBucket(finalFileName: string, metadata: Record<string, any>): Promise<ObjectId> {
  const bucket = await createOrGetGridFS();
  if (!bucket) {
    throw new Error("Could not get bucket!")
  }

  const { name, type, size, totalChunks } = metadata;
  const readStream = upload(bucket, finalFileName, {
    filename: name,
    tmpFilename: finalFileName,
    type,
    size: parseInt(size),
    totalChunks: parseInt(totalChunks)
  })

  readStream.on("error", (error) => {
    // Gracefully handle error
    console.error(error);
  })

  return readStream.id;
}

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

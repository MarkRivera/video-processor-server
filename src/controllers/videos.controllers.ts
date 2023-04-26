import { deleteFile, downloadMetadata, downloadMetadataById, getBucket } from '../db/gridfs';
import { ObjectId } from 'mongodb';

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
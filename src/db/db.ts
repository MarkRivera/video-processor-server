import { ObjectId } from "mongodb";
import { DatabaseError } from "../errors";
import connection from "./connect";

function getClient() {
  return connection().catch(() => {
    throw new DatabaseError("Error connecting to database", "DATABASE_CONNECTION");
  });
}

export async function uploadData(data: Record<string, any>) {
  const client = await getClient();
  const result = await client
    .db("user-videos")
    .collection("videos").insertOne(data)
    .catch(() => {
      throw new DatabaseError("Error uploading data to database", "DATABASE_UPLOAD");
    });

  return result.insertedId;
}

export async function getVideoData(video_id: ObjectId) {
  const client = await getClient();

  return client.db("user-videos").collection("videos").findOne({
    _id: video_id
  }).catch(() => {
    throw new DatabaseError("Error querying database", "DATABASE_QUERY");
  });
}

export async function updateData(video_id: ObjectId) {
  const client = await getClient();
  const videoData = await getVideoData(video_id);
  if (!videoData) {
    return
  }

  return client.db("user-videos").collection("videos").updateOne({ _id: video_id }, {
    $set: {
      progress: videoData.progress + 1
    }
  });
}
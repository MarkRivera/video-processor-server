import { DatabaseError } from "../errors";
import connection from "./connect";

export async function uploadData(data: Record<string, any>) {
  const client = await connection().catch(() => {
    throw new DatabaseError("Error connecting to database", "DATABASE_CONNECTION");
  });

  return await client.db("user-videos").collection("videos").insertOne(data).catch(() => {
    throw new DatabaseError("Error uploading data to database", "DATABASE_UPLOAD");
  });
}

export async function getVideoData(video_id: string) {
  const client = await connection().catch(() => {
    throw new DatabaseError("Error connecting to database", "DATABASE_CONNECTION");
  });

  return await client.db("user-videos").collection("videos").findOne({ video_id }).catch(() => {
    throw new DatabaseError("Error querying database", "DATABASE_QUERY");
  });
}
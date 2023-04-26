import connection from "./connect";

export async function uploadData(data: Record<string, any>) {
  const client = await connection(); 
  return await client.db("user-videos").collection("videos").insertOne(data);
}

export async function getVideoData(video_id: string) {
  const client = await connection(); 
  return await client.db("user-videos").collection("videos").findOne({ video_id });
}
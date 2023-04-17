import { MongoClient } from "mongodb";
const mongo_uri = process.env.DB_URL;

function getClient() {
  if (!mongo_uri) {
    throw new Error("Missing DB URL")
  }

  const client = new MongoClient(mongo_uri);
  return client.connect();
}


export default getClient;

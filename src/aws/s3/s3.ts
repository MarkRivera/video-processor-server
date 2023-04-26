import { S3Client } from "@aws-sdk/client-s3";

// Set the AWS Region.
const REGION = process.env["REGION"];
const ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!SECRET_ACCESS_KEY) throw new TypeError("KEY is undefined!")
if (!ACCESS_KEY) throw new TypeError("A_KEY is undefined!")
if (!REGION) throw new TypeError("REGION is undefined!")

const client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_ACCESS_KEY
  }
});

export { client as s3Client };
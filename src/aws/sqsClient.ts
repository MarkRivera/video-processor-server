import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();

import { SQSClient } from "@aws-sdk/client-sqs";

// Set the AWS Region.
const REGION = process.env["REGION"];
const ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!SECRET_ACCESS_KEY) throw new TypeError("KEY is undefined!")
if (!ACCESS_KEY) throw new TypeError("A_KEY is undefined!")
if (!REGION) throw new TypeError("REGION is undefined!")

// Create SQS service object.
const sqsClient = new SQSClient({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_ACCESS_KEY
  }
});

export { sqsClient };
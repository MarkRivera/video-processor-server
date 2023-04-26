import * as dotenv from 'dotenv'
dotenv.config();

import express, { NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { existsSync, mkdirSync } from 'fs';
import md5 from 'md5';

import { sendMessage } from './src/aws/sendMessage';
import { abortMultipartUpload, createMultipartUpload, uploadMutlipartToRawS3Bucket } from './src/aws/s3/upload';
import { uploadData } from './src/db/db';
import { MultipartChunkUploadError } from './src/errors';

const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.ORIGIN_URL
}));

app.use(bodyParser.raw({ type: 'application/octet-stream', limit: '200mb' }));
app.use(morgan('combined', {
  skip: function (_, res) { return res.statusCode < 400 }
}));

// If tmp directory doesn't exist, create it
if (!existsSync('./tmp')) {
  try {
    mkdirSync('./tmp');
  } catch (error) {
    console.error(error);
    throw new Error('Error creating tmp directory');
  }
}

let upload_id: string = "";

app.post("/api/v1/videos/upload", async (req: Request, res: Response, next: NextFunction) => {
  const { name, size, currentChunk, totalChunks, type } = req.query;

  if (!name || !size || !currentChunk || !totalChunks || !type) {
    return res.status(400).send({ message: "Missing query parameters" });
  }

  if (typeof name !== "string" || typeof size !== "string" || typeof currentChunk !== "string" || typeof totalChunks !== "string" || typeof type !== "string") {
    return res.status(400).send({ message: "Query parameters are not strings" });
  }

  const firstChunk = parseInt(currentChunk) === 0;
  const lastChunk = parseInt(currentChunk) === parseInt(totalChunks) - 1;
  const ext = name.split('.')[1];
  const data = req.body.toString().split(',')[1];
  const buffer = Buffer.from(data, "base64");
  const tmpFileName = md5(name + req.ip) + '.' + ext;

  if (firstChunk) {
    try {
      // This implementation is not ideal, but it works for now. If other new requests come in while the previous one is still uploading, the upload_id will be overwritten
      // This can be fixed by using a redis cache to store the upload_id and check if it exists before creating a new one
      upload_id = (await createMultipartUpload(tmpFileName)).UploadId as string; // Get multipart upload id
    } catch (error) {
      return next(error)
    }
  }

  try {
    await uploadMutlipartToRawS3Bucket(tmpFileName, buffer, parseInt(currentChunk), lastChunk, upload_id) // Upload to S3 bucket in chunks
  } catch (error) {
    return next(error)
  }

  if (lastChunk) {
    const document = {
      name,
      size,
      type,
      upload_id,
      totalChunks,
      bucketName: tmpFileName
    }

    try {
      await uploadData(document)
      await sendMessage(tmpFileName, document)
    } catch (error) {
      return next(error)
    }

    upload_id = "";
  }

  res.json("ok")
})

app.get('/ping', (_, res) => {
  res.send('pong');
})


function consoleError(err: Error) {
  console.error(`ERROR: ${err.name}`);
  console.error(`ERROR_MESSAGE: ${err.message}`)
  console.error(`STACK: ${err.stack}`)
}
// Error handler
app.use((err: Error, _: Request, res: Response, next: NextFunction) => {
  const errorType = err.name;
  consoleError(err);

  let data: Record<string, string> = {};
  if (err instanceof MultipartChunkUploadError && err.data) {
    data = err.data;
  }

  switch (errorType) {
    case 'ENV_ERROR':
      return res.status(500).send({ message: "Server Error!" });

    case 'MUTLIPART_CHUNK_UPLOAD':
      abortMultipartUpload(data.name, data.upload_id)
      return res.status(500).send({ message: "Error uploading chunk" });

    case 'MULTIPART_CHUNK_INIT':
      return res.status(500).send({ message: "Error creating upload id!" });

    case 'MULTIPART_CHUNK_ABORT':
      return res.status(500).send({ message: "Error aborting chunk" });

    case 'MULTIPART_CHUNK_COMPLETE':
      abortMultipartUpload(data.name, data.upload_id)
      return res.status(500).send({ message: "Error completing chunk" });

    case 'DATABASE_CONNECTION':
      return res.status(500).send({ message: "Error connecting to database" });

    case 'DATABASE_UPLOAD':
      return res.status(500).send({ message: "Error uploading to database" });

    case 'SQS_SEND_MESSAGE':
      return res.status(500).send({ message: "Error sending message to SQS" });

    case 'SQS_RECEIVE_MESSAGE':
      return res.status(500).send({ message: "Error receiving message from SQS" });

    case 'SQS_QUEUE_URL':
      return res.status(500).send({ message: "Error getting SQS queue URL" });
  }

  return res.status(500).send({ message: "Something broke!" });
});

app.listen(process.env.PORT, () => {
  if (!process.env.PORT) {
    throw new Error('No port specified');
  }

  console.log(`Server running on port ${process.env.PORT}`)
}
);

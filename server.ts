import * as dotenv from 'dotenv'
dotenv.config();

import express, { NextFunction, Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import md5 from 'md5';

import { abortMultipartUpload, createMultipartUpload } from './src/aws/s3/upload';
import { MultipartChunkUploadError } from './src/errors';
import { TaskQueue } from './src/rabbit/connect';

const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.ORIGIN_URL
}));

app.use(bodyParser.raw({ type: 'application/octet-stream', limit: '200mb' }));

app.use(morgan('combined', {
  skip: function (_, res) { return res.statusCode < 400 }
}));

const requestCache: Record<string, string> = {};

app.post("/api/v1/videos/upload", async function uploadHandler(req: Request, res: Response, next: NextFunction) {
  const { name, size, currentChunk, totalChunks, type } = req.query;

  if (!name || !size || !currentChunk || !totalChunks || !type) {
    return res.status(400).send({ message: "Missing query parameters" });
  }

  if (typeof name !== "string" || typeof size !== "string" || typeof currentChunk !== "string" || typeof totalChunks !== "string" || typeof type !== "string") {
    return res.status(400).send({ message: "Query parameters are not strings" });
  }

  const ext = name.split('.')[1];
  const tmpFileName = md5(name + req.ip) + '.' + ext;

  const data = req.body.toString().split(',')[1];

  const isLastChunk = parseInt(currentChunk) === parseInt(totalChunks) - 1;


  let upload_id = requestCache[tmpFileName];
  if (!upload_id) {
    try {
      const getId = await createMultipartUpload(tmpFileName);
      if (!getId.UploadId) {
        throw new MultipartChunkUploadError('Upload ID is missing!', 'MULTIPART_CHUNK_INIT')
      }

      upload_id = requestCache[tmpFileName] = getId.UploadId
    } catch (err) {
      next(err)
    }
  }

  // TODO: Create Doc in Db to track status

  TaskQueue.getChannel().then(() => {
    let buffer = Buffer.from(data, "base64");
    const rabbitMsg = {
      tmpFileName,
      isLastChunk,
      currentChunk,
      chunk: buffer,
      totalChunks,
      upload_id
    }

    stringify(rabbitMsg).then(json => {
      TaskQueue.sendToQueue("S3 Rabbit Queue", Buffer.from(json));
    })
  })

  if (isLastChunk) {
    delete requestCache[tmpFileName]
    upload_id = ""
  }

  res.json({
    msg: "Data Received, processing video."
  })
})

function getHandler(_: Request, res: Response) {
  res.send('pong');
}

async function stringify(data: Record<string, string | boolean | Buffer>) {
  return JSON.stringify(data)
}

app.get('/ping', getHandler)


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

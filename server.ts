import * as dotenv from 'dotenv'
dotenv.config();

import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { existsSync, mkdirSync } from 'fs';
import md5 from 'md5';

import { sendMessage } from './src/aws/sendMessage';
import { abortMultipartUpload, createMultipartUpload, uploadMutlipartToRawS3Bucket } from './src/aws/s3/upload';
import { uploadData } from './src/db/db';

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

app.post("/api/v1/videos/upload", async (req: Request, res: Response) => {
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
      const data = await createMultipartUpload(tmpFileName)

      if (!data.UploadId) {
        throw new Error("Error creating upload id");
      }

      upload_id = data.UploadId;
    } catch (error) {
      console.error(error)
      return res.status(500).send({ message: "Error creating upload id!" });
    }
  }
  
  // Upload to S3 bucket in chunks
  try {
    await uploadMutlipartToRawS3Bucket(tmpFileName, buffer, parseInt(currentChunk), lastChunk, upload_id);
  } catch (error) {
    console.error(error)
    abortMultipartUpload(name, upload_id)
    return res.status(500).send({ message: "Error uploading to S3" });
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
      await uploadData(document);
      await sendMessage(tmpFileName, document)
    } catch (error) {
      console.error(error)
      return res.status(500).send({ message: "Error uploading to DB or Sending Message" });
    }

    upload_id = "";
  }



  return res.json("ok")
})

app.get('/ping', (_, res) => {
  return res.send('pong');
})

app.listen(process.env.PORT, () => {
  if (!process.env.PORT) {
    throw new Error('No port specified');
  }

  console.log(`Server running on port ${process.env.PORT}`)
}
);

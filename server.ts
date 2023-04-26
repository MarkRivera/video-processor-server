import * as dotenv from 'dotenv'
dotenv.config();

import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from "cors";

import { WriteStream, createWriteStream, existsSync, mkdirSync } from 'fs';
import { appendFile, rename, unlink } from 'fs/promises';
import md5 from 'md5';

import { createOrGetGridFS, uploadToBucket } from "./src/db/gridfs";
import { sendMessage } from './src/aws/sendMessage';
import { abortMultipartUpload, createMultipartUpload, uploadMutlipartToRawS3Bucket } from './src/aws/s3/upload';
import { downloadFile } from './src/aws/s3/download';

const app = express();
app.use(bodyParser.raw({ type: 'application/octet-stream', limit: '200mb' }));
app.use(cors({
  origin: process.env.ORIGIN_URL
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

    if (lastChunk) {
      const response = (await downloadFile(tmpFileName)).Body?.transformToByteArray();
      if (!response) return res.status(500).send({ message: "Object doesn't exist" });

      // Create file from Uint8Array
      const file = await response;
      const fileBuffer = Buffer.from(file);

      // Store in tmp folder
      await appendFile("./tmp/" + tmpFileName, fileBuffer);
    }
  } catch (error) {
    console.error(error)
    abortMultipartUpload(name, upload_id)
    return res.status(500).send({ message: "Error uploading to S3" });
  }

  if (lastChunk) {
    upload_id = "";
  }
  // const fileExists = existsSync("./tmp/" + tmpFileName);

  // if (firstChunk && fileExists) {
  //   try {
  //     await unlink("./tmp/" + tmpFileName)
  //   } catch (error) {
  //     console.error(error)
  //     return res.status(500).send({ message: "Error removing file" });
  //   }
  // }


  // try {
  //   await appendFile("./tmp/" + tmpFileName, buffer);

  //   if (lastChunk) {
  //     const date = Date.now()
  //     const finalFileName = md5(date.toString()).substring(0, 6) + '.' + ext;

  //     await rename("./tmp/" + tmpFileName, "./tmp/" + finalFileName)

  //     // Store in Database
  //     // const bucket = await createOrGetGridFS();

  //     // if (!bucket) {
  //     //   throw new Error("Bucket not found");
  //     // }


  //     // TODO: Its better to upload to an S3 and store that information in the DB
  //     // const video_id = await uploadToBucket(finalFileName, {
  //     //   name,
  //     //   size,
  //     //   type,
  //     //   totalChunks
  //     // });

  //     // const data = await sendMessage(video_id, finalFileName)

  //     return res.json({
  //       finalFileName,
  //       // video_id
  //     })
  //   }
  // } catch (error) {
  //   if (error) {
  //     console.error(error);
  //     return res.status(500).send({ message: "Error appending file" });
  //   }
  // }

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

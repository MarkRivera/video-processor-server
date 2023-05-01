import { TaskQueue } from "./connect";

async function sendRabbitMessage(data: any) {
  await TaskQueue.getOrCreateQueue("S3 Rabbit Queue");
  TaskQueue.sendToQueue("S3 Rabbit Queue", Buffer.from(data))
}
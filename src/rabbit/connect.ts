import * as amqp from 'amqplib';

export class TaskQueue {
  private static channel: amqp.Channel;
  constructor() { }

  static async getChannel() {
    if (this.channel) return this.channel;

    try {
      const connection = await amqp.connect("amqp://localhost");
      this.channel = await connection.createChannel();
      this.channel.prefetch(1);

      return this.channel
    } catch (error) {
      console.error(error)
      throw "Rabbit Connection Error"
    }
  }

  static async getOrCreateQueue(queueName: string) {
    return this.channel.assertQueue(queueName, {
      durable: true
    })
  }

  static async sendToQueue(queueName: string, buffer: Buffer) {
    await this.getOrCreateQueue(queueName);
    this.channel.sendToQueue(queueName, buffer, { persistent: true });
    console.log("Sent!")
  }
};
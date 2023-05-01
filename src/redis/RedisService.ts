import { createClient, RedisClientType } from "redis";

export class RedisService {
  private static client: RedisClientType | null;

  static async initClient() {
    if (this.client) {
      console.warn("Client already initialized!")
      return this.client;
    }

    this.client = createClient();
    this.client.on("error", async (err) => {
      // Need to handle more gracefully, maybe graceful worker restart
      console.error(err)
      await this.destroyClient();
      throw new Error("Something went wrong on the Client!")
    })

    await this.client.connect();
    return this.client;
  }

  static async getClient() {
    return this.client;
  }

  static async destroyClient() {
    let client = this.client;
    if (client !== null) {
      await client.disconnect();
      await client.discard();
      client = null;
    } else {
      console.warn("No client found!");
    }
  }
}
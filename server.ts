import * as dotenv from 'dotenv'
dotenv.config();

import fastify from 'fastify';
import { routes } from "./routes/routes";
import { fastifyMultipart } from "@fastify/multipart"
import cors from '@fastify/cors';

const server = fastify({});

server.register(fastifyMultipart,)
server.register(cors, {
  origin: "http://127.0.0.1:3001",
})

routes.forEach(route => server.route(route))
server.get("/ping", async (req, res) => {
  return { pong: "It worked" }
});

const start = async () => {
  server.listen({ port: 3000 }, (error, address) => {
    if (error) {
      server.log.error(error);
      process.exit(1);
    }

    console.log(`Server listening on port: ${address}`)
  });
};

start();
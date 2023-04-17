import { RouteOptions } from "fastify";
import { getVideosMetadata, deleteVideo, getSingleVideoMetadata, createVideo } from "../src/controllers/videos.controllers"
import { IncomingMessage, Server, ServerResponse } from "http";

export const routes: RouteOptions<Server, IncomingMessage, ServerResponse, { Body: any }>[] = [
  {
    method: "GET",
    url: "/api/v1/videos",
    handler: getVideosMetadata
  },
  {
    method: "GET",
    url: "/api/v1/videos/:id",
    handler: getSingleVideoMetadata
  },
  {
    method: "DELETE",
    url: "/api/v1/videos/:id",
    handler: deleteVideo
  },
  {
    method: "POST",
    url: "/api/v1/videos/upload",
    handler: createVideo
  }
];
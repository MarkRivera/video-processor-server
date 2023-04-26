import { getVideosMetadata, deleteVideo, getSingleVideoMetadata } from "../src/controllers/videos.controllers"

export const routes = [
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
  // {
  //   method: "POST",
  //   url: "/api/v1/videos/upload",
  //   handler: createVideo
  // }
];
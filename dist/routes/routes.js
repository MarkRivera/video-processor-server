"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routes = void 0;
const videos_controllers_1 = require("../src/controllers/videos.controllers");
exports.routes = [
    {
        method: "GET",
        url: "/api/v1/videos",
        handler: videos_controllers_1.getVideosMetadata
    },
    {
        method: "GET",
        url: "/api/v1/videos/:id",
        handler: videos_controllers_1.getSingleVideoMetadata
    },
    {
        method: "DELETE",
        url: "/api/v1/videos/:id",
        handler: videos_controllers_1.deleteVideo
    },
    {
        method: "POST",
        url: "/api/v1/videos/upload",
        handler: videos_controllers_1.createVideo
    }
];

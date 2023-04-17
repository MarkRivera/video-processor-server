"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVideo = exports.createVideo = exports.getSingleVideoMetadata = exports.getVideosMetadata = void 0;
const gridfs_1 = require("../db/gridfs");
const mongodb_1 = require("mongodb");
const getBucket = () => __awaiter(void 0, void 0, void 0, function* () {
    const bucket = yield (0, gridfs_1.createOrGetGridFS)();
    if (!bucket) {
        throw new Error("Trouble getting bucket!");
    }
    return bucket;
});
const chunks = {};
function getVideosMetadata() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const bucket = yield getBucket();
            const videos = yield (0, gridfs_1.downloadMetadata)(bucket);
            return videos;
        }
        catch (error) {
            if (error instanceof Error) {
                const message = error.message || "Encountered trouble getting videos!";
                console.error(message);
            }
        }
    });
}
exports.getVideosMetadata = getVideosMetadata;
function getSingleVideoMetadata(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = req.params.id;
            const isValidId = mongodb_1.ObjectId.isValid(id);
            if (isValidId) {
                const bucket = yield getBucket();
                const video = yield (0, gridfs_1.downloadMetadataById)(new mongodb_1.ObjectId(id), bucket);
                return video;
            }
            else {
                throw new Error("Invalid Id!");
            }
        }
        catch (error) {
            console.error("Having trouble getting 1 video!", error);
        }
    });
}
exports.getSingleVideoMetadata = getSingleVideoMetadata;
function isLastChunk(chunkIndex, totalChunks) {
    return chunkIndex === totalChunks - 1;
}
function createVideo(req, res) {
    var _a, e_1, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        let data = req.parts();
        const parts = {};
        try {
            for (var _d = true, data_1 = __asyncValues(data), data_1_1; data_1_1 = yield data_1.next(), _a = data_1_1.done, !_a;) {
                _c = data_1_1.value;
                _d = false;
                try {
                    const part = _c;
                    if (part.type === 'file') {
                        part.file.on('data', (chunk) => {
                            parts.chunk = chunk;
                        });
                        part.file.on('error', (err) => { throw err; });
                    }
                    else if (part.fieldname === 'uuid') {
                        parts.uuid = part.value;
                    }
                    else if (part.fieldname === "filename") {
                        parts.filename = part.value;
                    }
                    else {
                        let value = parseInt(part.value);
                        let fieldname = part.fieldname;
                        parts[fieldname] = value;
                    }
                }
                finally {
                    _d = true;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = data_1.return)) yield _b.call(data_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        const { uuid, chunk, totalChunks, chunkIndex, filename } = parts;
        chunks[uuid] = [];
        let bufferList = chunks[uuid];
        bufferList.push(chunk);
        if (isLastChunk(chunkIndex, totalChunks)) {
            const completeFileBuffer = Buffer.concat(bufferList);
            console.log({ chunks });
            const bucket = yield getBucket();
            const video_id = (0, gridfs_1.upload)(bucket, completeFileBuffer, filename || "Test", {
                uuid
            });
            bufferList.length = 0;
            bufferList = [];
            delete chunks[uuid];
            return { msg: "Completed video upload", video_id };
        }
        return { msg: "Expected a completed video but is here instead" };
    });
}
exports.createVideo = createVideo;
function deleteVideo(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = req.params.id;
            const isValidId = mongodb_1.ObjectId.isValid(id);
            if (isValidId) {
                const bucket = yield getBucket();
                yield (0, gridfs_1.deleteFile)(new mongodb_1.ObjectId(id), bucket);
            }
            else {
                throw new Error("Invalid Id!");
            }
            return { msg: "File deletion successful!" };
        }
        catch (error) {
            console.error("Encountered error while deleting!", error);
            return { msg: "Sorry, there was en error while deleting!" };
        }
    });
}
exports.deleteVideo = deleteVideo;

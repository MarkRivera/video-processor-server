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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBucket = exports.deleteFile = exports.downloadFileData = exports.downloadMetadata = exports.downloadMetadataById = exports.upload = exports.createOrGetGridFS = void 0;
const stream_1 = require("stream");
const connect_1 = __importDefault(require("./connect"));
const mongodb_1 = require("mongodb");
function createOrGetGridFS() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const client = yield (0, connect_1.default)();
            const selectedDB = client.db("user-videos");
            return new mongodb_1.GridFSBucket(selectedDB, { bucketName: "videos-bucket" });
        }
        catch (err) {
            // TODO: Handle Err
            console.error("Something went wrong creating or getting GridFS", err);
        }
    });
}
exports.createOrGetGridFS = createOrGetGridFS;
function upload(bucket, buffer, filename, metadata = {}) {
    const readableStreamBuffer = stream_1.Readable.from(buffer);
    const stream = readableStreamBuffer
        .pipe(bucket.openUploadStream(filename, {
        chunkSizeBytes: 1048576,
        metadata
    }))
        .addListener('error', (err) => {
        // TODO: Handle Error
        console.error("Something went wrong with uploading to the bucket!", err);
    });
    return stream.id;
}
exports.upload = upload;
;
function downloadMetadataById(_id, bucket) {
    return __awaiter(this, void 0, void 0, function* () {
        const cursor = bucket.find({
            _id
        });
        const data = yield cursor.toArray();
        cursor.close();
        return data;
    });
}
exports.downloadMetadataById = downloadMetadataById;
function downloadMetadata(bucket) {
    return __awaiter(this, void 0, void 0, function* () {
        const cursor = bucket.find({});
        const data = yield cursor.toArray();
        cursor.close();
        return data;
    });
}
exports.downloadMetadata = downloadMetadata;
function downloadFileData(_id, bucket) {
    return __awaiter(this, void 0, void 0, function* () {
        const stream = bucket.openDownloadStream(_id);
        return stream;
    });
}
exports.downloadFileData = downloadFileData;
function deleteFile(_id, bucket) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield bucket.delete(_id);
        }
        catch (error) {
            // TODO: Handle Error
            console.error("Something went wrong with deleting a file!", error);
        }
    });
}
exports.deleteFile = deleteFile;
;
function deleteBucket(bucket) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            bucket.drop();
        }
        catch (error) {
            // TODO: Handle Error
            console.error("Something went wrong with deleting the bucket!", error);
        }
    });
}
exports.deleteBucket = deleteBucket;
;

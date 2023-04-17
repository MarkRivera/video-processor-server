"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const mongo_uri = process.env.DB_URL;
function getClient() {
    if (!mongo_uri) {
        throw new Error("Missing DB URL");
    }
    const client = new mongodb_1.MongoClient(mongo_uri);
    return client.connect();
}
exports.default = getClient;

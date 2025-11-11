"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongoProviders = exports.MONGO_CLOSE = exports.MONGO_COLLECTION = exports.MONGO_DB = exports.MONGO_CLIENT = void 0;
const mongodb_1 = require("mongodb");
const common_1 = require("@nestjs/common");
exports.MONGO_CLIENT = 'MONGO_CLIENT';
exports.MONGO_DB = 'MONGO_DB';
exports.MONGO_COLLECTION = 'MONGO_COLLECTION';
exports.MONGO_CLOSE = 'MONGO_CLOSE';
let cachedClient = null;
let cachedDb = null;
let cachedCollection = null;
const clientProvider = {
    provide: exports.MONGO_CLIENT,
    useFactory: async () => {
        if (cachedClient)
            return cachedClient;
        const options = {
            serverApi: {
                version: mongodb_1.ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
        };
        const client = new mongodb_1.MongoClient(process.env.MONGODB_URI, options);
        await client.connect();
        cachedClient = client;
        return client;
    },
};
const dbProvider = {
    provide: exports.MONGO_DB,
    useFactory: async (client) => {
        if (cachedDb)
            return cachedDb;
        cachedDb = client.db(process.env.MONGODB_NAME || 'QuestionService');
        return cachedDb;
    },
    inject: [exports.MONGO_CLIENT],
};
const collectionProvider = {
    provide: exports.MONGO_COLLECTION,
    useFactory: async (db) => {
        if (cachedCollection)
            return cachedCollection;
        cachedCollection = db.collection(process.env.MONGODB_COLLECTION || 'Questions');
        return cachedCollection;
    },
    inject: [exports.MONGO_DB],
};
const closeProvider = {
    provide: exports.MONGO_CLOSE,
    useFactory: (client) => {
        return async () => {
            await client.close();
            cachedClient = null;
            cachedDb = null;
            cachedCollection = null;
        };
    },
    inject: [exports.MONGO_CLIENT],
};
let MongoShutdown = class MongoShutdown {
    client;
    constructor(client) {
        this.client = client;
    }
    async onApplicationShutdown(signal) {
        console.log(`Received shutdown signal: ${signal}`);
        await this.client.close();
        cachedClient = null;
        cachedDb = null;
        cachedCollection = null;
    }
};
MongoShutdown = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(exports.MONGO_CLIENT)),
    __metadata("design:paramtypes", [mongodb_1.MongoClient])
], MongoShutdown);
exports.mongoProviders = [
    clientProvider,
    dbProvider,
    collectionProvider,
    closeProvider,
    MongoShutdown,
];
//# sourceMappingURL=mongo.provider.js.map
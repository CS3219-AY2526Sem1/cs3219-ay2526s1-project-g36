import { MongoClient, Db, Collection, ServerApiVersion, MongoClientOptions } from 'mongodb';
import { Provider, OnApplicationShutdown, Inject, Injectable } from '@nestjs/common';

export const MONGO_CLIENT = 'MONGO_CLIENT';
export const MONGO_DB = 'MONGO_DB';
export const MONGO_COLLECTION = 'MONGO_COLLECTION';
export const MONGO_CLOSE = 'MONGO_CLOSE';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let cachedCollection: Collection | null = null;

const clientProvider: Provider = {
  provide: MONGO_CLIENT,
  useFactory: async (): Promise<MongoClient> => {
    if (cachedClient) return cachedClient;
    const options: MongoClientOptions = {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    };
    const client = new MongoClient(process.env.MONGODB_URI!, options);
    await client.connect();
    cachedClient = client;
    return client;
  },
};

const dbProvider: Provider = {
  provide: MONGO_DB,
  useFactory: async (client: MongoClient): Promise<Db> => {
    if (cachedDb) return cachedDb;
    cachedDb = client.db(process.env.MONGODB_NAME || 'QuestionService');
    return cachedDb;
  },
  inject: [MONGO_CLIENT],
};

const collectionProvider: Provider = {
  provide: MONGO_COLLECTION,
  useFactory: async (db: Db): Promise<Collection> => {
    if (cachedCollection) return cachedCollection;
    const collectionName =
      process.env.MONGODB_COLLECTION ||
      process.env.QUESTIONS_COLLECTION_NAME ||
      'Questions';
    cachedCollection = db.collection(collectionName);
    return cachedCollection;
  },
  inject: [MONGO_DB],
};

const closeProvider: Provider = {
  provide: MONGO_CLOSE,
  useFactory: (client: MongoClient) => {
    return async () => {
      await client.close();
      cachedClient = null;
      cachedDb = null;
      cachedCollection = null;
    };
  },
  inject: [MONGO_CLIENT],
};

@Injectable()
class MongoShutdown implements OnApplicationShutdown {
  constructor(@Inject(MONGO_CLIENT) private readonly client: MongoClient) {}
  async onApplicationShutdown(signal: string) {
    // eslint-disable-next-line no-console
    console.log(`Received shutdown signal: ${signal}`);
    await this.client.close();
    cachedClient = null;
    cachedDb = null;
    cachedCollection = null;
  }
}

export const mongoProviders: Provider[] = [
  clientProvider,
  dbProvider,
  collectionProvider,
  closeProvider,
  MongoShutdown,
];

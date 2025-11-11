import { Collection, Document } from 'mongodb';
export declare class QuestionsService {
    private readonly collection;
    constructor(collection: Collection);
    findTop(limit?: number): Promise<import("mongodb").WithId<Document>[]>;
    search({ topic, difficulty, sortBy, sortDir, q, page, pageSize, }: {
        topic?: string;
        difficulty?: string;
        sortBy?: string;
        sortDir?: string;
        q?: string;
        page?: number;
        pageSize?: number;
    }): Promise<{
        items: Document[];
        total: number;
        page: number;
        pageSize: number;
    }>;
}

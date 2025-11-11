import { QuestionsService } from './questions.service';
export declare class QuestionsController {
    private readonly svc;
    constructor(svc: QuestionsService);
    list(limit?: string, page?: string, pageSize?: string, topic?: string, difficulty?: string, sortBy?: string, sortDir?: string, q?: string): Promise<{
        items: import("bson").Document[];
        total: number;
        page: number;
        pageSize: number;
    }>;
}

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
exports.QuestionsService = void 0;
const common_1 = require("@nestjs/common");
const mongodb_1 = require("mongodb");
const mongo_provider_1 = require("../mongodb/mongo.provider");
let QuestionsService = class QuestionsService {
    collection;
    constructor(collection) {
        this.collection = collection;
    }
    findTop(limit = 5) {
        return this.collection.find({}).limit(limit).toArray();
    }
    async search({ topic, difficulty, sortBy, sortDir, q, page = 1, pageSize = 20, }) {
        const match = {};
        if (topic && topic.trim().length > 0) {
            const esc = topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(`(^|,)\\s*${esc}\\s*(,|$)`, 'i');
            const reExact = new RegExp(`^${esc}$`, 'i');
            match.$or = [
                { related_topics: { $regex: re } },
                { related_topics: { $elemMatch: { $regex: reExact } } },
            ];
        }
        if (difficulty && difficulty.trim()) {
            const d = difficulty.trim().toLowerCase();
            const difficulties = ['easy', 'medium', 'hard'];
            if (difficulties.includes(d)) {
                match.difficulty = { $regex: new RegExp(`^${d}$`, 'i') };
            }
        }
        if (q && q.length > 0) {
            const escQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const titleRe = new RegExp(escQ);
            const orConds = [{ title: { $regex: titleRe } }];
            orConds.push({ $expr: { $regexMatch: { input: { $toString: '$id' }, regex: escQ } } });
            if (match.$or) {
                match.$and = [{ $or: match.$or }, { $or: orConds }];
                delete match.$or;
            }
            else {
                match.$or = orConds;
            }
        }
        const sortMap = {
            title: 'title',
            topic: 'related_topics',
            related_topics: 'related_topics',
            difficulty: 'difficulty',
            popularity: 'likes',
            likes: 'likes',
            discuss_count: 'discuss_count',
            solve_rate: 'acceptance_rate',
            solverate: 'acceptance_rate',
            acceptance_rate: 'acceptance_rate',
            frequency: 'frequency',
            rating: 'rating',
            id: 'id',
        };
        const field = sortBy ? sortMap[sortBy.toLowerCase()] ?? 'title' : 'title';
        const dir = (sortDir || 'asc').toLowerCase() === 'desc' ? -1 : 1;
        const skip = Math.max(0, (page - 1) * pageSize);
        const pipeline = [{ $match: match }];
        if (field === 'difficulty') {
            pipeline.push({
                $addFields: {
                    _difficulty_rank: {
                        $switch: {
                            branches: [
                                { case: { $regexMatch: { input: '$difficulty', regex: /^easy$/i } }, then: 1 },
                                { case: { $regexMatch: { input: '$difficulty', regex: /^medium$/i } }, then: 2 },
                                { case: { $regexMatch: { input: '$difficulty', regex: /^hard$/i } }, then: 3 },
                            ],
                            default: 9,
                        },
                    },
                },
            });
            pipeline.push({ $sort: { _difficulty_rank: dir, title: 1 } });
            pipeline.push({ $project: { _difficulty_rank: 0 } });
        }
        else {
            pipeline.push({ $sort: { [field]: dir, title: 1 } });
        }
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: pageSize });
        const [total, items] = await Promise.all([
            this.collection.countDocuments(match),
            this.collection.aggregate(pipeline).toArray(),
        ]);
        return { items, total, page, pageSize };
    }
};
exports.QuestionsService = QuestionsService;
exports.QuestionsService = QuestionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(mongo_provider_1.MONGO_COLLECTION)),
    __metadata("design:paramtypes", [mongodb_1.Collection])
], QuestionsService);
//# sourceMappingURL=questions.service.js.map
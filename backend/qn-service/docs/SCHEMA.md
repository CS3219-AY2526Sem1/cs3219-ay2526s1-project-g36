# MongoDB Schema: Questions Collection

This document describes the schema for the questions collection used by qn-service.

- Collection name: configured via `MONGODB_COLLECTION` (or legacy `QUESTIONS_COLLECTION_NAME`). Default: `questions`.
- Database name: configured via `MONGODB_NAME`. Default: `QuestionService`.

## Sample Document

```
{
  "_id": {"$oid": "68dba65f725227a10dc2db7d"},
  "id": {"$numberInt": "1"},
  "title": "Two Sum",
  "description": "Given an array of integers nums and an integer target, ...",
  "is_premium": {"$numberInt": "0"},
  "difficulty": "Easy",
  "solution_link": "/articles/two-sum",
  "acceptance_rate": {"$numberDouble": "46.7"},
  "frequency": {"$numberDouble": "100.0"},
  "url": "https://leetcode.com/problems/two-sum",
  "discuss_count": {"$numberInt": "999"},
  "accepted": "4.1M",
  "submissions": "8.7M",
  "companies": "Amazon,Google,Apple,Adobe,Microsoft,Bloomberg,Facebook,Oracle,Uber,Expedia,Twitter,Nagarro,SAP,Yahoo,Cisco,Qualcomm,tcs,Goldman Sachs,Yandex,ServiceNow",
  "related_topics": "Array,Hash Table",
  "likes": {"$numberInt": "20217"},
  "dislikes": {"$numberInt": "712"},
  "rating": {"$numberInt": "97"},
  "asked_by_faang": {"$numberInt": "1"},
  "similar_questions": "[3Sum, /problems/3sum/, Medium], [4Sum, /problems/4sum/, Medium], ..."
}
```

## Fields

- `_id` (ObjectId)
  - MongoDB primary key.

- `id` (int32)
  - External numeric identifier for the problem; expected to be unique.

- `title` (string)
  - Problem title.

- `description` (string)
  - Markdown/plaintext problem description; may contain newlines and backticks.

- `is_premium` (int32 | boolean)
  - 0/1 flag indicating premium status. Currently stored as int; boolean is recommended.

- `difficulty` (string)
  - One of: `Easy`, `Medium`, `Hard`.

- `solution_link` (string)
  - Relative or absolute link to editorial/solution.

- `acceptance_rate` (double)
  - Percentage of accepted submissions (0–100 inclusive).

- `frequency` (double)
  - Relative appearance metric; semantics depend on source data.

- `url` (string)
  - Canonical problem URL.

- `discuss_count` (int32)
  - Number of discussion threads.

- `accepted` (string)
  - Display-formatted accepted count (e.g., "4.1M"). Consider storing as numeric as well.

- `submissions` (string)
  - Display-formatted submissions count (e.g., "8.7M"). Consider storing as numeric as well.

- `companies` (string)
  - Comma-separated company names. Consider normalizing to an array of strings.

- `related_topics` (string)
  - Comma-separated tags (e.g., "Array,Hash Table"). Consider normalizing to an array of strings.

- `likes` (int32)
  - Count of likes/upvotes.

- `dislikes` (int32)
  - Count of dislikes/downvotes.

- `rating` (int32)
  - Aggregate quality rating (0–100), if applicable.

- `asked_by_faang` (int32 | boolean)
  - 0/1 flag. Consider storing as boolean.

- `similar_questions` (string)
  - Display-formatted related items (e.g., "[Title, /path, Difficulty]"). Consider normalizing to an array of objects.

## Recommended Indexes

- Unique index on `id` to prevent duplicates.
- Text index on `title` and optionally `description` for search.
- Index on `difficulty` for filtering.
- Optional multikey indexes on normalized arrays if you migrate `companies` and `related_topics` to arrays.

Example index creation:

```js
// Unique index on id
db.questions.createIndex({ id: 1 }, { unique: true });

// Text index for search
db.questions.createIndex({ title: "text", description: "text" });

// Difficulty filter
db.questions.createIndex({ difficulty: 1 });
```

## Suggested Normalization (Optional)

- Store booleans as `true`/`false` instead of 0/1 for `is_premium` and `asked_by_faang`.
- Store numeric counts for `accepted` and `submissions` alongside the formatted string, e.g., `accepted_count: NumberLong(4100000)`.
- Store `companies` and `related_topics` as arrays of strings.
- Store `similar_questions` as an array of objects: `{ title, url, difficulty }`.

## JSON Schema (Validator)

The following can be used with MongoDB JSON Schema validation to enforce core fields. Adjust optional fields to your needs.

```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["id", "title", "description", "difficulty", "url"],
    "properties": {
      "id": { "bsonType": "int" },
      "title": { "bsonType": "string" },
      "description": { "bsonType": "string" },
      "difficulty": { "enum": ["Easy", "Medium", "Hard"] },
      "url": { "bsonType": "string" },
      "is_premium": { "bsonType": ["bool", "int"] },
      "acceptance_rate": { "bsonType": ["double", "int", "decimal"] },
      "frequency": { "bsonType": ["double", "int", "decimal"] },
      "discuss_count": { "bsonType": ["int", "long"] },
      "likes": { "bsonType": ["int", "long"] },
      "dislikes": { "bsonType": ["int", "long"] },
      "rating": { "bsonType": ["int", "long"] },
      "asked_by_faang": { "bsonType": ["bool", "int"] },
      "accepted": { "bsonType": "string" },
      "submissions": { "bsonType": "string" },
      "companies": { "bsonType": "string" },
      "related_topics": { "bsonType": "string" },
      "similar_questions": { "bsonType": "string" }
    }
  }
}
```

## TypeScript (Current Shape)

```ts
export interface QuestionDoc {
  _id: any;   id: number;
  title: string;
  description: string;
  is_premium?: number | boolean;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  solution_link?: string;
  acceptance_rate?: number;
  frequency?: number;
  url: string;
  discuss_count?: number;
  accepted?: string;
  submissions?: string;
  companies?: string; 
  related_topics?: string; 
  likes?: number;
  dislikes?: number;
  rating?: number;
  asked_by_faang?: number | boolean;
  similar_questions?: string; 
}
```

## Notes

- The service `QuestionsService.findTop` returns documents as-is from Mongo; any consumer should handle current field shapes.
- For search/filter features, normalizing arrays and booleans will improve query performance and ergonomics.


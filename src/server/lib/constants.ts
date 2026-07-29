import { createMessageObjectSchema } from "stoker/openapi/schemas";
import * as HttpStatusPhrases from "stoker/http-status-phrases";

// Shared `{ message }` response schemas, reused across route `responses` blocks so
// the OpenAPI doc documents every failure a route can produce.
export const notFoundSchema = createMessageObjectSchema(HttpStatusPhrases.NOT_FOUND);
export const conflictSchema = createMessageObjectSchema(HttpStatusPhrases.CONFLICT);
export const unauthorizedSchema = createMessageObjectSchema(
  HttpStatusPhrases.UNAUTHORIZED,
);
export const tooManyRequestsSchema = createMessageObjectSchema(
  HttpStatusPhrases.TOO_MANY_REQUESTS,
);

import { createRoute } from "@hono/zod-openapi";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { IdUUIDParamsSchema, createErrorSchema } from "stoker/openapi/schemas";
import * as HttpStatusCodes from "stoker/http-status-codes";
import {
  insertInspectionSchema,
  listInspectionsQuerySchema,
  listInspectionsResponseSchema,
  resolveInspectionSchema,
  selectInspectionSchema,
} from "@validators";
import { conflictSchema, notFoundSchema, unauthorizedSchema } from "@/lib/constants";

const tags = ["Inspections"];
const security = [{ Bearer: [] }];

export const list = createRoute({
  method: "get",
  path: "/",
  tags,
  security,
  summary: "List inspections",
  description:
    "Filter by severity/status/defectType and inspectionDate range; sort and paginate. Returns an envelope with total.",
  request: {
    query: listInspectionsQuerySchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      listInspectionsResponseSchema,
      "Matching inspections",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(listInspectionsQuerySchema),
      "Invalid query parameters",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(unauthorizedSchema, "Unauthorized"),
  },
});

export const create = createRoute({
  method: "post",
  path: "/",
  tags,
  security,
  summary: "Log an inspection",
  description:
    "Idempotent on the (optionally client-supplied) id: an existing id returns 200 with the stored row, otherwise a new row is created (201). createdBy is stamped from the token.",
  request: {
    body: jsonContentRequired(insertInspectionSchema, "The inspection to log"),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      selectInspectionSchema,
      "Inspection created",
    ),
    [HttpStatusCodes.OK]: jsonContent(
      selectInspectionSchema,
      "Inspection already existed (idempotent replay)",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertInspectionSchema),
      "Validation error",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(unauthorizedSchema, "Unauthorized"),
  },
});

export const getOne = createRoute({
  method: "get",
  path: "/{id}",
  tags,
  security,
  summary: "Get one inspection",
  request: {
    params: IdUUIDParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(selectInspectionSchema, "The inspection"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(IdUUIDParamsSchema),
      "Invalid id",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(unauthorizedSchema, "Unauthorized"),
  },
});

export const resolve = createRoute({
  method: "patch",
  path: "/{id}/resolve",
  tags,
  security,
  summary: "Resolve an inspection",
  description: "Requires a non-empty resolution note. 409 if already resolved.",
  request: {
    params: IdUUIDParamsSchema,
    body: jsonContentRequired(resolveInspectionSchema, "The resolution note"),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      selectInspectionSchema,
      "The resolved inspection",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(notFoundSchema, "Not found"),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      conflictSchema,
      "Already resolved",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(resolveInspectionSchema),
      "Validation error",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(unauthorizedSchema, "Unauthorized"),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type ResolveRoute = typeof resolve;

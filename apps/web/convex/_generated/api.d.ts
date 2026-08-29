/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as aiDb from "../aiDb.js";
import type * as ask from "../ask.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as items from "../items.js";
import type * as pipeline from "../pipeline.js";
import type * as pipelineDb from "../pipelineDb.js";
import type * as search from "../search.js";
import type * as searchDb from "../searchDb.js";
import type * as shared from "../shared.js";
import type * as spaces from "../spaces.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiDb: typeof aiDb;
  ask: typeof ask;
  auth: typeof auth;
  crons: typeof crons;
  http: typeof http;
  items: typeof items;
  pipeline: typeof pipeline;
  pipelineDb: typeof pipelineDb;
  search: typeof search;
  searchDb: typeof searchDb;
  shared: typeof shared;
  spaces: typeof spaces;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

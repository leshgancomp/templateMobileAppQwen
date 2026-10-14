/**
 * JSON:API типизация ответов сервера
 */

// ─── Базовые структуры JSON:API ─────────────────────────────────────────────

export interface JsonApiResourceIdentifier {
  type: string;
  id: string;
}

export interface JsonApiRelationship {
  data: JsonApiResourceIdentifier | JsonApiResourceIdentifier[] | null;
  links?: Record<string, string>;
}

export interface JsonApiResource extends JsonApiResourceIdentifier {
  attributes?: Record<string, unknown>;
  relationships?: Record<string, JsonApiRelationship>;
  links?: Record<string, string>;
}

export interface JsonApiError {
  status?: string;
  code?: string;
  title?: string;
  detail?: string;
  source?: {
    pointer?: string;
    parameter?: string;
  };
}

export interface JsonApiLinks {
  self?: string;
  first?: string;
  last?: string;
  prev?: string;
  next?: string;
}

export interface JsonApiPaginationLinks extends JsonApiLinks {
  first: string;
  last: string;
}

// ─── Ответы сервера ─────────────────────────────────────────────────────────

export interface JsonApiSingleResponse {
  data: JsonApiResource;
  included?: JsonApiResource[];
  links?: JsonApiLinks;
  meta?: Record<string, unknown>;
}

export interface JsonApiCollectionResponse {
  data: JsonApiResource[];
  included?: JsonApiResource[];
  links?: JsonApiPaginationLinks;
  meta?: Record<string, unknown>;
}

export interface JsonApiErrorResponse {
  errors: JsonApiError[];
}

// ─── Специфичные ответы ─────────────────────────────────────────────────────

export interface AuthResponse extends JsonApiSingleResponse {
  data: JsonApiResource & {
    attributes: {
      accessToken: string;
      refreshToken: string | null;
      tokenType: string;
      expiresIn: number;
    };
  };
  refresh_token: string;
  refresh_token_expiration: number;
}

export type JsonApiResponse =
  | JsonApiSingleResponse
  | JsonApiCollectionResponse
  | JsonApiErrorResponse;

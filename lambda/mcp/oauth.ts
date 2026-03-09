import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Endpoint, RouteHandler } from "yatro";
import { IDI } from "../utils/di";
import { OauthDao } from "../dao/oauthDao";
import { UserDao } from "../dao/userDao";
import { Utils_getEnv, Utils_isLocal } from "../utils";
import * as Cookie from "cookie";

interface IPayload {
  event: APIGatewayProxyEvent;
  di: IDI;
}

function oauthJson(status: number, body: object, extraHeaders?: Record<string, string>): APIGatewayProxyResult {
  return {
    statusCode: status,
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  };
}

function oauthError(status: number, error: string, description: string): APIGatewayProxyResult {
  return oauthJson(status, { error, error_description: description });
}

function getBaseUrl(): string {
  if (Utils_isLocal()) {
    return "https://local.liftosaur.com:8080";
  }
  const env = Utils_getEnv();
  return env === "dev" ? "https://stage.liftosaur.com" : "https://www.liftosaur.com";
}

async function getCurrentUserId(event: APIGatewayProxyEvent, di: IDI): Promise<string | undefined> {
  const cookies = Cookie.parse(event.headers.Cookie || event.headers.cookie || "");
  const userDao = new UserDao(di);
  return userDao.getCurrentUserIdFromCookie(cookies);
}

// --- GET /.well-known/oauth-protected-resource ---

export const getProtectedResourceEndpoint = Endpoint.build("/.well-known/oauth-protected-resource");
export const getProtectedResourceHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getProtectedResourceEndpoint
> = async ({ payload }) => {
  const baseUrl = getBaseUrl();
  return oauthJson(200, {
    resource: `${baseUrl}/mcp`,
    authorization_servers: [baseUrl],
  });
};

// --- GET /.well-known/oauth-authorization-server ---

export const getAuthServerMetadataEndpoint = Endpoint.build("/.well-known/oauth-authorization-server");
export const getAuthServerMetadataHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getAuthServerMetadataEndpoint
> = async ({ payload }) => {
  const baseUrl = getBaseUrl();
  return oauthJson(200, {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    registration_endpoint: `${baseUrl}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
};

// --- POST /oauth/register (Dynamic Client Registration) ---

export const postOauthRegisterEndpoint = Endpoint.build("/oauth/register");
export const postOauthRegisterHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof postOauthRegisterEndpoint
> = async ({ payload }) => {
  const { event, di } = payload;
  let body: Record<string, unknown>;
  try {
    const raw = event.body
      ? event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body
      : "{}";
    body = JSON.parse(raw);
  } catch {
    return oauthError(400, "invalid_request", "Invalid JSON body");
  }

  const redirectUris = body.redirect_uris as string[] | undefined;
  if (!redirectUris || !Array.isArray(redirectUris) || redirectUris.length === 0) {
    return oauthError(400, "invalid_request", "redirect_uris is required");
  }

  const clientName = (body.client_name as string) || "MCP Client";
  const oauthDao = new OauthDao(di);
  const client = await oauthDao.createClient(redirectUris, clientName);

  return oauthJson(201, {
    client_id: client.clientId,
    client_name: client.clientName,
    redirect_uris: client.redirectUris,
  });
};

// --- GET /oauth/authorize ---

export const getOauthAuthorizeEndpoint = Endpoint.build("/oauth/authorize", {
  response_type: "string?",
  client_id: "string?",
  redirect_uri: "string?",
  state: "string?",
  code_challenge: "string?",
  code_challenge_method: "string?",
});
export const getOauthAuthorizeHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getOauthAuthorizeEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;

  if (params.response_type !== "code") {
    return oauthError(400, "unsupported_response_type", "Only response_type=code is supported");
  }
  if (!params.client_id || !params.redirect_uri || !params.code_challenge) {
    return oauthError(400, "invalid_request", "Missing required parameters");
  }
  if (params.code_challenge_method && params.code_challenge_method !== "S256") {
    return oauthError(400, "invalid_request", "Only S256 code_challenge_method is supported");
  }

  const oauthDao = new OauthDao(di);
  const client = await oauthDao.getClient(params.client_id);
  if (!client) {
    return oauthError(400, "invalid_client", "Unknown client_id");
  }
  if (!client.redirectUris.includes(params.redirect_uri)) {
    return oauthError(400, "invalid_request", "redirect_uri not registered");
  }

  const userId = await getCurrentUserId(event, di);
  if (!userId) {
    const baseUrl = getBaseUrl();
    const currentUrl = `${baseUrl}${event.path}?${new URLSearchParams(params as Record<string, string>).toString()}`;
    return {
      statusCode: 302,
      body: "",
      headers: { location: `${baseUrl}/login?url=${encodeURIComponent(currentUrl)}` },
    };
  }

  const authCode = await oauthDao.createAuthCode(
    params.client_id,
    userId,
    params.redirect_uri,
    params.code_challenge,
    params.code_challenge_method || "S256"
  );

  const redirectUrl = new URL(params.redirect_uri);
  redirectUrl.searchParams.set("code", authCode.code);
  if (params.state) {
    redirectUrl.searchParams.set("state", params.state);
  }

  return {
    statusCode: 302,
    body: "",
    headers: { location: redirectUrl.toString() },
  };
};

// --- POST /oauth/token ---

export const postOauthTokenEndpoint = Endpoint.build("/oauth/token");
export const postOauthTokenHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof postOauthTokenEndpoint
> = async ({ payload }) => {
  const { event, di } = payload;

  let body: Record<string, string>;
  try {
    const raw = event.body
      ? event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body
      : "";
    const contentType = event.headers["Content-Type"] || event.headers["content-type"] || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      body = Object.fromEntries(new URLSearchParams(raw));
    } else {
      body = JSON.parse(raw);
    }
  } catch {
    return oauthError(400, "invalid_request", "Invalid request body");
  }

  const grantType = body.grant_type;
  const oauthDao = new OauthDao(di);

  if (grantType === "authorization_code") {
    return handleAuthCodeGrant(body, oauthDao);
  } else if (grantType === "refresh_token") {
    return handleRefreshTokenGrant(body, oauthDao);
  }

  return oauthError(400, "unsupported_grant_type", "Only authorization_code and refresh_token are supported");
};

async function handleAuthCodeGrant(body: Record<string, string>, oauthDao: OauthDao): Promise<APIGatewayProxyResult> {
  const { code, client_id, redirect_uri, code_verifier } = body;

  if (!code || !client_id || !code_verifier) {
    return oauthError(400, "invalid_request", "Missing required parameters");
  }

  const authCode = await oauthDao.getAuthCode(code);
  if (!authCode) {
    return oauthError(400, "invalid_grant", "Invalid or expired authorization code");
  }

  await oauthDao.deleteAuthCode(code);

  if (authCode.expiresAt < Date.now()) {
    return oauthError(400, "invalid_grant", "Authorization code expired");
  }
  if (authCode.clientId !== client_id) {
    return oauthError(400, "invalid_grant", "client_id mismatch");
  }
  if (redirect_uri && authCode.redirectUri !== redirect_uri) {
    return oauthError(400, "invalid_grant", "redirect_uri mismatch");
  }
  if (!OauthDao.verifyCodeChallenge(code_verifier, authCode.codeChallenge)) {
    return oauthError(400, "invalid_grant", "Invalid code_verifier");
  }

  const token = await oauthDao.createToken(client_id, authCode.userId);
  return oauthJson(200, {
    access_token: token.token,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: token.refreshToken,
  });
}

async function handleRefreshTokenGrant(
  body: Record<string, string>,
  oauthDao: OauthDao
): Promise<APIGatewayProxyResult> {
  const { refresh_token, client_id } = body;

  if (!refresh_token || !client_id) {
    return oauthError(400, "invalid_request", "Missing required parameters");
  }

  const existing = await oauthDao.getByRefreshToken(refresh_token);
  if (!existing) {
    return oauthError(400, "invalid_grant", "Invalid refresh token");
  }
  if (existing.clientId !== client_id) {
    return oauthError(400, "invalid_grant", "client_id mismatch");
  }

  await oauthDao.deleteToken(existing.token);

  const newToken = await oauthDao.createToken(client_id, existing.userId);
  return oauthJson(200, {
    access_token: newToken.token,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: newToken.refreshToken,
  });
}

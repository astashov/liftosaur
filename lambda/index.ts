import "source-map-support/register";
import fetch from "node-fetch";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Router } from "./router";
import { GoogleAuthTokenDao } from "./dao/googleAuthTokenDao";
import { UserDao } from "./dao/userDao";
import * as Cookie from "cookie";
import JWT from "jsonwebtoken";
import { UidFactory } from "./utils/generator";
import AWS from "aws-sdk";

interface IOpenIdResponseSuccess {
  sub: string;
  email: string;
}

interface IOpenIdResponseError {
  error: string;
  error_description: string;
}

export type IEnv = "dev" | "prod";

const allowedHosts = ["local.liftosaur.com:8080", "www.liftosaur.com"];

function getHeaders(event: APIGatewayProxyEvent): Record<string, string> {
  const origin = event.headers.origin || "http://example.com";
  const url = new URL(origin);
  let headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (allowedHosts.some((host) => host === url.host)) {
    headers = {
      ...headers,
      "access-control-allow-origin": `${url.protocol}//${url.host}`,
      "access-control-allow-credentials": "true",
      "access-control-expose-headers": "cookie, set-cookie",
    };
  }
  return headers;
}

async function googleLoginHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const token = JSON.parse(event.body || "{}").token;
  const url = `https://openidconnect.googleapis.com/v1/userinfo?access_token=${token}`;
  const googleApiResponse = await fetch(url);
  const openIdJson: IOpenIdResponseSuccess | IOpenIdResponseError = await googleApiResponse.json();
  const env = process.env.IS_DEV === "true" ? "dev" : "prod";
  const sm = new AWS.SecretsManager();
  const cookieSecret = await sm
    .getSecretValue({ SecretId: `LftKeyCookieSecret${env === "dev" ? "Dev" : ""}` })
    .promise();
  console.log("Cookie Secret", cookieSecret.SecretString);

  if ("error" in openIdJson) {
    return {
      statusCode: 403,
      body: JSON.stringify(openIdJson),
      headers: getHeaders(event),
    };
  }

  // { error: 'invalid_request', error_description: 'Invalid Credentials' }

  await GoogleAuthTokenDao.store(env, token, openIdJson.sub);
  let user = await UserDao.getByGoogleId(env, openIdJson.sub);
  let userId = user?.id;

  if (userId == null) {
    userId = UidFactory.generateUid(12);
    user = UserDao.build(userId, openIdJson.sub, openIdJson.email);
    await UserDao.store(env, user);
  }

  const session = JWT.sign({ userId: userId }, process.env.COOKIE_SECRET!);
  const resp = { email: openIdJson.email, user_id: userId, storage: {} };

  return {
    statusCode: 200,
    body: JSON.stringify(resp),
    headers: {
      ...getHeaders(event),
      "set-cookie": Cookie.serialize("session", session, {
        httpOnly: true,
        domain: ".liftosaur.com",
        path: "/",
        expires: new Date(new Date().getFullYear() + 10, 0, 1),
      }),
    },
  };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const r = new Router();
  console.log(event.httpMethod, event.path);
  r.post(".*/api/signin/google", googleLoginHandler);
  const resp = await r.route(event);
  return resp;
};

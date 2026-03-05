import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Endpoint, RouteHandler } from "yatro";
import { IDI } from "../utils/di";
import { withApiAuth, ResponseUtils_apiJson, apiError } from "../utils/apiKeyAuth";
import {
  ApiV1_getHistory,
  ApiV1_createHistory,
  ApiV1_updateHistory,
  ApiV1_deleteHistory,
  ApiV1_listPrograms,
  ApiV1_getProgram,
  ApiV1_createProgram,
  ApiV1_updateProgram,
  ApiV1_deleteProgram,
  ApiV1_playground,
  IApiError,
} from "../utils/apiv1";

interface IPayload {
  event: APIGatewayProxyEvent;
  di: IDI;
}

function getBodyJson(event: APIGatewayProxyEvent): Record<string, unknown> {
  try {
    return JSON.parse(Buffer.from(event.body || "e30=", "base64").toString("utf8"));
  } catch (e) {
    return JSON.parse(event.body || "{}");
  }
}

function apiErrorFromResult(e: IApiError): APIGatewayProxyResult {
  return apiError(e.status, e.code, e.message, e.details);
}

function resultToResponse<T>(
  result: { success: true; data: T } | { success: false; error: IApiError },
  status: number = 200
): APIGatewayProxyResult {
  if (!result.success) {
    return apiErrorFromResult(result.error);
  }
  return ResponseUtils_apiJson(status, { data: result.data });
}

// --- History Endpoints ---

export const getV1HistoryEndpoint = Endpoint.build("/api/v1/history", {
  startDate: "string?",
  endDate: "string?",
  limit: "string?",
  cursor: "string?",
});
export const getV1HistoryHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getV1HistoryEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  return withApiAuth(event, di, async (auth) => {
    return resultToResponse(await ApiV1_getHistory(auth.userId, auth.user, params, di));
  });
};

export const postV1HistoryEndpoint = Endpoint.build("/api/v1/history");
export const postV1HistoryHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof postV1HistoryEndpoint
> = async ({ payload }) => {
  const { event, di } = payload;
  return withApiAuth(event, di, async (auth) => {
    const body = getBodyJson(event);
    if (!body.text) {
      return apiError(400, "invalid_input", "Missing 'text' field");
    }
    return resultToResponse(await ApiV1_createHistory(auth.userId, auth.user, body.text as string, di), 201);
  });
};

export const putV1HistoryEndpoint = Endpoint.build("/api/v1/history/:id");
export const putV1HistoryHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof putV1HistoryEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  return withApiAuth(event, di, async (auth) => {
    const body = getBodyJson(event);
    if (!body.text) {
      return apiError(400, "invalid_input", "Missing 'text' field");
    }
    return resultToResponse(
      await ApiV1_updateHistory(auth.userId, auth.user, parseInt(params.id, 10), body.text as string, di)
    );
  });
};

export const deleteV1HistoryEndpoint = Endpoint.build("/api/v1/history/:id");
export const deleteV1HistoryHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof deleteV1HistoryEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  return withApiAuth(event, di, async (auth) => {
    return resultToResponse(await ApiV1_deleteHistory(auth.userId, auth.user, parseInt(params.id, 10), di));
  });
};

// --- Program Endpoints ---

export const getV1ProgramsEndpoint = Endpoint.build("/api/v1/programs");
export const getV1ProgramsHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getV1ProgramsEndpoint
> = async ({ payload }) => {
  const { event, di } = payload;
  return withApiAuth(event, di, async (auth) => {
    return resultToResponse(await ApiV1_listPrograms(auth.userId, auth.user, di));
  });
};

export const getV1ProgramEndpoint = Endpoint.build("/api/v1/programs/:id");
export const getV1ProgramHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getV1ProgramEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  return withApiAuth(event, di, async (auth) => {
    return resultToResponse(await ApiV1_getProgram(auth.userId, auth.user, params.id, di));
  });
};

export const postV1ProgramEndpoint = Endpoint.build("/api/v1/programs");
export const postV1ProgramHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof postV1ProgramEndpoint
> = async ({ payload }) => {
  const { event, di } = payload;
  return withApiAuth(event, di, async (auth) => {
    const body = getBodyJson(event);
    if (!body.text) {
      return apiError(400, "invalid_input", "Missing 'text' field");
    }
    return resultToResponse(
      await ApiV1_createProgram(auth.userId, auth.user, (body.name as string) || "New Program", body.text as string, di),
      201
    );
  });
};

export const putV1ProgramEndpoint = Endpoint.build("/api/v1/programs/:id");
export const putV1ProgramHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof putV1ProgramEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  return withApiAuth(event, di, async (auth) => {
    const body = getBodyJson(event);
    if (!body.text) {
      return apiError(400, "invalid_input", "Missing 'text' field");
    }
    return resultToResponse(
      await ApiV1_updateProgram(auth.userId, auth.user, params.id, body.text as string, body.name as string | undefined, di)
    );
  });
};

export const deleteV1ProgramEndpoint = Endpoint.build("/api/v1/programs/:id");
export const deleteV1ProgramHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof deleteV1ProgramEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  return withApiAuth(event, di, async (auth) => {
    return resultToResponse(await ApiV1_deleteProgram(auth.userId, auth.user, params.id, di));
  });
};

// --- Playground Endpoint ---

export const postV1PlaygroundEndpoint = Endpoint.build("/api/v1/playground");
export const postV1PlaygroundHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof postV1PlaygroundEndpoint
> = async ({ payload }) => {
  const { event, di } = payload;
  return withApiAuth(event, di, async (auth) => {
    const body = getBodyJson(event);
    if (!body.programText) {
      return apiError(400, "invalid_input", "Missing 'programText' field");
    }
    return resultToResponse(
      ApiV1_playground(auth.user, {
        programText: body.programText as string,
        day: body.day as number | undefined,
        week: body.week as number | undefined,
        commands: body.commands as string[] | undefined,
      })
    );
  });
};

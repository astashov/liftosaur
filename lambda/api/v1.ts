import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Endpoint, RouteHandler } from "yatro";
import { IDI } from "../utils/di";
import { withApiAuth, ResponseUtils_apiJson, apiError, IApiKeyAuthResult } from "../utils/apiKeyAuth";
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
  ApiV1_programStats,
  ApiV1_getStats,
  ApiV1_createStats,
  ApiV1_deleteStats,
  IApiError,
  ICreateStatInput,
} from "../utils/apiv1";
import { EventDao } from "../dao/eventDao";

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

function withApiAuthAndEvent(
  event: APIGatewayProxyEvent,
  di: IDI,
  eventName: string,
  handler: (auth: IApiKeyAuthResult) => Promise<APIGatewayProxyResult>
): Promise<APIGatewayProxyResult> {
  return withApiAuth(event, di, async (auth) => {
    new EventDao(di).post({
      type: "event",
      userId: auth.userId,
      timestamp: Date.now(),
      name: eventName,
      commithash: process.env.COMMIT_HASH ?? "",
    });
    return handler(auth);
  });
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
  return withApiAuthAndEvent(event, di, "api-v1-get-history", async (auth) => {
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
  return withApiAuthAndEvent(event, di, "api-v1-create-history", async (auth) => {
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
  return withApiAuthAndEvent(event, di, "api-v1-update-history", async (auth) => {
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
  return withApiAuthAndEvent(event, di, "api-v1-delete-history", async (auth) => {
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
  return withApiAuthAndEvent(event, di, "api-v1-list-programs", async (auth) => {
    return resultToResponse(await ApiV1_listPrograms(auth.userId, auth.user, di));
  });
};

export const getV1ProgramEndpoint = Endpoint.build("/api/v1/programs/:id");
export const getV1ProgramHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getV1ProgramEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-get-program", async (auth) => {
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
  return withApiAuthAndEvent(event, di, "api-v1-create-program", async (auth) => {
    const body = getBodyJson(event);
    if (!body.text) {
      return apiError(400, "invalid_input", "Missing 'text' field");
    }
    return resultToResponse(
      await ApiV1_createProgram(
        auth.userId,
        auth.user,
        (body.name as string) || "New Program",
        body.text as string,
        di
      ),
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
  return withApiAuthAndEvent(event, di, "api-v1-update-program", async (auth) => {
    const body = getBodyJson(event);
    if (!body.text) {
      return apiError(400, "invalid_input", "Missing 'text' field");
    }
    return resultToResponse(
      await ApiV1_updateProgram(
        auth.userId,
        auth.user,
        params.id,
        body.text as string,
        body.name as string | undefined,
        di
      )
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
  return withApiAuthAndEvent(event, di, "api-v1-delete-program", async (auth) => {
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
  return withApiAuthAndEvent(event, di, "api-v1-playground", async (auth) => {
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

// --- Program Stats Endpoint ---

export const postV1ProgramStatsEndpoint = Endpoint.build("/api/v1/program-stats");
export const postV1ProgramStatsHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof postV1ProgramStatsEndpoint
> = async ({ payload }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-program-stats", async (auth) => {
    const body = getBodyJson(event);
    if (!body.programText) {
      return apiError(400, "invalid_input", "Missing 'programText' field");
    }
    return resultToResponse(ApiV1_programStats(auth.user, body.programText as string));
  });
};

// --- Stats Endpoints ---

export const getV1StatsEndpoint = Endpoint.build("/api/v1/stats", {
  type: "string?",
  name: "string?",
});
export const getV1StatsHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getV1StatsEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-get-stats", async (auth) => {
    return resultToResponse(await ApiV1_getStats(auth.userId, params, di));
  });
};

export const postV1StatsEndpoint = Endpoint.build("/api/v1/stats");
export const postV1StatsHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof postV1StatsEndpoint> = async ({
  payload,
}) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-create-stats", async (auth) => {
    const body = getBodyJson(event);
    if (!body.measurements || !Array.isArray(body.measurements) || body.measurements.length === 0) {
      return apiError(400, "invalid_input", "Missing 'measurements' array");
    }
    return resultToResponse(
      await ApiV1_createStats(
        auth.userId,
        auth.user,
        body.measurements as ICreateStatInput[],
        body.timestamp as number | undefined,
        di
      ),
      201
    );
  });
};

export const deleteV1StatsEndpoint = Endpoint.build("/api/v1/stats/:timestamp", { name: "string?" });
export const deleteV1StatsHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof deleteV1StatsEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-delete-stats", async (auth) => {
    const name = params.name;
    if (!name) {
      return apiError(400, "invalid_input", "Missing 'name' query parameter");
    }
    return resultToResponse(
      await ApiV1_deleteStats(auth.userId, auth.user, parseInt(params.timestamp, 10), name, di)
    );
  });
};

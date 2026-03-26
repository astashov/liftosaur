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
  ApiV1_listCustomExercises,
  ApiV1_getCustomExercise,
  ApiV1_createCustomExercise,
  ApiV1_updateCustomExercise,
  ApiV1_deleteCustomExercise,
  ApiV1_playground,
  ApiV1_programStats,
  IApiError,
} from "../utils/apiv1";
import { EventDao } from "../dao/eventDao";
import { availableMuscles, exerciseKinds, IExerciseKind, IMuscle } from "../../src/types";

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

function getOptionalStringArray(
  body: Record<string, unknown>,
  field: string
): { value?: string[]; error?: APIGatewayProxyResult } {
  const raw = body[field];
  if (raw == null) {
    return {};
  }
  if (!Array.isArray(raw) || raw.some((v) => typeof v !== "string")) {
    return { error: apiError(400, "invalid_input", `Field '${field}' must be an array of strings`) };
  }
  return { value: raw as string[] };
}

function getOptionalEnumArray<T extends string>(
  body: Record<string, unknown>,
  field: string,
  allowedValues: readonly T[]
): { value?: T[]; error?: APIGatewayProxyResult } {
  const parsed = getOptionalStringArray(body, field);
  if (parsed.error) {
    return { error: parsed.error };
  }
  if (!parsed.value) {
    return {};
  }
  const invalid = parsed.value.find((v) => !allowedValues.includes(v as T));
  if (invalid) {
    return {
      error: apiError(
        400,
        "invalid_input",
        `Field '${field}' contains invalid value '${invalid}'. Allowed values: ${allowedValues.join(", ")}`
      ),
    };
  }
  return { value: parsed.value as T[] };
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

// --- Custom Exercise Endpoints ---

export const getV1CustomExercisesEndpoint = Endpoint.build("/api/v1/custom-exercises", {
  limit: "string?",
  cursor: "string?",
});
export const getV1CustomExercisesHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getV1CustomExercisesEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-list-custom-exercises", async (auth) => {
    return resultToResponse(ApiV1_listCustomExercises(auth.user, params));
  });
};

export const getV1CustomExerciseEndpoint = Endpoint.build("/api/v1/custom-exercises/:id");
export const getV1CustomExerciseHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getV1CustomExerciseEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-get-custom-exercise", async (auth) => {
    return resultToResponse(ApiV1_getCustomExercise(auth.user, params.id));
  });
};

export const postV1CustomExerciseEndpoint = Endpoint.build("/api/v1/custom-exercises");
export const postV1CustomExerciseHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof postV1CustomExerciseEndpoint
> = async ({ payload }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-create-custom-exercise", async (auth) => {
    const body = getBodyJson(event);
    if (!body.name || typeof body.name !== "string") {
      return apiError(400, "invalid_input", "Missing 'name' field");
    }

    const targetMuscles = getOptionalEnumArray<IMuscle>(body, "targetMuscles", availableMuscles);
    if (targetMuscles.error) {
      return targetMuscles.error;
    }
    const synergistMuscles = getOptionalEnumArray<IMuscle>(body, "synergistMuscles", availableMuscles);
    if (synergistMuscles.error) {
      return synergistMuscles.error;
    }
    const types = getOptionalEnumArray<IExerciseKind>(body, "types", exerciseKinds);
    if (types.error) {
      return types.error;
    }

    return resultToResponse(
      await ApiV1_createCustomExercise(
        auth.userId,
        auth.user,
        body.name as string,
        targetMuscles.value || [],
        synergistMuscles.value || [],
        types.value || [],
        di
      ),
      201
    );
  });
};

export const putV1CustomExerciseEndpoint = Endpoint.build("/api/v1/custom-exercises/:id");
export const putV1CustomExerciseHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof putV1CustomExerciseEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-update-custom-exercise", async (auth) => {
    const body = getBodyJson(event);
    if (body.name != null && typeof body.name !== "string") {
      return apiError(400, "invalid_input", "Field 'name' must be a string");
    }

    const targetMuscles = getOptionalEnumArray<IMuscle>(body, "targetMuscles", availableMuscles);
    if (targetMuscles.error) {
      return targetMuscles.error;
    }
    const synergistMuscles = getOptionalEnumArray<IMuscle>(body, "synergistMuscles", availableMuscles);
    if (synergistMuscles.error) {
      return synergistMuscles.error;
    }
    const types = getOptionalEnumArray<IExerciseKind>(body, "types", exerciseKinds);
    if (types.error) {
      return types.error;
    }

    return resultToResponse(
      await ApiV1_updateCustomExercise(
        auth.userId,
        auth.user,
        params.id,
        {
          name: typeof body.name === "string" ? body.name : undefined,
          targetMuscles: targetMuscles.value,
          synergistMuscles: synergistMuscles.value,
          types: types.value,
        },
        di
      )
    );
  });
};

export const deleteV1CustomExerciseEndpoint = Endpoint.build("/api/v1/custom-exercises/:id");
export const deleteV1CustomExerciseHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof deleteV1CustomExerciseEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-delete-custom-exercise", async (auth) => {
    return resultToResponse(await ApiV1_deleteCustomExercise(auth.userId, auth.user, params.id, di));
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

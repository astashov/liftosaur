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
  IApiError,
} from "../utils/apiv1";
import {
  ApiV1_listGyms,
  ApiV1_createGym,
  ApiV1_updateGym,
  ApiV1_deleteGym,
  ApiV1_listEquipment,
  ApiV1_getEquipment,
  ApiV1_updateEquipment,
  ApiV1_createCustomEquipment,
} from "../utils/apiv1Equipment";
import {
  ApiV1_listExerciseData,
  ApiV1_getExerciseData,
  ApiV1_setExerciseData,
  ApiV1_deleteExerciseData,
} from "../utils/apiv1ExerciseData";
import {
  ApiV1_listMeasurements,
  ApiV1_getMeasurement,
  ApiV1_addMeasurement,
  ApiV1_updateMeasurement,
  ApiV1_deleteMeasurement,
} from "../utils/apiv1Measurements";
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

// --- Gym Endpoints ---

export const getV1GymsEndpoint = Endpoint.build("/api/v1/gyms");
export const getV1GymsHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getV1GymsEndpoint> = async ({
  payload,
}) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-list-gyms", async (auth) => {
    return resultToResponse(ApiV1_listGyms(auth.user));
  });
};

export const postV1GymEndpoint = Endpoint.build("/api/v1/gyms");
export const postV1GymHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof postV1GymEndpoint> = async ({
  payload,
}) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-create-gym", async (auth) => {
    const body = getBodyJson(event);
    if (!body.name) {
      return apiError(400, "invalid_input", "Missing 'name' field");
    }
    return resultToResponse(await ApiV1_createGym(auth.userId, auth.user, body.name as string, di), 201);
  });
};

export const putV1GymEndpoint = Endpoint.build("/api/v1/gyms/:id");
export const putV1GymHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof putV1GymEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-update-gym", async (auth) => {
    const body = getBodyJson(event);
    return resultToResponse(await ApiV1_updateGym(auth.userId, auth.user, params.id, body, di));
  });
};

export const deleteV1GymEndpoint = Endpoint.build("/api/v1/gyms/:id");
export const deleteV1GymHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof deleteV1GymEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-delete-gym", async (auth) => {
    return resultToResponse(await ApiV1_deleteGym(auth.userId, auth.user, params.id, di));
  });
};

// --- Equipment Endpoints ---

export const getV1EquipmentListEndpoint = Endpoint.build("/api/v1/gyms/:gymId/equipment");
export const getV1EquipmentListHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getV1EquipmentListEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-list-equipment", async (auth) => {
    return resultToResponse(ApiV1_listEquipment(auth.user, params.gymId));
  });
};

export const getV1EquipmentEndpoint = Endpoint.build("/api/v1/gyms/:gymId/equipment/:id");
export const getV1EquipmentHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getV1EquipmentEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-get-equipment", async (auth) => {
    return resultToResponse(ApiV1_getEquipment(auth.user, params.gymId, params.id));
  });
};

export const postV1EquipmentEndpoint = Endpoint.build("/api/v1/gyms/:gymId/equipment");
export const postV1EquipmentHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof postV1EquipmentEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-create-equipment", async (auth) => {
    const body = getBodyJson(event);
    if (!body.name) {
      return apiError(400, "invalid_input", "Missing 'name' field");
    }
    return resultToResponse(
      await ApiV1_createCustomEquipment(auth.userId, auth.user, params.gymId, body.name as string, body, di),
      201
    );
  });
};

export const putV1EquipmentEndpoint = Endpoint.build("/api/v1/gyms/:gymId/equipment/:id");
export const putV1EquipmentHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof putV1EquipmentEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-update-equipment", async (auth) => {
    const body = getBodyJson(event);
    return resultToResponse(await ApiV1_updateEquipment(auth.userId, auth.user, params.gymId, params.id, body, di));
  });
};

// --- Exercise Data Endpoints ---

export const getV1ExerciseDataListEndpoint = Endpoint.build("/api/v1/exercise-data");
export const getV1ExerciseDataListHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getV1ExerciseDataListEndpoint
> = async ({ payload }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-list-exercise-data", async (auth) => {
    return resultToResponse(ApiV1_listExerciseData(auth.user));
  });
};

export const getV1ExerciseDataEndpoint = Endpoint.build("/api/v1/exercise-data/:key");
export const getV1ExerciseDataHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getV1ExerciseDataEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-get-exercise-data", async (auth) => {
    return resultToResponse(ApiV1_getExerciseData(auth.user, params.key));
  });
};

export const putV1ExerciseDataEndpoint = Endpoint.build("/api/v1/exercise-data/:key");
export const putV1ExerciseDataHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof putV1ExerciseDataEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-set-exercise-data", async (auth) => {
    const body = getBodyJson(event);
    return resultToResponse(await ApiV1_setExerciseData(auth.userId, auth.user, params.key, body, di));
  });
};

export const deleteV1ExerciseDataEndpoint = Endpoint.build("/api/v1/exercise-data/:key");
export const deleteV1ExerciseDataHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof deleteV1ExerciseDataEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-delete-exercise-data", async (auth) => {
    return resultToResponse(await ApiV1_deleteExerciseData(auth.userId, auth.user, params.key, di));
  });
};

// --- Measurements Endpoints ---

export const getV1MeasurementsListEndpoint = Endpoint.build("/api/v1/measurements");
export const getV1MeasurementsListHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getV1MeasurementsListEndpoint
> = async ({ payload }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-list-measurements", async (auth) => {
    return resultToResponse(await ApiV1_listMeasurements(auth.userId, auth.user, di));
  });
};

export const getV1MeasurementEndpoint = Endpoint.build("/api/v1/measurements/:key", {
  limit: "string?",
  cursor: "string?",
});
export const getV1MeasurementHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getV1MeasurementEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-get-measurement", async (auth) => {
    return resultToResponse(
      await ApiV1_getMeasurement(auth.userId, auth.user, params.key, { limit: params.limit, cursor: params.cursor }, di)
    );
  });
};

export const postV1MeasurementEndpoint = Endpoint.build("/api/v1/measurements/:key");
export const postV1MeasurementHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof postV1MeasurementEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-add-measurement", async (auth) => {
    const body = getBodyJson(event);
    return resultToResponse(
      await ApiV1_addMeasurement(
        auth.userId,
        auth.user,
        params.key,
        { value: body.value, timestamp: body.timestamp },
        di
      ),
      201
    );
  });
};

export const putV1MeasurementEndpoint = Endpoint.build("/api/v1/measurements/:key/:timestamp");
export const putV1MeasurementHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof putV1MeasurementEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-update-measurement", async (auth) => {
    const body = getBodyJson(event);
    return resultToResponse(
      await ApiV1_updateMeasurement(auth.userId, auth.user, params.key, params.timestamp, { value: body.value }, di)
    );
  });
};

export const deleteV1MeasurementEndpoint = Endpoint.build("/api/v1/measurements/:key/:timestamp");
export const deleteV1MeasurementHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof deleteV1MeasurementEndpoint
> = async ({ payload, match: { params } }) => {
  const { event, di } = payload;
  return withApiAuthAndEvent(event, di, "api-v1-delete-measurement", async (auth) => {
    return resultToResponse(await ApiV1_deleteMeasurement(auth.userId, auth.user, params.key, params.timestamp, di));
  });
};

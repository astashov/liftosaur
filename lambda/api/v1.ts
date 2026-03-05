import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Endpoint, RouteHandler } from "yatro";
import { UserDao } from "../dao/userDao";
import { IDI } from "../utils/di";
import { withApiAuth, ResponseUtils_apiJson, apiError } from "../utils/apiKeyAuth";
import { LiftohistorySerializer_serialize } from "../../src/liftohistory/liftohistorySerializer";
import {
  LiftohistoryDeserializer_deserialize,
  LiftohistorySyntaxError,
} from "../../src/liftohistory/liftohistoryDeserializer";
import {
  PlannerProgram_generateFullText,
  PlannerProgram_evaluateText,
  PlannerProgram_evaluateFull,
} from "../../src/pages/planner/models/plannerProgram";
import { PlannerSyntaxError } from "../../src/pages/planner/plannerExerciseEvaluator";
import { IProgram, ISettings } from "../../src/types";
import { UidFactory_generateUid } from "../utils/generator";
import { Playground_run, Playground_validateProgramText } from "../../src/playground/playground";

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

function syntaxErrorDetails(
  errors: (LiftohistorySyntaxError | PlannerSyntaxError)[]
): { line: number; offset: number; from: number; to: number; message: string }[] {
  return errors.map((e) => ({ line: e.line, offset: e.offset, from: e.from, to: e.to, message: e.message }));
}

// --- History Endpoints (API-key-authed) ---

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
    const userDao = new UserDao(di);
    const settings = auth.user.storage.settings;
    const limit = Math.min(parseInt(params.limit || "50", 10) || 50, 200);
    const cursor = params.cursor ? parseInt(params.cursor, 10) : undefined;

    let history;
    if (params.startDate) {
      const startDate = parseDate(params.startDate);
      const endDate = params.endDate ? parseDate(params.endDate) : undefined;
      const result = await userDao.getUserAndHistory(auth.userId, startDate, endDate);
      history = result?.storage.history || [];
    } else {
      history = await userDao.getHistoryByUserId(auth.userId, { limit: limit + 1, after: cursor });
    }

    const hasMore = history.length > limit;
    const records = history.slice(0, limit);
    const nextCursor = hasMore && records.length > 0 ? records[records.length - 1].id : undefined;

    return ResponseUtils_apiJson(200, {
      data: {
        records: records.map((r) => ({ id: r.id, text: LiftohistorySerializer_serialize(r, settings) })),
        hasMore,
        nextCursor,
      },
    });
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
    const settings = auth.user.storage.settings;
    const result = LiftohistoryDeserializer_deserialize(body.text as string, settings);
    if (!result.success) {
      return apiError(422, "parse_error", "Failed to parse history record", syntaxErrorDetails(result.error));
    }
    if (result.data.historyRecords.length !== 1) {
      return apiError(400, "invalid_input", "Expected exactly one history record");
    }

    const record = result.data.historyRecords[0];
    const userDao = new UserDao(di);
    const history = await userDao.getHistoryByUserId(auth.userId);
    auth.user.storage = { ...auth.user.storage, history };
    await userDao.applyStorageUpdate(auth.user, (old) => ({ ...old, history: [...(old.history || []), record] }), [
      userDao.saveHistoryRecord(auth.userId, record),
    ]);

    return ResponseUtils_apiJson(201, {
      data: { id: record.id, text: LiftohistorySerializer_serialize(record, settings) },
    });
  });
};

export const putV1HistoryEndpoint = Endpoint.build("/api/v1/history/:id");
export const putV1HistoryHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof putV1HistoryEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  return withApiAuth(event, di, async (auth) => {
    const recordId = parseInt(params.id, 10);
    const body = getBodyJson(event);
    if (!body.text) {
      return apiError(400, "invalid_input", "Missing 'text' field");
    }
    const settings = auth.user.storage.settings;
    const result = LiftohistoryDeserializer_deserialize(body.text as string, settings);
    if (!result.success) {
      return apiError(422, "parse_error", "Failed to parse history record", syntaxErrorDetails(result.error));
    }
    if (result.data.historyRecords.length !== 1) {
      return apiError(400, "invalid_input", "Expected exactly one history record");
    }

    const userDao = new UserDao(di);
    const existing = await userDao.getHistoryByUserId(auth.userId, { ids: [recordId] });
    if (existing.length === 0) {
      return apiError(404, "not_found", "History record not found");
    }

    const record = { ...result.data.historyRecords[0], id: recordId };
    const history = await userDao.getHistoryByUserId(auth.userId);
    auth.user.storage = { ...auth.user.storage, history };
    await userDao.applyStorageUpdate(
      auth.user,
      (old) => ({ ...old, history: (old.history || []).map((h) => (h.id === recordId ? record : h)) }),
      [userDao.saveHistoryRecord(auth.userId, record)]
    );

    return ResponseUtils_apiJson(200, {
      data: { id: record.id, text: LiftohistorySerializer_serialize(record, settings) },
    });
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
    const recordId = parseInt(params.id, 10);
    const userDao = new UserDao(di);
    const existing = await userDao.getHistoryByUserId(auth.userId, { ids: [recordId] });
    if (existing.length === 0) {
      return apiError(404, "not_found", "History record not found");
    }

    const history = await userDao.getHistoryByUserId(auth.userId);
    auth.user.storage = { ...auth.user.storage, history };
    await userDao.applyStorageUpdate(
      auth.user,
      (old) => ({ ...old, history: (old.history || []).filter((h) => h.id !== recordId) }),
      [userDao.deleteHistoryRecord(auth.userId, recordId)]
    );

    return ResponseUtils_apiJson(200, { data: { deleted: true } });
  });
};

// --- Program Endpoints (API-key-authed) ---

export const getV1ProgramsEndpoint = Endpoint.build("/api/v1/programs");
export const getV1ProgramsHandler: RouteHandler<
  IPayload,
  APIGatewayProxyResult,
  typeof getV1ProgramsEndpoint
> = async ({ payload }) => {
  const { event, di } = payload;
  return withApiAuth(event, di, async (auth) => {
    const userDao = new UserDao(di);
    const programs = await userDao.getProgramsByUserId(auth.userId);
    const currentProgramId = auth.user.storage.currentProgramId;
    return ResponseUtils_apiJson(200, {
      data: {
        programs: programs.map((p) => ({ id: p.id, name: p.name, isCurrent: p.id === currentProgramId })),
      },
    });
  });
};

export const getV1ProgramEndpoint = Endpoint.build("/api/v1/programs/:id");
export const getV1ProgramHandler: RouteHandler<IPayload, APIGatewayProxyResult, typeof getV1ProgramEndpoint> = async ({
  payload,
  match: { params },
}) => {
  const { event, di } = payload;
  return withApiAuth(event, di, async (auth) => {
    const userDao = new UserDao(di);
    const programId = params.id === "current" ? auth.user.storage.currentProgramId : params.id;
    if (!programId) {
      return apiError(404, "not_found", "No current program set");
    }
    const program = await userDao.getProgram(auth.userId, programId);
    if (!program) {
      return apiError(404, "not_found", "Program not found");
    }
    return programToResponse(program, auth.user.storage.currentProgramId || "");
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
    const settings = auth.user.storage.settings;
    const validation = validateProgramText(body.text as string, settings);
    if (validation) {
      return validation;
    }

    const weeks = PlannerProgram_evaluateText(body.text as string);
    const name = (body.name as string) || "New Program";
    const program: IProgram = {
      vtype: "program" as const,
      id: UidFactory_generateUid(8),
      name,
      url: "",
      author: "",
      shortDescription: "",
      description: "",
      nextDay: 1,
      exercises: [],
      days: [],
      weeks: [],
      isMultiweek: weeks.length > 1,
      tags: [],
      clonedAt: Date.now(),
      planner: { vtype: "planner" as const, name, weeks },
    };

    const userDao = new UserDao(di);
    const programs = await userDao.getProgramsByUserId(auth.userId);
    auth.user.storage = { ...auth.user.storage, programs };
    await userDao.applyStorageUpdate(auth.user, (old) => ({ ...old, programs: [...(old.programs || []), program] }), [
      userDao.saveProgram(auth.userId, program),
    ]);

    return ResponseUtils_apiJson(201, {
      data: { id: program.id, name: program.name, text: body.text },
    });
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
    const settings = auth.user.storage.settings;
    const validation = validateProgramText(body.text as string, settings);
    if (validation) {
      return validation;
    }

    const userDao = new UserDao(di);
    const programId = params.id === "current" ? auth.user.storage.currentProgramId : params.id;
    if (!programId) {
      return apiError(404, "not_found", "No current program set");
    }
    const existing = await userDao.getProgram(auth.userId, programId);
    if (!existing) {
      return apiError(404, "not_found", "Program not found");
    }

    const weeks = PlannerProgram_evaluateText(body.text as string);
    const updatedProgram: IProgram = {
      ...existing,
      name: (body.name as string) || existing.name,
      planner: {
        vtype: "planner" as const,
        name: (body.name as string) || existing.planner?.name || existing.name,
        weeks,
      },
    };

    const programs = await userDao.getProgramsByUserId(auth.userId);
    auth.user.storage = { ...auth.user.storage, programs };
    await userDao.applyStorageUpdate(
      auth.user,
      (old) => ({ ...old, programs: (old.programs || []).map((p) => (p.id === programId ? updatedProgram : p)) }),
      [userDao.saveProgram(auth.userId, updatedProgram)]
    );

    return programToResponse(updatedProgram, auth.user.storage.currentProgramId || "");
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
    const programId = params.id;
    if (programId === auth.user.storage.currentProgramId) {
      return apiError(400, "invalid_input", "Cannot delete the current program");
    }
    const userDao = new UserDao(di);
    const existing = await userDao.getProgram(auth.userId, programId);
    if (!existing) {
      return apiError(404, "not_found", "Program not found");
    }

    const programs = await userDao.getProgramsByUserId(auth.userId);
    auth.user.storage = { ...auth.user.storage, programs };
    await userDao.applyStorageUpdate(
      auth.user,
      (old) => ({ ...old, programs: (old.programs || []).filter((p) => p.id !== programId) }),
      [userDao.deleteProgram(auth.userId, programId)]
    );

    return ResponseUtils_apiJson(200, { data: { deleted: true } });
  });
};

// --- Playground Endpoint (API-key-authed) ---

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
    const settings = auth.user.storage.settings;
    const stats = auth.user.storage.stats || { weight: {}, length: {}, percentage: {} };

    const validationErrors = Playground_validateProgramText(body.programText as string, settings);
    if (validationErrors) {
      return apiError(422, "parse_error", "Failed to parse program", validationErrors);
    }

    const result = Playground_run(
      {
        programText: body.programText as string,
        day: body.day as number | undefined,
        week: body.week as number | undefined,
        commands: body.commands as string[] | undefined,
      },
      settings,
      stats
    );

    if (!result.success) {
      return apiError(400, "invalid_input", result.error);
    }

    return ResponseUtils_apiJson(200, { data: result.data });
  });
};

// --- Helpers ---

function parseDate(dateStr: string): string {
  const asNum = Number(dateStr);
  if (!isNaN(asNum) && asNum > 1000000000) {
    return new Date(asNum > 9999999999 ? asNum : asNum * 1000).toISOString();
  }
  return new Date(dateStr).toISOString();
}

function programToResponse(program: IProgram, currentProgramId: string): APIGatewayProxyResult {
  if (!program.planner) {
    return apiError(400, "invalid_input", "Program uses legacy format and cannot be represented as text");
  }
  const text = PlannerProgram_generateFullText(program.planner.weeks);
  return ResponseUtils_apiJson(200, {
    data: { id: program.id, name: program.name, text, isCurrent: program.id === currentProgramId },
  });
}

function validateProgramText(text: string, settings: ISettings): APIGatewayProxyResult | undefined {
  const { evaluatedWeeks } = PlannerProgram_evaluateFull(text, settings);
  if (!evaluatedWeeks.success) {
    return apiError(422, "parse_error", "Failed to parse program", syntaxErrorDetails([evaluatedWeeks.error]));
  }
  return undefined;
}

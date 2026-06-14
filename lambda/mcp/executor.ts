import { ILimitedUserDao } from "../dao/userDao";
import { IDI } from "../utils/di";
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
  ApiV1_listCustomExercises,
  ApiV1_getCustomExercise,
  ApiV1_createCustomExercise,
  ApiV1_updateCustomExercise,
  ApiV1_deleteCustomExercise,
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
  IWritableEquipmentField,
} from "../utils/apiv1Equipment";
import { IEither } from "../../src/utils/types";
import { IMuscle, IExerciseKind } from "../../src/types";

type IToolResult = IEither<unknown, IApiError>;

function err(status: number, code: string, message: string): IToolResult {
  return { success: false, error: { status, code, message } };
}

// These coercers accept both native JSON values (from MCP clients that honor the structured schema) and
// the stringified forms (clients that pass escaped JSON / "true" / "2"). Anything that isn't a recognized
// form is passed through UNCHANGED so the downstream valibot schema rejects it with a 400 — never silently
// coerced into a wrong value (e.g. "yes" must not become false, "abc" must not become NaN).
const asBool = (raw: unknown): unknown => {
  if (typeof raw === "boolean") {
    return raw;
  }
  if (raw === "true") {
    return true;
  }
  if (raw === "false") {
    return false;
  }
  return raw;
};
const asJson = (raw: unknown): unknown => (typeof raw === "string" ? JSON.parse(raw) : raw);
const asNumber = (raw: unknown): unknown => {
  if (typeof raw === "number") {
    return raw;
  }
  if (typeof raw === "string" && raw.trim() !== "" && isFinite(Number(raw))) {
    return Number(raw);
  }
  return raw;
};

// One entry per writable equipment field — keyed by IWritableEquipmentField so a new writable field
// added to IEquipmentData/the API schema is a compile error here until MCP arg-parsing is added for it.
const EQUIPMENT_ARG_PARSERS: Record<IWritableEquipmentField, (raw: unknown) => unknown> = {
  bar: asJson,
  plates: asJson,
  fixed: asJson,
  multiplier: asNumber,
  isFixed: asBool,
  unit: (raw) => raw,
  name: (raw) => raw,
  notes: (raw) => raw,
  similarTo: (raw) => raw,
  useBodyweightForBar: asBool,
  isAssisting: asBool,
  isDeleted: asBool,
};

function parseEquipmentArgs(args: Record<string, unknown>): { input: Record<string, unknown>; error?: IToolResult } {
  const input: Record<string, unknown> = {};
  try {
    for (const field of Object.keys(EQUIPMENT_ARG_PARSERS) as IWritableEquipmentField[]) {
      if (args[field] != null) {
        input[field] = EQUIPMENT_ARG_PARSERS[field](args[field]);
      }
    }
  } catch (e) {
    return { input, error: err(400, "invalid_input", "bar, plates, and fixed must be valid JSON") };
  }
  return { input };
}

export async function McpToolExecutor_execute(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  user: ILimitedUserDao,
  di: IDI
): Promise<IToolResult> {
  switch (toolName) {
    case "get_history":
      return ApiV1_getHistory(
        userId,
        user,
        {
          startDate: args.startDate as string | undefined,
          endDate: args.endDate as string | undefined,
          limit: args.limit as string | undefined,
          cursor: args.cursor as string | undefined,
        },
        di
      );

    case "get_history_record": {
      const id = parseInt(args.id as string, 10);
      const result = await ApiV1_getHistory(userId, user, { limit: "200" }, di);
      if (!result.success) {
        return result;
      }
      const record = result.data.records.find((r) => r.id === id);
      if (!record) {
        return err(404, "not_found", "History record not found");
      }
      return { success: true, data: record };
    }

    case "create_history_record":
      return ApiV1_createHistory(userId, user, args.text as string, di);

    case "update_history_record":
      return ApiV1_updateHistory(userId, user, parseInt(args.id as string, 10), args.text as string, di);

    case "delete_history_record":
      return ApiV1_deleteHistory(userId, user, parseInt(args.id as string, 10), di);

    case "list_programs":
      return ApiV1_listPrograms(userId, user, di);

    case "get_program":
      return ApiV1_getProgram(userId, user, args.id as string, di);

    case "create_program": {
      const createResult = await ApiV1_createProgram(userId, user, args.name as string, args.text as string, di);
      if (!createResult.success) {
        return createResult;
      }
      const createStats = ApiV1_programStats(user, args.text as string);
      return {
        success: true,
        data: { ...createResult.data, stats: createStats.success ? createStats.data : undefined },
      };
    }

    case "update_program": {
      const updateResult = await ApiV1_updateProgram(
        userId,
        user,
        args.id as string,
        args.text as string,
        args.name as string | undefined,
        di
      );
      if (!updateResult.success) {
        return updateResult;
      }
      const updateStats = ApiV1_programStats(user, args.text as string);
      return {
        success: true,
        data: { ...updateResult.data, stats: updateStats.success ? updateStats.data : undefined },
      };
    }

    case "delete_program":
      return ApiV1_deleteProgram(userId, user, args.id as string, di);

    case "run_playground": {
      const commands = args.commands ? (JSON.parse(args.commands as string) as string[]) : undefined;
      const playgroundResult = ApiV1_playground(user, {
        programText: args.programText as string,
        day: args.day ? parseInt(args.day as string, 10) : undefined,
        week: args.week ? parseInt(args.week as string, 10) : undefined,
        commands,
      });
      if (!playgroundResult.success) {
        return playgroundResult;
      }
      const playgroundStats = ApiV1_programStats(user, args.programText as string);
      return {
        success: true,
        data: { ...playgroundResult.data, stats: playgroundStats.success ? playgroundStats.data : undefined },
      };
    }

    case "list_custom_exercises":
      return ApiV1_listCustomExercises(user, {
        limit: args.limit as string | undefined,
        cursor: args.cursor as string | undefined,
      });

    case "get_custom_exercise":
      return ApiV1_getCustomExercise(user, args.id as string);

    case "create_custom_exercise": {
      const createTargetMuscles = args.targetMuscles ? (JSON.parse(args.targetMuscles as string) as IMuscle[]) : [];
      const createSynergistMuscles = args.synergistMuscles
        ? (JSON.parse(args.synergistMuscles as string) as IMuscle[])
        : [];
      const createTypes = args.types ? (JSON.parse(args.types as string) as IExerciseKind[]) : [];
      return ApiV1_createCustomExercise(
        userId,
        user,
        args.name as string,
        createTargetMuscles,
        createSynergistMuscles,
        createTypes,
        di
      );
    }

    case "update_custom_exercise": {
      const updateFields: {
        name?: string;
        targetMuscles?: IMuscle[];
        synergistMuscles?: IMuscle[];
        types?: IExerciseKind[];
      } = {};
      if (args.name != null) {
        updateFields.name = args.name as string;
      }
      if (args.targetMuscles != null) {
        updateFields.targetMuscles = JSON.parse(args.targetMuscles as string);
      }
      if (args.synergistMuscles != null) {
        updateFields.synergistMuscles = JSON.parse(args.synergistMuscles as string);
      }
      if (args.types != null) {
        updateFields.types = JSON.parse(args.types as string);
      }
      return ApiV1_updateCustomExercise(userId, user, args.id as string, updateFields, di);
    }

    case "delete_custom_exercise":
      return ApiV1_deleteCustomExercise(userId, user, args.id as string, di);

    case "list_gyms":
      return ApiV1_listGyms(user);

    case "create_gym":
      return ApiV1_createGym(userId, user, args.name as string, di);

    case "update_gym":
      return ApiV1_updateGym(
        userId,
        user,
        args.gymId as string,
        {
          name: args.name,
          setCurrent: args.setCurrent != null ? asBool(args.setCurrent) : undefined,
        },
        di
      );

    case "delete_gym":
      return ApiV1_deleteGym(userId, user, args.gymId as string, di);

    case "list_equipment":
      return ApiV1_listEquipment(user, args.gymId as string);

    case "get_equipment":
      return ApiV1_getEquipment(user, args.gymId as string, args.id as string);

    case "update_equipment": {
      const parsed = parseEquipmentArgs(args);
      if (parsed.error) {
        return parsed.error;
      }
      return ApiV1_updateEquipment(userId, user, args.gymId as string, args.id as string, parsed.input, di);
    }

    case "create_custom_equipment": {
      const parsed = parseEquipmentArgs(args);
      if (parsed.error) {
        return parsed.error;
      }
      return ApiV1_createCustomEquipment(userId, user, args.gymId as string, args.name as string, parsed.input, di);
    }

    case "get_program_stats":
      return ApiV1_programStats(user, args.programText as string);

    default:
      return err(400, "unknown_tool", `Unknown tool: ${toolName}`);
  }
}

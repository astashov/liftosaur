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
import { IEither } from "../../src/utils/types";
import { IMuscle, IExerciseKind } from "../../src/types";

type IToolResult = IEither<unknown, IApiError>;

function err(status: number, code: string, message: string): IToolResult {
  return { success: false, error: { status, code, message } };
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

    case "get_program_stats":
      return ApiV1_programStats(user, args.programText as string);

    default:
      return err(400, "unknown_tool", `Unknown tool: ${toolName}`);
  }
}

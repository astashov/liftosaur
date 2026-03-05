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
  IApiError,
} from "../utils/apiv1";
import { IEither } from "../../src/utils/types";

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

    case "create_program":
      return ApiV1_createProgram(userId, user, args.name as string, args.text as string, di);

    case "update_program":
      return ApiV1_updateProgram(
        userId,
        user,
        args.id as string,
        args.text as string,
        args.name as string | undefined,
        di
      );

    case "delete_program":
      return ApiV1_deleteProgram(userId, user, args.id as string, di);

    case "run_playground": {
      const commands = args.commands ? (JSON.parse(args.commands as string) as string[]) : undefined;
      return ApiV1_playground(user, {
        programText: args.programText as string,
        day: args.day ? parseInt(args.day as string, 10) : undefined,
        week: args.week ? parseInt(args.week as string, 10) : undefined,
        commands,
      });
    }

    default:
      return err(400, "unknown_tool", `Unknown tool: ${toolName}`);
  }
}

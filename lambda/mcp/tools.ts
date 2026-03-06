export interface IMcpToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

export const mcpTools: IMcpToolDef[] = [
  // --- History ---
  {
    name: "get_history",
    description:
      'Retrieve workout history records in Liftohistory text format. Example record:\n\n```\n2026-02-28T10:45:30Z / program: "5/3/1" / dayName: "Push Day" / week: 1 / dayInWeek: 5 / duration: 1235s / exercises: {\n  Bench Press, Barbell / 3x8 185lb @7, 1x6 185lb @9 / warmup: 1x10 95lb / target: 3x8-12 185lb @8 90s\n}\n```\n\nUse startDate/endDate (ISO dates or unix timestamps) to filter by date range. Use limit/cursor for pagination (max 200 per page).',
    inputSchema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date filter (ISO date string or unix timestamp)" },
        endDate: { type: "string", description: "End date filter (ISO date string or unix timestamp)" },
        limit: { type: "string", description: "Max records to return (default 50, max 200)" },
        cursor: { type: "string", description: "Pagination cursor from previous response" },
      },
    },
  },
  {
    name: "get_history_record",
    description: "Get a single workout history record by ID. Returns the record in Liftohistory text format.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "History record ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_history_record",
    description:
      "Create a new workout history record. The text must be a single workout record in Liftohistory format. Call get_liftohistory_reference first if you are unsure about the format.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Workout record in Liftohistory text format" },
      },
      required: ["text"],
    },
  },
  {
    name: "update_history_record",
    description:
      "Update an existing workout history record. The text must be a single workout record in Liftohistory format.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "History record ID to update" },
        text: { type: "string", description: "Updated workout record in Liftohistory text format" },
      },
      required: ["id", "text"],
    },
  },
  {
    name: "delete_history_record",
    description: "Delete a workout history record by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "History record ID to delete" },
      },
      required: ["id"],
    },
  },

  // --- Programs ---
  {
    name: "list_programs",
    description: "List all user's programs. Returns id, name, and whether each is the currently active program.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_program",
    description:
      'Get a program\'s full source in Liftoscript format. Use id="current" to get the currently active program. Liftoscript is a custom DSL for weightlifting programs — call get_liftoscript_reference for the language guide.',
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: 'Program ID, or "current" to get the active program',
        },
      },
      required: ["id"],
    },
  },
  {
    name: "create_program",
    description:
      "Create a new weightlifting program from Liftoscript source code.\n\nIMPORTANT: You MUST call get_liftoscript_reference BEFORE using this tool. Liftoscript is a custom DSL with specific syntax — programs written without reading the reference will have errors. Use run_playground to validate the program before saving.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Program name" },
        text: { type: "string", description: "Program source in Liftoscript format" },
      },
      required: ["name", "text"],
    },
  },
  {
    name: "update_program",
    description:
      'Update an existing program\'s Liftoscript source code. Use id="current" to update the active program.\n\nIMPORTANT: You MUST call get_liftoscript_reference BEFORE using this tool. Liftoscript is a custom DSL with specific syntax — programs written without reading the reference will have errors. Use run_playground to validate before saving.',
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: 'Program ID, or "current" to update the active program',
        },
        name: { type: "string", description: "New program name (optional, keeps existing if omitted)" },
        text: { type: "string", description: "Updated program source in Liftoscript format" },
      },
      required: ["id", "text"],
    },
  },
  {
    name: "delete_program",
    description: "Delete a program by ID. Cannot delete the currently active program.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Program ID to delete" },
      },
      required: ["id"],
    },
  },

  // --- Playground & Reference ---
  {
    name: "run_playground",
    description:
      "Simulate a workout to validate program logic and test progressions. Returns the workout in Liftohistory format. Optionally pass commands to simulate user actions:\n\n- complete_set(exercise, set) — mark a set done (1-indexed)\n- change_weight(exercise, set, weight) — e.g. change_weight(1, 1, 185lb)\n- change_reps(exercise, set, reps)\n- change_rpe(exercise, set, rpe)\n- set_state_variable(exercise, name, value)\n- finish_workout() — runs all progression scripts, returns updatedProgramText\n\nUse this to verify a program works correctly before saving with create_program or update_program.\n\nIMPORTANT: You MUST call get_liftoscript_reference BEFORE writing programText. If you get parse errors, call get_liftoscript_reference and try again.",
    inputSchema: {
      type: "object",
      properties: {
        programText: { type: "string", description: "Program source in Liftoscript format" },
        day: { type: "string", description: "Day number to simulate (1-indexed, optional)" },
        week: { type: "string", description: "Week number to simulate (1-indexed, optional)" },
        commands: {
          type: "string",
          description:
            'JSON array of command strings to execute sequentially. E.g. ["complete_set(1, 1)", "complete_set(1, 2)", "finish_workout()"]',
        },
      },
      required: ["programText"],
    },
  },
  {
    name: "get_liftoscript_reference",
    description:
      "Get the complete Liftoscript language reference and examples. Liftoscript is a custom DSL for defining weightlifting programs in Liftosaur — it is NOT a standard format and you cannot guess the syntax.\n\nYou MUST call this BEFORE creating or editing any program. The reference covers: exercise syntax, sets/reps/weight notation, progressions (lp, dp, custom), templates, multi-week programs, state variables, supersets, warmups, and common mistakes to avoid.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_liftohistory_reference",
    description:
      "Get the Liftohistory format reference. Liftohistory is a human-readable text format for workout history records used by Liftosaur. Call this if you need to create or edit history records and are unsure about the format.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_program_stats",
    description:
      "Analyze a Liftoscript program and return stats: approximate workout duration per day, total weekly sets, strength vs hypertrophy breakdown, and weekly volume per muscle group with exercise contributions. Useful for reviewing program balance before creating or updating.",
    inputSchema: {
      type: "object",
      properties: {
        programText: { type: "string", description: "Program text in Liftoscript format" },
      },
      required: ["programText"],
    },
  },
];

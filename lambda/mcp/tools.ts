import { MEASUREMENT_KEYS, MEASUREMENT_WRITE_KEYS } from "../utils/apiv1Measurements";

export interface IMcpToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface IMcpJsonSchema {
  // A JSON Schema type, or a type array like ["string", "null"] to allow null (used for clearable fields).
  type: string | string[];
  description?: string;
  enum?: string[];
  items?: IMcpJsonSchema;
  properties?: Record<string, IMcpJsonSchema>;
  required?: string[];
}

export interface IMcpToolDef {
  name: string;
  description: string;
  annotations?: IMcpToolAnnotations;
  inputSchema: {
    type: "object";
    properties: Record<string, IMcpJsonSchema>;
    required?: string[];
  };
}

// Imported from the API layer (derived from statsWeightDef/statsLengthDef/statsPercentageDef/
// statsHealthDef in src/types.ts) so the MCP schema enums can't drift from what the REST handlers accept.
const MEASUREMENT_KEYS_DESC = `Valid keys: ${MEASUREMENT_KEYS.join(", ")} ('weight' is bodyweight, 'bodyfat' is a percentage, 'sleep'/'calories'/'protein' are read-only daily health imports, the rest are body lengths).`;
const MEASUREMENT_WRITE_KEYS_DESC = `Valid keys: ${MEASUREMENT_WRITE_KEYS.join(", ")} ('weight' is bodyweight, 'bodyfat' is a percentage, the rest are body lengths). The health keys (sleep, calories, protein) are read-only imports from Apple Health / Health Connect and can't be written.`;
const MEASUREMENT_VALUE_DESC =
  'A number with an explicit unit suffix: weight as "180lb"/"82kg", a body length as "37cm"/"14.75in", bodyfat as "18%". The suffix is required and must match the key\'s category.';

const EQUIPMENT_WEIGHT_DESC = 'Weight string like "45lb" or "20kg"';
const BUILTIN_EQUIPMENT_KEYS = [
  "barbell",
  "cable",
  "dumbbell",
  "smith",
  "band",
  "kettlebell",
  "bodyweight",
  "leverageMachine",
  "medicineball",
  "ezbar",
  "trapbar",
];

// Shared between update_equipment and create_custom_equipment. Modeled structurally (objects/arrays)
// so MCP clients can pass native JSON; the executor also accepts JSON strings for backward compatibility.
const EQUIPMENT_FIELD_SCHEMAS: Record<string, IMcpJsonSchema> = {
  bar: {
    type: "object",
    description: "Bar weights. lb must be in lb, kg must be in kg; either is optional.",
    properties: {
      lb: { type: "string", description: 'Bar weight in lb, e.g. "45lb"' },
      kg: { type: "string", description: 'Bar weight in kg, e.g. "20kg"' },
    },
  },
  plates: {
    type: "array",
    description: "Available plates.",
    items: {
      type: "object",
      properties: {
        weight: { type: "string", description: EQUIPMENT_WEIGHT_DESC },
        num: { type: "number", description: "How many of that plate are available (0-200)" },
      },
      required: ["weight", "num"],
    },
  },
  fixed: {
    type: "array",
    description: 'Fixed weights (used when isFixed is true), e.g. ["10lb", "15lb", "20lb"].',
    items: { type: "string", description: EQUIPMENT_WEIGHT_DESC },
  },
  isFixed: { type: "boolean", description: "True for fixed-weight equipment (uses 'fixed' instead of bar+plates)" },
  multiplier: {
    type: "number",
    description:
      "Integer 1-10: number of sides plates load onto (2 for a barbell loaded on both ends, 1 for a one-side machine)",
  },
  unit: { type: "string", enum: ["lb", "kg"], description: "The equipment's preferred unit" },
  name: { type: "string", description: "Display name (1-100 chars)" },
  notes: { type: "string", description: "Free-text notes" },
  similarTo: {
    type: "string",
    enum: BUILTIN_EQUIPMENT_KEYS,
    description: "Built-in equipment key whose plate-rounding behavior this mimics",
  },
  useBodyweightForBar: {
    type: "boolean",
    description: "Add the lifter's bodyweight to the bar (e.g. dips, pull-ups)",
  },
  isAssisting: {
    type: "boolean",
    description: "Assisted equipment where added weight reduces effort (e.g. assisted pull-up machine)",
  },
  isDeleted: {
    type: "boolean",
    description:
      "Soft-delete/restore: true removes the equipment from workout pickers (this is how you 'delete' a custom or hide a built-in like barbell), false restores it. The entry and its config are kept in storage either way.",
  },
};

// Shared between set_exercise_data. Modeled structurally so MCP clients can pass native JSON; the
// executor also accepts JSON strings. Pass null to clear an individual field (revert to default).
const EXERCISE_DATA_FIELD_SCHEMAS: Record<string, IMcpJsonSchema> = {
  rm1: {
    type: ["string", "null"],
    description: 'The exercise 1 rep max, as a weight string like "225lb" or "100kg". null clears it.',
  },
  rounding: {
    type: ["number", "null"],
    description:
      "Weight increment that prescribed weights are rounded to for this exercise (e.g. 5 for 5lb, 2.5 for 2.5kg). null clears it (reverts to the equipment default).",
  },
  equipment: {
    type: ["object", "null"],
    description:
      'Per-gym equipment override: a map of gymId -> equipmentId (e.g. {"default":"dumbbell"}). Replaces any existing override wholesale and sets which equipment this exercise uses (for weight rounding / plate calc) at each gym. Each gymId must exist and each equipmentId must exist in that gym (see list_gyms / list_equipment), or be null to mean "None" (no equipment at that gym). Top-level null clears the override. In responses the map lists only gyms with a real equipment override; an absent gym means "None".',
  },
  notes: { type: ["string", "null"], description: "Free-text notes shown for this exercise. null clears them." },
  muscleMultipliers: {
    type: ["object", "null"],
    description:
      "Override of which muscles this exercise works: a map of muscle name -> multiplier. Use 1 to mark a muscle as a target, and a value <1 (e.g. 0.5) to mark it as a synergist with that weight. Replaces the exercise's default muscles entirely. null clears the override.",
  },
  isUnilateral: {
    type: ["boolean", "null"],
    description: "Whether the exercise is unilateral (performed one side at a time). null clears the override.",
  },
  volumeMultiplier: {
    type: ["number", "null"],
    description:
      "Multiplier applied to this exercise's volume/total-weight (not to prescribed weights), clamped to 1-10. Set to 2 for exercises loaded with two dumbbells simultaneously (e.g. dumbbell shoulder press), where the displayed weight is per-dumbbell. null clears the override.",
  },
};

export const mcpTools: IMcpToolDef[] = [
  // --- History ---
  {
    name: "get_history",
    description:
      'Retrieve workout history records in Liftohistory text format. Example record:\n\n```\n2026-02-28T10:45:30Z / program: "5/3/1" / dayName: "Push Day" / week: 1 / dayInWeek: 5 / duration: 1235s / exercises: {\n  Bench Press, Barbell / 3x8 185lb @7, 1x6 185lb @9 / warmup: 1x10 95lb / target: 3x8-12 185lb @8 90s\n}\n```\n\nUse startDate/endDate (ISO dates or unix timestamps) to filter by date range. Use limit/cursor for pagination (max 200 per page).',
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
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
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
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
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
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
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
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
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
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
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_program",
    description:
      'Get a program\'s full source in Liftoscript format. Use id="current" to get the currently active program. Liftoscript is a custom DSL for weightlifting programs — call get_liftoscript_reference for the language guide.',
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
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
      "Create a new weightlifting program from Liftoscript source code.\n\nIMPORTANT: You MUST call get_liftoscript_reference BEFORE using this tool. Liftoscript is a custom DSL with specific syntax — programs written without reading the reference will have errors. Use run_playground to validate the program before saving.\n\nBefore writing the program, call list_custom_exercises to check for existing custom exercises. Reuse them by name instead of creating duplicates — this preserves workout history.",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
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
      'Update an existing program\'s Liftoscript source code. Use id="current" to update the active program.\n\nIMPORTANT: You MUST call get_liftoscript_reference BEFORE using this tool. Liftoscript is a custom DSL with specific syntax — programs written without reading the reference will have errors. Use run_playground to validate before saving.\n\nBefore writing the program, call list_custom_exercises to check for existing custom exercises. Reuse them by name instead of creating duplicates — this preserves workout history.',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
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
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
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
      "Simulate a workout to validate program logic and test progressions. Returns the workout in Liftohistory format. Optionally pass commands to simulate user actions:\n\n- complete_set(exercise, set) — mark a set done (1-indexed)\n- change_weight(exercise, set, weight) — e.g. change_weight(1, 1, 185lb)\n- change_reps(exercise, set, reps)\n- change_rpe(exercise, set, rpe)\n- change_set_time(exercise, set, seconds) — for timed (isometric hold) sets; complete_set already records the held time as the programmed duration, use this to override it\n- set_state_variable(exercise, name, value)\n- finish_workout() — runs all progression scripts, returns updatedProgramText\n\nUse this to verify a program works correctly before saving with create_program or update_program.\n\nIMPORTANT: You MUST call get_liftoscript_reference BEFORE writing programText. If you get parse errors, call get_liftoscript_reference and try again.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
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
      "Get the Liftoscript language reference. Liftoscript is a custom DSL for defining weightlifting programs in Liftosaur — it is NOT a standard format and you cannot guess the syntax.\n\nYou MUST call this BEFORE creating or editing any program. The reference covers: exercise syntax, sets/reps/weight notation, progressions (lp, dp, custom), templates, multi-week programs, state variables, supersets, warmups, and common mistakes to avoid.\n\nAfter reading this, also call get_liftoscript_examples for complete program examples.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_liftoscript_examples",
    description:
      "Get complete Liftoscript program examples. Call this after get_liftoscript_reference to see full working programs demonstrating various features (linear progression, 5/3/1, GZCL, PPL, etc.).",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_liftohistory_reference",
    description:
      "Get the Liftohistory format reference. Liftohistory is a human-readable text format for workout history records used by Liftosaur. Call this if you need to create or edit history records and are unsure about the format.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_builtin_programs",
    description: "List all built-in Liftosaur programs with their id and name.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_builtin_program",
    description:
      "Get a built-in program's full markdown file — includes description and Liftoscript source code. Use this to see how real programs are written.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Program ID from list_builtin_programs" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_exercises",
    description:
      "List all built-in exercise names available in Liftosaur. Use this to find the correct exercise name and equipment variant (e.g. 'Standing Calf Raise' instead of 'Calf Raise', or 'Bicep Curl, Barbell' instead of 'Barbell Curl').",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  // --- Custom Exercises ---
  {
    name: "list_custom_exercises",
    description:
      "List the user's custom exercises. Returns id, name, target muscles, synergist muscles, and types for each. Use limit/cursor for pagination (max 200 per page).",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "string", description: "Max exercises to return (default 50, max 200)" },
        cursor: { type: "string", description: "Pagination cursor (exercise ID) from previous response" },
      },
    },
  },
  {
    name: "get_custom_exercise",
    description: "Get a single custom exercise by ID.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Custom exercise ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_custom_exercise",
    description:
      "Create a custom exercise, or update an existing one with the same name. If a custom exercise with the same name (case-insensitive) already exists, it will be updated with the provided fields and the existing ID is preserved — this keeps workout history linked correctly.\n\nOnly the name is required. Use this when a program references an exercise that doesn't exist in the built-in exercise list (from list_exercises). You should determine appropriate values for targetMuscles, synergistMuscles, and types based on the exercise name.\n\nAvailable muscles: Adductor Brevis, Adductor Longus, Adductor Magnus, Biceps Brachii, Brachialis, Brachioradialis, Deltoid Anterior, Deltoid Lateral, Deltoid Posterior, Erector Spinae, Gastrocnemius, Gluteus Maximus, Gluteus Medius, Hamstrings, Iliopsoas, Infraspinatus, Latissimus Dorsi, Levator Scapulae, Obliques, Pectineous, Pectoralis Major Clavicular Head, Pectoralis Major Sternal Head, Quadriceps, Rectus Abdominis, Sartorius, Serratus Anterior, Soleus, Splenius, Sternocleidomastoid, Tensor Fasciae Latae, Teres Major, Teres Minor, Tibialis Anterior, Trapezius Lower Fibers, Trapezius Middle Fibers, Trapezius Upper Fibers, Triceps Brachii, Wrist Extensors, Wrist Flexors.\n\nAvailable types: core, pull, push, legs, upper, lower.",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Exercise name" },
        targetMuscles: {
          type: "string",
          description: 'JSON array of primary target muscles. E.g. ["Quadriceps", "Gluteus Maximus"]',
        },
        synergistMuscles: {
          type: "string",
          description: 'JSON array of secondary/synergist muscles. E.g. ["Hamstrings", "Erector Spinae"]',
        },
        types: {
          type: "string",
          description:
            'JSON array of exercise types. E.g. ["push", "upper"]. Available: core, pull, push, legs, upper, lower',
        },
      },
      required: ["name"],
    },
  },
  {
    name: "update_custom_exercise",
    description:
      "Update an existing custom exercise. Only provided fields are changed; omitted fields keep their current values.\n\nSee create_custom_exercise for available muscles and types.",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Custom exercise ID" },
        name: { type: "string", description: "New exercise name (optional)" },
        targetMuscles: {
          type: "string",
          description: "JSON array of primary target muscles (optional, replaces existing)",
        },
        synergistMuscles: {
          type: "string",
          description: "JSON array of secondary/synergist muscles (optional, replaces existing)",
        },
        types: {
          type: "string",
          description: "JSON array of exercise types (optional, replaces existing)",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_custom_exercise",
    description: "Delete a custom exercise by ID.",
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Custom exercise ID to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "get_program_stats",
    description:
      "Analyze a Liftoscript program and return stats: approximate workout duration per day, total weekly sets, strength vs hypertrophy breakdown, and weekly volume per muscle group with exercise contributions. Useful for reviewing program balance before creating or updating.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    inputSchema: {
      type: "object",
      properties: {
        programText: { type: "string", description: "Program text in Liftoscript format" },
      },
      required: ["programText"],
    },
  },

  // --- Gyms ---
  {
    name: "list_gyms",
    description:
      "List the user's gyms. Equipment (bars, plates, etc.) is configured per gym, so you need a gym's id before reading or editing its equipment. Returns id, name, whether it's the current gym, and equipment count. Most users have a single gym.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "create_gym",
    description:
      "Create a new gym. The new gym starts with a copy of the current gym's equipment, which you can then edit. Use a separate gym per physical location (e.g. 'Home', 'Office').",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Gym name (1-100 chars)" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_gym",
    description: "Rename a gym and/or make it the current (active) gym.",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        gymId: { type: "string", description: "Gym id (from list_gyms)" },
        name: { type: "string", description: "New gym name (optional)" },
        setCurrent: { type: "boolean", description: "Set true to make this the current gym (optional)" },
      },
      required: ["gymId"],
    },
  },
  {
    name: "delete_gym",
    description: "Delete a gym. Cannot delete the last remaining gym.",
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        gymId: { type: "string", description: "Gym id to delete" },
      },
      required: ["gymId"],
    },
  },

  // --- Equipment ---
  {
    name: "list_equipment",
    description:
      "List all of a gym's equipment, including soft-deleted ones (each carries an isDeleted flag). Equipment configuration (bar weight, available plates, fixed weights) drives how Liftosaur rounds prescribed weights during a workout. Built-in equipment keys: barbell, cable, dumbbell, smith, band, kettlebell, bodyweight, leverageMachine, medicineball, ezbar, trapbar. Custom equipment has keys like 'equipment-xxxxxxxx'. Call list_gyms first to get the gymId.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        gymId: { type: "string", description: "Gym id (from list_gyms)" },
      },
      required: ["gymId"],
    },
  },
  {
    name: "get_equipment",
    description:
      "Get a single equipment's full configuration (bar weights, plates, fixed weights, multiplier, unit) within a gym.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        gymId: { type: "string", description: "Gym id" },
        id: { type: "string", description: "Equipment id/key (e.g. 'barbell' or 'equipment-xxxxxxxx')" },
      },
      required: ["gymId", "id"],
    },
  },
  {
    name: "update_equipment",
    description:
      'Update a gym\'s equipment. Only provided fields change; omitted fields keep their current values. Weights are strings like "45lb" or "20kg". Out-of-range values are clamped. Works for built-in and custom equipment. To soft-delete or restore equipment, set the isDeleted field (true removes it from workout pickers — the config is kept — false restores it).',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        gymId: { type: "string", description: "Gym id" },
        id: { type: "string", description: "Equipment id/key" },
        ...EQUIPMENT_FIELD_SCHEMAS,
      },
      required: ["gymId", "id"],
    },
  },
  {
    name: "create_custom_equipment",
    description:
      "Create a new custom equipment in a gym (beyond the 11 built-ins). Starts from sensible defaults; pass the same fields as update_equipment to configure bar/plates/etc. Returns the generated equipment id.",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        gymId: { type: "string", description: "Gym id" },
        ...EQUIPMENT_FIELD_SCHEMAS,
      },
      required: ["gymId", "name"],
    },
  },

  // --- Exercise Data ---
  {
    name: "list_exercise_data",
    description:
      "List all per-exercise settings the user has customized (1 rep max, weight rounding, per-gym equipment overrides, notes, muscle overrides, unilateral flag). Each entry is keyed by an exercise key: a built-in exercise id joined with its equipment by '_' (e.g. 'squat_barbell', 'benchPress_barbell'), or a custom exercise id. Exercises without any customization don't appear here — that's expected; their values fall back to defaults. Use this to discover the exact keys already in use before writing with set_exercise_data.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_exercise_data",
    description:
      "Get the customized settings for a single exercise key (e.g. 'squat_barbell', 'benchPress_barbell'). Returns 404 if the exercise has no customizations stored. Use list_exercises for valid built-in exercise ids and list_custom_exercises for custom ones.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description:
            "Exercise key: a built-in id joined with its equipment by '_' (e.g. 'squat_barbell', 'benchPress_barbell'), or a custom exercise id. Use the equipment-qualified form that matches how the user trains; a bare id like 'benchPress' only matches the no-equipment variant.",
        },
      },
      required: ["key"],
    },
  },
  {
    name: "set_exercise_data",
    description:
      "Set (upsert) per-exercise settings for an exercise key like 'squat_barbell' or 'benchPress_barbell'. Use this to set a user's 1 rep max (rm1), weight rounding, per-gym equipment overrides, notes, muscle overrides, or the unilateral flag. Only provided fields change; omitted fields keep their current values; pass null for a field to clear it (revert to default). The key's exercise must exist (built-in id from list_exercises, joined with its equipment by '_', or a custom exercise id). Prefer the equipment-qualified key that matches how the user trains — a bare built-in id only matches the no-equipment variant and won't affect normal barbell/dumbbell entries.",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description:
            "Exercise key: a built-in id joined with its equipment by '_' (e.g. 'squat_barbell', 'benchPress_barbell'), or a custom exercise id. Use the equipment-qualified form that matches how the user trains; a bare id like 'benchPress' only matches the no-equipment variant.",
        },
        ...EXERCISE_DATA_FIELD_SCHEMAS,
      },
      required: ["key"],
    },
  },
  {
    name: "delete_exercise_data",
    description:
      "Delete all stored customizations for an exercise key, reverting the exercise (1RM, rounding, equipment override, notes, muscles, unilateral) entirely to defaults. To clear just one field, use set_exercise_data with that field set to null instead.",
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", description: "Exercise key whose customizations to delete." },
      },
      required: ["key"],
    },
  },

  // --- Measurements ---
  {
    name: "list_measurements",
    description:
      'Overview of the user\'s tracked body measurements and daily health metrics. Each measurement is keyed by name and falls in one of four categories: weight (`weight` = bodyweight, in kg/lb), percentage (`bodyfat`, in %), length (a body part, in cm/in), or health (`sleep` in minutes per night, `calories` in kcal/day, `protein` in g/day — read-only daily aggregates imported from Apple Health / Health Connect, timestamped at local midnight of the day they belong to; sleep is bucketed to the wake day). Returns, per key that has data, the total `count` of recorded values and the `latest` one (with its unix epoch ms `timestamp`, an ISO 8601 `date`, and a unit-suffixed `value` like "180lb" or "432min"). Keys with no recorded values are omitted. This does NOT return the full series — a key can have thousands of values; page through them with get_measurement.',
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_measurement",
    description: `Get the recorded history for a single measurement key, newest-first, paginated. ${MEASUREMENT_KEYS_DESC} Returns up to 'limit' values plus 'hasMore' and 'nextCursor'; pass 'nextCursor' back as 'cursor' to fetch the next (older) page. An empty list means nothing has been recorded for that key yet.`,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", enum: MEASUREMENT_KEYS, description: "Measurement key." },
        limit: { type: "string", description: "Max values to return (default 50, max 200)." },
        cursor: { type: "string", description: "Pagination cursor (nextCursor from the previous page)." },
      },
      required: ["key"],
    },
  },
  {
    name: "add_measurement",
    description: `Record a new measurement value. ${MEASUREMENT_WRITE_KEYS_DESC} timestamp defaults to now; pass a unix epoch ms or ISO 8601 date to backfill a past entry. Fails with a conflict if an entry already exists at that exact timestamp — use update_measurement instead.`,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", enum: MEASUREMENT_WRITE_KEYS, description: "Measurement key." },
        value: { type: "string", description: MEASUREMENT_VALUE_DESC },
        timestamp: {
          type: ["number", "string"],
          description: "When the measurement was taken: unix epoch ms or ISO 8601 date string. Defaults to now.",
        },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "update_measurement",
    description: `Change the reading of an existing measurement value, identified by its key and timestamp (from list/get). ${MEASUREMENT_WRITE_KEYS_DESC} The timestamp is the entry's identity and can't be changed here — to re-date an entry, delete_measurement it and add_measurement it at the new time.`,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", enum: MEASUREMENT_WRITE_KEYS, description: "Measurement key." },
        timestamp: {
          type: ["number", "string"],
          description: "Existing entry's timestamp (unix epoch ms) identifying which value to update.",
        },
        value: { type: "string", description: `New value. ${MEASUREMENT_VALUE_DESC}` },
      },
      required: ["key", "timestamp", "value"],
    },
  },
  {
    name: "delete_measurement",
    description: `Delete a single recorded measurement value, identified by its key and timestamp (from list/get). ${MEASUREMENT_KEYS_DESC} For the health keys, whose records are imported from Apple Health / Health Connect, deleting hides the record instead of removing it: it disappears from all reads and stays hidden across re-imports, and can be unhidden from the app's Sleep & Nutrition screen.`,
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", enum: MEASUREMENT_KEYS, description: "Measurement key." },
        timestamp: {
          type: ["number", "string"],
          description: "Timestamp (unix epoch ms) of the value to delete.",
        },
      },
      required: ["key", "timestamp"],
    },
  },
];

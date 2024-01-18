/* eslint-disable @typescript-eslint/no-explicit-any */
import { IDI } from "./di";
import { ChatCompletionRequestMessage, ChatCompletionResponseMessage, Configuration, OpenAIApi } from "openai";
import { IEither } from "../../src/utils/types";
import { parser as plannerExerciseParser } from "../../src/pages/planner/plannerExerciseParser";
import { PlannerExerciseEvaluator } from "../../src/pages/planner/plannerExerciseEvaluator";
import { Exercise } from "../../src/models/exercise";
import { Settings } from "../../src/models/settings";

function plannerReformatterFullPrompt(): string {
  return `Given the weightlifting program, potentially consisting of weeks and days, and also lists of exercises, sets and reps, reformat it in the way that:
* It always starts with a week name, on a new line. Week name is always prefixed with pound character, like "# Week 1".
* After week name there goes day name, also on a new line. Day name is always prefixed with double pound character, like "## Day 1".
* After day name, there goes a list of exercises for that day.
* Each exercise starts with a new line
* First always goes the exercise name
* Then, after slash (/) - sets x reps. E.g. 5x5, 3x1, 1x3, etc. If there's a range of reps, use dash (-) to separate them. E.g. 3x3-5, 2x4-8.
* If there are multiple sets of different reps, separate them with comma. E.g. "3x3, 2x4-8, 1x10-12", or "3, 4, 5", or "1x3, 1x4, 1x5" or "3x3-6, 5, 5, 5".
* If there are RPEs specified, add them to sets x reps, after a space, prefixed with "@" character. For example 3 sets of 4 reps with 7 RPE would be "3x4 @7"
* If there is rest timer specified, add it to sets x reps, after a space, suffixes with "s" character. For example: "3x5 60s", or "3x7 @8 60s"
* After the list of exercises, there go more days (again, starting with the day name with double pound), or more weeks.
* Set x reps section format is VERY strict. DO NOT ADD WORDS OR PHRASES THERE!!!. Only set numbers x reps numbers, RPE and timer are allowed to be there. Things like "3 x failure", "3 til failure", etc are FORBIDDEN!
* For AMRAP or sets to failure, add "+" after the reps. For example: "3x8+", or "5, 3, 1+" (in this case last set is AMRAP)

Example:
# Week 1
## Day 1
Bench Press / 3x3
Bicep Curl / 3x8
Bicep Curl / 3x8 @8
Incline Bench Press / 3x8 @8

## Day 2
Squat / 5x5 @9 120s
Leg Press / 1x8 @9 120s, 4x4 @8 60s

There's a list of built-in exercises. If user provided exercise has slightly different name, but means the same
exercise - use the exercise from the list. Usually you can drop the equipment name from the exercise name,
or add it after the exercise name.
Examples:
* if user entered "Incline DB Press", use "Incline Bench Press, dumbbell".
* if user typed "Pull-ups" - use "Pull Up".
* if user entered "Barbell Rows" - use "Bent Over Row"
* if user entered "Calf Raise" - use "Standing Calf Raise"
* if user entered "DB Bench Press" - use "Bench Press, dumbbell"
* etc - try to find the similar exercise in the list below and use it.

IT IS VERY VERY IMPORTANT THAT YOU TRY TO FIND SIMILAR EXERCISES FROM THE LIST AND USE THEM IN THE OUTPUT!!!

The list of built-in exercises is case sensitive, so change the case if necessary.
If user entered something like "Double Rope Pushdown" - we don't have such exercise in the list, so you keep it as is. The list of built-in exercises:

${exerciseList}.

Only output the list of exercises, nothing else, no explanation text. This is the text that you need to reformat:`;
}

function plannerReformatterPrompt(): string {
  return `Given the list of exercises, sets and reps, reformat it in the way that:
* Each exercise starts with a new line
* First always goes the exercise name
* Then, after slash (/) - sets x reps. E.g. 5x5, 3x1, 1x3, etc. If there's a range of reps, use dash (-) to separate them. E.g. 3x3-5, 2x4-8.
* If there are multiple sets of different reps, separate them with comma. E.g. "3x3, 2x4-8, 1x10-12", or "3, 4, 5", or "1x3, 1x4, 1x5" or "3x3-6, 5, 5, 5".

Example:
Bench Press / 3x3
Bicep Curl / 3x8

There's a list of built-in exercises. If user provided exercise has slightly different name, but means the same
exercise - use the exercise from the list. Usually you can drop the equipment name from the exercise name.
Examples:
* if user entered "Incline DB Press", use "Incline Bench Press" from the list.
* if user typed "Pull-ups" - use "Pull Up".
* if user entered "Barbell Rows" - use "Bent Over Row"
* if user entered "Calf Raise" - use "Standing Calf Raise"
* etc - try to find the similar exercise in the list below and use it.

IT IS VERY VERY IMPORTANT THAT YOU TRY TO FIND SIMILAR EXERCISES FROM THE LIST AND USE THEM IN THE OUTPUT!!!

The list of built-in exercises is case sensitive, so change the case if necessary.
If user entered something like "Double Rope Pushdown" - we don't have such exercise in the list, so you keep it as is. The list of built-in exercises:

${exerciseList}.

Only output the list of exercises, nothing else, no explanation text. This is the text that you need to reformat:`;
}

const exerciseList = `
"Ab Wheel
Arnold Press
Around The World
Back Extension
Ball Slams
Battle Ropes
Behind The Neck Press
Bench Dip
Bench Press
Bench Press Close Grip
Bench Press Wide Grip
Bent Over One Arm Row
Bent Over Row
Bicep Curl
Bicycle Crunch
Box Jump
Box Squat
Bulgarian Split Squat
Burpee
Cable Crossover
Cable Crunch
Cable Kickback
Cable Pull Through
Cable Twist
Calf Press on Leg Press
Calf Press on Seated Leg Press
Chest Dip
Chest Fly
Chest Press
Chest-Supported Row
Chin Up
Clean
Clean and Jerk
Concentration Curl
Cross Body Crunch
Crunch
Cycling
Deadlift
Deadlift High Pull
Decline Bench Press
Decline Crunch
Deficit Deadlift
Elliptical Machine
Face Pull
Flat Knee Raise
Flat Leg Raise
Front Raise
Front Squat
Glute Bridge
Glute Bridge March
Goblet Squat
Good Morning
Hack Squat
Hammer Curl
Handstand Push Up
Hang Clean
Hang Snatch
Hanging Leg Raise
High Knee Skips
Hip Abductor
Hip Thrust
Incline Bench Press
Incline Bench Press Wide Grip
Incline Chest Fly
Incline Chest Press
Incline Curl
Incline Row
Inverted Row
Iso-Lateral Chest Press
Iso-Lateral Row
Jackknife Sit Up
Jump Rope
Jump Squat
Jumping Jack
Kettlebell Swing
Kettlebell Turkish Get Up
Kipping Pull Up
Knee Raise
Kneeling Pulldown
Knees to Elbows
Lat Pulldown
Lateral Box Jump
Lateral Raise
Leg Curl
Leg Extension
Leg Press
Legs Up Bench Press
Lunge
Lying Bicep Curl
Lying Leg Curl
Mountain Climber
Muscle Up
Oblique Crunch
Overhead Press
Overhead Squat
Pec Deck
Pendlay Row
Pistol Squat
Plank
Power Clean
Power Snatch
Preacher Curl
Press Under
Pull Up
Pullover
Push Press
Push Up
Reverse Crunch
Reverse Curl
Reverse Fly
Reverse Grip Concentration Curl
Reverse Hyperextension
Reverse Lat Pulldown
Reverse Plank
Romanian Deadlift
Rowing
Russian Twist
Safety Squat Bar Squat
Seated Calf Raise
Seated Front Raise
Seated Leg Curl
Seated Leg Press
Seated Overhead Press
Seated Palms Up Wrist Curl
Seated Row
Seated Wide Grip Row
Shoulder Press
Shoulder Press Parallel Grip
Shrug
Side Bend
Side Crunch
Side Hip Abductor
Side Lying Clam
Side Plank
Single Leg Bridge
Single Leg Calf Raise
Single Leg Deadlift
Single Leg Glute Bridge Bent Knee
Single Leg Glute Bridge On Bench
Single Leg Glute Bridge Straight Leg
Single Leg Hip Thrust
Sissy Squat
Sit Up
Skullcrusher
Sling Shot Bench Press
Snatch
Snatch Pull
Split Jerk
Squat
Squat Row
Standing Calf Raise
Standing Row
Standing Row Close Grip
Standing Row Rear Delt With Rope
Standing Row Rear Delt, Horizontal, With Rope
Standing Row V-Bar
Step up
Stiff Leg Deadlift
Straight Leg Deadlift
Sumo Deadlift
Sumo Deadlift High Pull
Superman
T Bar Row
Thruster
Toes To Bar
Torso Rotation
Trap Bar Deadlift
Triceps Dip
Triceps Extension
Triceps Pushdown
Upright Row
V Up
Wide Pull Up
Wrist Roller
Zercher Squat"
`;

export class PlannerReformatter {
  constructor(private readonly di: IDI) {}

  public async generate(prompt: string): Promise<IEither<string, string>> {
    const system = plannerReformatterPrompt();
    const result = await this.getResponseFromChatGPT(system, prompt, "perday");
    return result;
  }

  public async generateFull(prompt: string): Promise<IEither<string, string>> {
    const system = plannerReformatterFullPrompt();
    const result = await this.getResponseFromChatGPT(system, prompt, "full");
    return result;
  }

  private async makeCall(
    requestMessage: ChatCompletionRequestMessage[]
  ): Promise<IEither<ChatCompletionResponseMessage, string>> {
    try {
      const apiKey = await this.di.secrets.getOpenAiKey();
      const configuration = new Configuration({ apiKey });
      const openai = new OpenAIApi(configuration);
      const startTime = Date.now();
      this.di.log.log("Starting a call to GPT 3.5:");
      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: requestMessage,
        temperature: 0.3,
      });
      this.di.log.log("Call to GPT 3.5:", ` - ${Date.now() - startTime}ms`);
      const msg = response.data.choices[0].message;
      if (!msg) {
        throw new Error("Missing message in response");
      }
      return { success: true, data: msg };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  private async getResponseFromChatGPT(
    system: string,
    prompt: string,
    mode: "full" | "perday"
  ): Promise<IEither<string, string>> {
    const requestMessages: ChatCompletionRequestMessage[] = [
      {
        role: "system",
        content: system,
      },
      { role: "user", content: prompt },
    ];

    let attempts = 0;
    while (attempts < 2) {
      const callResult = await this.makeCall(requestMessages);
      console.log(callResult.success ? callResult.data : callResult.error);
      if (callResult.success) {
        const message = callResult.data.content;

        if (!this.coarseValidate(message)) {
          this.di.log.log("Failed to pass coarse validation");
          requestMessages.push({ role: "assistant", content: message });
          requestMessages.push({
            role: "user",
            content:
              "Response contains some lines that are not exercises and sets x reps separated by slash (/). Please try again, and don't include any explanation text, only the exercises, one per line.",
          });
          attempts += 1;
          continue;
        }

        const tree = plannerExerciseParser.parse(message);
        const evaluator = new PlannerExerciseEvaluator(message, Settings.build(), mode);
        const result = evaluator.evaluate(tree.topNode);
        if (result.success) {
          this.di.log.log("Evaluated successfully, returning GPT response");
          return { success: true, data: message };
        } else {
          if (result.error.message.indexOf("Unknown exercise") !== -1) {
            const unknownExercises = this.getUnknownExercises(message);
            this.di.log.log(`Unknown exercises, retrying - ${unknownExercises.join(", ")}`);
            requestMessages.push({ role: "assistant", content: message });
            requestMessages.push({
              role: "user",
              content: `There are exercises not from the built-in exercises list - ${unknownExercises.join(
                ", "
              )}. Try to use the built-in exercises list if possible and they have just slightly different name, but mean the same exercise`,
            });
            attempts += 1;
            continue;
          } else {
            this.di.log.log("Error evaluating - ", result.error.message);
            requestMessages.push({ role: "assistant", content: message });
            requestMessages.push({
              role: "user",
              content: `There's a syntax error: ${result.error.message}, try to fix it`,
            });
            attempts += 1;
            continue;
          }
        }
      } else {
        requestMessages.push({ role: "assistant", content: callResult.error });
        requestMessages.push({
          role: "user",
          content: `There's a syntax error: ${callResult.error}, try to fix it`,
        });
        attempts += 1;
        continue;
      }
    }
    const lastMessage = requestMessages.reverse().find((msg) => msg.role === "assistant");
    if (lastMessage) {
      return { success: true, data: lastMessage.content };
    } else {
      return { success: false, error: "Ran out of attempts, got no response from GPT" };
    }
  }

  private coarseValidate(message: string): boolean {
    const lines = message.split("\n");
    return lines.every((line) => {
      return line.trim() === "" || /\//.test(line) || /#/.test(line);
    });
  }

  private getUnknownExercises(message: string): string[] {
    const exercises = message.split("\n").map((line) => line.trim().split("/")?.[0]?.trim());
    return exercises.filter((exercise) => !Exercise.findByName(exercise, {}));
  }
}

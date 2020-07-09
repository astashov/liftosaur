import { ScriptRunner } from "./parser";
import { Progress } from "./models/progress";

const program = "state.benchPress";

const scriptRunner = new ScriptRunner(program, { benchPress: 100 }, Progress.createEmptyScriptBindings(1));
console.log(scriptRunner.execute());

import { h, JSX } from "preact";
import { ObjectUtils } from "../utils/object";
import { IDispatch } from "../ducks/types";
import { DateUtils } from "../utils/date";
import { IState, updateState } from "./state";
import { lb } from "lens-shmens";
import { InternalLink } from "../internalLink";
import { IconDiscord } from "../components/icons/iconDiscord";

export interface IWhatsNew {
  title: JSX.Element;
  body: JSX.Element;
}

const whatsNew: Record<string, IWhatsNew> = {
  "20220219": {
    title: <span>Import/Export of all data and also specific programs.</span>,
    body: (
      <ul>
        <li>You can now export all your data into a file (history, settings, etc), and then import it later on.</li>
        <li>
          Also can export and import programs. Could use it to e.g. share a workout program with a friend, or as a
          backup, or for some other reason.
        </li>
      </ul>
    ),
  },
  "20220604": {
    title: <span>Add 1 Rep Max line to the exercises graphs.</span>,
    body: (
      <ul>
        <li>
          It better shows the progress trend, since it combines weight and reps into one value. We use{" "}
          <a href="https://en.wikipedia.org/wiki/One-repetition_maximum">Epley formula</a> to calculate it. It's enabled
          by default, but you can disable it in settings on Graphs screen.
        </li>
      </ul>
    ),
  },
  "20220808": {
    title: <span>Big changes in the equipment settings.</span>,
    body: (
      <ul>
        <li>You can now specify plates separately for each equipment type - barbell, dumbbell, cable, etc.</li>
        <li>
          Each equipment type now supports "fixed" weights, without plates, e.g. if you use fixed weight dumbbells.
        </li>
      </ul>
    ),
  },
  "20221225": {
    title: <span>Redesign.</span>,
    body: (
      <ul>
        <li>
          Big redesign of the whole app! Hopefully it's more visually pleasant, and makes more sense than the previous
          one.
        </li>
      </ul>
    ),
  },
  "20221226": {
    title: <span>New Account Management.</span>,
    body: (
      <ul>
        <li>
          Now you can have multiple local accounts, and manage them and switch between them. Also, the whole Account
          screen was updated.
        </li>
      </ul>
    ),
  },
  "20221228": {
    title: <span>Add Reuse Logic feature</span>,
    body: (
      <ul>
        <li>
          If you have multiple exercises in a program that share the same logic for sets, reps and weight, and also
          logic for updating those, you now can "reuse logic" from other exercises. This way you can avoid repeating the
          same logic over and over again, and you'll have a single source of truth for that logic (in the exercise you
          reuse).
        </li>
        <li>
          It should be useful for most programs, since usually they have multiple exercises following the same
          progression/deload pattern.
        </li>
        <li>
          Each exercise still has its own state variables values, but it must have the same variable names and types.
        </li>
      </ul>
    ),
  },
  "20230111": {
    title: <span>Graph Improvements</span>,
    body: (
      <ul>
        <li>
          <ul className="pl-4 list-disc">
            <li>Using 2 fingers, you can pinch-zoom graphs now.</li>
            <li>Also using 2 fingers you can move the zoomed area.</li>
            <li>By double-tapping a graph, you can reset the zoom and return to its original size.</li>
            <li>Added vertical lines on the graphs when program was changed.</li>
            <li>Added a link in the legend to the selected workout on the graph.</li>
            <li>Removed the horizontal line on the cursor, since it was pretty useless.</li>
          </ul>
        </li>
      </ul>
    ),
  },
  "20230115": {
    title: <span>Program Preview</span>,
    body: (
      <ul>
        <li>
          Added Program Preview, that shows the high-level overview of a program. It lists all the days and exercises,
          all the sets variations (sets/reps/weight), you could see the formulas/scripts for each exercise, and muscles
          for each day and the whole program. You can use it for 2 cases:
          <ul className="pl-4 list-disc">
            <li>
              When you pick a built-in program, there's a "Preview" button in the modal with the program info. So you
              could see now what you sign up for.
            </li>
            <li>
              When you build your own program, there's "Preview" footer button. If will give you high-level overview of
              the program, and could help to make sure everything works right there.
            </li>
          </ul>
        </li>
      </ul>
    ),
  },
  "20230121": {
    title: <span>Exercise Stats</span>,
    body: (
      <ul>
        <li>
          Added Exercise Stats - a new screen that shows various statistics for an exercise. It shows the graph, the
          personal records, the history of the exercise. You can switch between different exercises right on that
          screen.
        </li>
        <li>
          The entrypoint to that screen is from the workout screen - when you tap on the exercise name, exercise image,
          or when you open the bottom sheet - there's an option "Exercise Stats"
        </li>
      </ul>
    ),
  },
  "20230207": {
    title: <span>Footer navigation</span>,
    body: (
      <ul>
        <li>
          We've got complains that the footer navigation is confusing. And indeed, the left part was different from
          screen to screen, and it sometimes was hard to understand where are you.
        </li>
        <li>
          So, now the footer nav is always the same across all screens. The screen-based buttons got moved to either
          3-dot menu in the navbar, or to regular buttons right on the screen.
        </li>
        <li>
          Also, had to move the rest timer from the footer, now it's a floating timer, that is visible on all screens.
          If you tap on it, you will go to the currently ongoing workout.
        </li>
      </ul>
    ),
  },
  "20230209": {
    title: <span>Choose Programs screen redesign</span>,
    body: (
      <ul>
        <li>
          Now it shows all the exercise images a built-in program contains, as well as the required equipment and
          approximate time to finish a workout from the program. Hopefully it'll help with choosing the right program.
        </li>
      </ul>
    ),
  },
  "20230222": {
    title: <span>Web Editor for programs</span>,
    body: (
      <ul>
        <li>
          There's a new web editor for programs, so you could edit the programs from a laptop -{" "}
          <InternalLink className="font-bold underline text-bluev2" href="/program">
            liftosaur.com/program
          </InternalLink>
          . You can create a program there, then copy the link, and paste it into the app (on the program selection
          screen). You can also generate a link for any of your programs (on the program edit screen), and open in the
          web editor, edit there, copy link again, and paste it into the app to import the changes.
        </li>
        <li>
          Those links are immutable - any change in the program would change the link. You can share those links if you
          want to share your program with somebody else, and they'll be able to import the program into their app.
        </li>
      </ul>
    ),
  },
  "20230224": {
    title: <span>Inspirations in the Advanced Edit Mode</span>,
    body: (
      <ul>
        <li>
          Now in the "Advanced" mode of the exercise editor (both on a phone and in the web editor), there's a link at
          the top that opens a modal with various examples of the reps/weight and finish day scripts.
        </li>
        <li>
          You could use it for "inspiration", to reuse some of the recipes, or come up with your own based on those. Or
          just to see what you can do with <strong>Liftoscript</strong>.
        </li>
      </ul>
    ),
  },
  "20230301": {
    title: <span>Notes</span>,
    body: (
      <ul>
        <li>
          Added ability to add notes to the overall workouts and specific exercises during workout. You can then see
          those notes on the History screen, on the exercise details screen, and also on the Graphs.
        </li>
        <li>
          You can also filter the history on the exercise details screen by whether the history record had notes for
          that exercise.
        </li>
      </ul>
    ),
  },
  "20230319": {
    title: <span>Discord Server</span>,
    body: (
      <ul>
        <li>
          We've got a Discord server now! You can join it here:{" "}
          <a href="https://discord.com/invite/AAh3cvdBRs" target="_blank" className="font-bold underline text-bluev2">
            <IconDiscord className="inline-block mr-1" /> Discord Server
          </a>
        </li>
        <li>
          Join and ask questions there, suggest features, leave feedback, or just chat with other Liftosaur users.
        </li>
      </ul>
    ),
  },
  "20230324": {
    title: <span>Per Exercise Rest Timers</span>,
    body: (
      <ul>
        <li>
          Now you can specify custom exercise rest timers. By default it still would use your workout timer from
          Settings, but you can override it for some exercises. So now you can have different rest timers for Deadlift
          and Bicep Curls!
        </li>
        <li>
          You specify timer as a Liftoscript expression, similar to reps and weight, so you can define logic there too,
          and use state variables. Progressive overload in your rest timer? Why not! :)
        </li>
      </ul>
    ),
  },
  "20230330": {
    title: <span>User entered state variables</span>,
    body: (
      <ul>
        <li>
          Now you can make a user to provide a value for the state variable when they finish an exercise. For that,
          there's a checkbox when you create a state variable.
        </li>
        <li>
          That's useful e.g. for the programs that use RPE (Rating of Perceived Exertion) or RIR (Reps in Reserve) for
          progressions. Or if you want to manually choose the weight for the next workout. Or something like that.
        </li>
      </ul>
    ),
  },
  "20230409": {
    title: <span>Edit state variables from workout screen</span>,
    body: (
      <ul>
        <li>
          You don't need to go to the edit exercise screen to edit the state variables anymore. Now you can do it right
          from a modal that pops up when you tap "edit" icon on the exercise card, on the workout screen.
        </li>
      </ul>
    ),
  },
  "20230419": {
    title: <span>Program Exercise Descriptions</span>,
    body: (
      <ul>
        <li>
          You can now add exercise descriptions when you edit a program exercise. You can add any tips how to do it,
          reminders, or some notes, that'll persist between workouts. You can use markdown for formatting.
        </li>
      </ul>
    ),
  },
  "20230422": {
    title: <span>Quick add sets</span>,
    body: (
      <ul>
        <li>
          Add a way to enable "quick add sets" feature for a program exercise. When enabled, there'll be a button on the
          workout screen after last set, that allows to add another set. On press, there'll be a modal, where you
          specify required sets and weight. It also is marked as completed automatically.
        </li>
        <li>
          Also, there're 2 new variables available in Finish Day Script - <strong>numberOfSets</strong>, and an alias
          for it - <strong>ns</strong>. They contain the number of sets for the exercise at the end of the workout.
        </li>
        <li>
          You can use this to create set-based programs. E.g. increase weight if you did more than 5 sets with 4 reps
          each, or if you did at least 5 sets, and last set reps were more than 8. To access last set weight or reps,
          you can use <strong>weights[numberOfSets]</strong> or <strong>reps[numberOfSets]</strong>.
        </li>
      </ul>
    ),
  },
  "20230430": {
    title: <span>New Liftoscript Engine</span>,
    body: (
      <ul>
        <li>
          The internals of Liftoscript are fully rewrote to a new engine. It's more strict, and it will better find
          syntax errors, missing variables, and it's generally more correct. Also, it will be way easier to add features
          to it now.
        </li>
        <li>
          ⚠️ But because it's stricter, it may consider your previously valid scripts invalid now.{" "}
          <strong>If you get an error - please go to edit exercise screen, and fix the errors!</strong>. Otherwise, it
          may not calculate your reps/weights properly when you finish exercise.
        </li>
      </ul>
    ),
  },
  "20230501": {
    title: <span>More Liftoscript features</span>,
    body: (
      <ul>
        <li>
          Added modulo operator <strong>%</strong> to Liftoscript. I.e. <strong>7 % 2 == 1</strong>, or{" "}
          <strong>5 % 5 == 0</strong>. It's useful for creating programs with repeating patterns.
        </li>
        <li>
          Then, added functions <strong>floor</strong>, <strong>ceil</strong> and <strong>round</strong>. You use them
          like <strong>state.foo = floor(23.4)</strong>. Use them if you need rounding.
        </li>
        <li>
          Also, finally added increment assignment operators, like <strong>+=</strong>, <strong>-=</strong>,{" "}
          <strong>*=</strong> and <strong>/=</strong>. Use them like <strong>state.foo += 5lb</strong> - that'd increase
          `foo` variable by 5lb.
        </li>
      </ul>
    ),
  },
  "20230511": {
    title: <span>Improved program exercise timer expressions</span>,
    body: (
      <ul>
        <li>
          Now you can use not only state variables there, but also the workout variables. Like,{" "}
          <code>completedReps</code>, <code>weights</code>, <code>numberOfSets</code>, etc.
        </li>
        <li>
          Also, added new variable specifically for the timer expression - <code>setIndex</code>. It contains the index
          of the just completed set. You can use it to change timer based on the set number. Or to set a timer between
          exercises (<code>setIndex == numberOfSets ? 90 : 180</code>).
        </li>
      </ul>
    ),
  },
  "20230524": {
    title: <span>Added "Always On Display" in Settings</span>,
    body: (
      <ul>
        <li>
          If you want to keep your screen always on during the workouts, you can enable it in Settings. You need to
          update the app for that though.
        </li>
      </ul>
    ),
  },
  "20230609": {
    title: <span>Added new functions - sum, min and max</span>,
    body: (
      <ul>
        <li>
          You can use them in your scripts to find e.g. min or max completed reps, or sum of all reps. They work on
          variables that are arrays, like <code>reps</code>, <code>weights</code> and <code>completedReps</code>.
        </li>
        <li>
          Like this: <code>state.allCompletedReps = sum(completedReps)</code>
        </li>
      </ul>
    ),
  },
  "20230611": {
    title: <span>Added a way to add labels to sets</span>,
    body: (
      <ul>
        <li>
          Similar like there's a label "Warmup" for the warmup sets, you can add short labels to workout sets as well.
          You can use it to mark sets as <strong>"Drop set"</strong>, or <strong>"RPE 7"</strong>, or{" "}
          <strong>"TM 70%"</strong>, or something like that. The space is limited, so the label is 8 characters max.
        </li>
        <li>
          You can specify labels on the "Edit Program Exercise" screen, where you specify reps, weights and AMRAP.
        </li>
      </ul>
    ),
  },
  "20230613": {
    title: <span>Added sound controls to iOS / Android apps</span>,
    body: (
      <ul>
        <li>
          If the sound of the rest timer is too loud or too quiet, you can now adjust it in the app. There's a Volume
          slider now, as well as a toggle to enable vibration when rest timer ends.
        </li>
        <li>You need to get the new version of the app from App Store / Google Play to get this feature.</li>
      </ul>
    ),
  },
  "20230624": {
    title: <span>Made "Quick Add Set" supported in playgrounds</span>,
    body: (
      <ul>
        <li>So it's easier to test your program exercise logic when you have "Quick Add Set" feature enabled.</li>
      </ul>
    ),
  },
  "20230625": {
    title: <span>Added Long Press to edit the quickly edit the sets in current workout</span>,
    body: (
      <ul>
        <li>
          Now, you can do long press on a set square (for 1 second), and it'll open the edit set modal - the same one
          that you get if you press on the Edit icon, choose "Only in this workout", and then tap on a set.
        </li>
        <li>
          That works both on the workout screen, and also in playgrounds on the edit program exercise screen. But on the
          playground, it won't change the program! It's just to simulate the logic if you change the sets only in
          current running workout.
        </li>
        <li>
          Hopefully that'll make it easier to handle the cases when you want to deviate from a program for some reason
          only for that workout (change the weight for some set, or number of required reps, etc).
        </li>
      </ul>
    ),
  },
  "20230630": {
    title: <span>Bodyfat tracking</span>,
    body: (
      <ul>
        <li>
          Liftosaur is{" "}
          <a href="https://github.com/astashov/liftosaur" target="_blank" className="font-bold underline text-bluev2">
            open-source
          </a>
          , so anyone can see the code, and potentially add features. Amazing{" "}
          <a href="https://github.com/codymurdoc" target="_blank" className="font-bold underline text-bluev2">
            @codymurdoc
          </a>{" "}
          went ahead and added bodyfat tracking support to Liftosaur! This is so cool, thank you so much! It's really
          impressing you were able to figure out how to do that in pretty large codebase, and add it in a clean and nice
          way, it's a pretty big feature. I'm really impressed!
        </li>
      </ul>
    ),
  },
  "20230704": {
    title: <span>Switched "reps x sets" to "sets x reps" on the history screen</span>,
    body: (
      <ul>
        <li>It was kinda confusing since widely used format is "sets x reps".</li>
        <li>So now it's "sets x reps"</li>
      </ul>
    ),
  },
  "20230712": {
    title: <span>Add Custom Equipment</span>,
    body: (
      <ul>
        <li>
          Now you can create your own <strong>custom equipment</strong> (in Settings -&gt; Available Equipment).
        </li>
        <li>
          It could be useful if you have multiple Cable machines with different plate weights for different exercises,
          or you want to create some custom equipment like "Safety Squat Bar", where the bar weights more than regular
          olympic bar.
        </li>
        <li>
          Custom Equipment has all the same properties as built-in equipment (fixed/non-fixed, plates configuration),
          but also additionally you can specify the name, and "Similar To" field.
        </li>
        <li>
          "Similar To" for now only used for the exercise images, so if you create new equipment "Cable 2", with
          different plates, you can set "Similar To" to "Cable", and it'll use cable exercise image.
        </li>
        <li>
          You now also can edit equipment in the Web Editor's Settings modal. You can create new equipment there (e.g.
          Safety Squat Bar), and assign to your exercises there. Custom equipment is properly exported into a link when
          you create a link of a program to share.
        </li>
      </ul>
    ),
  },
};

export namespace WhatsNew {
  export function all(): typeof whatsNew {
    return whatsNew;
  }

  export function doesHaveNewUpdates(lastDateStr?: string): boolean {
    if (lastDateStr == null) {
      return false;
    } else {
      return Object.keys(newUpdates(lastDateStr)).length > 0;
    }
  }

  export function newUpdates(lastDateStr: string): Record<string, IWhatsNew> {
    const url = new URL(window.location.href);
    const forcedUserEmail = url.searchParams.get("forceuseremail");
    if (forcedUserEmail != null) {
      return {};
    }
    const lastDate = parseInt(lastDateStr, 10);
    return ObjectUtils.keys(whatsNew).reduce<Record<string, IWhatsNew>>((memo, dateStr) => {
      const date = parseInt(dateStr, 10);
      if (date > lastDate) {
        memo[dateStr] = whatsNew[dateStr];
      }
      return memo;
    }, {});
  }

  export function updateStorage(dispatch: IDispatch): void {
    updateState(dispatch, [
      lb<IState>().p("storage").p("whatsNew").record(DateUtils.formatYYYYMMDD(Date.now(), "")),
      lb<IState>().p("showWhatsNew").record(false),
    ]);
  }

  export function showWhatsNew(dispatch: IDispatch): void {
    updateState(dispatch, [lb<IState>().p("showWhatsNew").record(true)]);
  }
}

import { h, JSX } from "preact";
import { ObjectUtils } from "../utils/object";
import { IDispatch } from "../ducks/types";
import { DateUtils } from "../utils/date";
import { IState, updateState } from "./state";
import { lb } from "lens-shmens";
import { InternalLink } from "../internalLink";
import { IconDiscord } from "../components/icons/iconDiscord";
import { UrlUtils } from "../utils/url";
import { IconDoc } from "../components/icons/iconDoc";
import { PlannerCodeBlock } from "../pages/planner/components/plannerCodeBlock";
import { IconSwap } from "../components/icons/iconSwap";

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
          <InternalLink name="web-editor" className="font-bold underline text-bluev2" href="/program">
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
          Also, there are 2 new variables available in Finish Day Script - <strong>numberOfSets</strong>, and an alias
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
  "20230716": {
    title: <span>Improve exercise selection modal</span>,
    body: (
      <ul>
        <li>
          Now listing target, synergetic muscle groups, and also the "type" of the exercise (pull, push, upper, lower,
          etc) for each exercise.
        </li>
        <li>
          Also, now you can filter by the "type" and by muscle groups. E.g. you can list all the pull exercises with the
          chest muscle group, or something like that.
        </li>
        <li>You can assign the "type" to your custom exercises now too.</li>
      </ul>
    ),
  },
  "20230724": {
    title: <span>Make the rest timer adjustable</span>,
    body: (
      <ul>
        <li>
          Now you can adjust a running rest timer. Tap on the timer on the right bottom corner, it'll expand, and you
          can add time, reduce time, or cancel the timer completely.
        </li>
      </ul>
    ),
  },
  "20230727": {
    title: <span>Import history from Hevy app</span>,
    body: (
      <ul>
        <li>
          There's a new item in Settings - "Import history from other apps". It opens a modal, where you can choose Hevy
          app, and upload CSV file - and it'll import the history from the file into Liftosaur.
        </li>
      </ul>
    ),
  },
  "20230729": {
    title: <span>Add better volume support</span>,
    body: (
      <ul>
        <li>Now there's a switch between volume and max weight for exercise graphs.</li>
        <li>There are also muscle group volume per week graphs</li>
        <li>There's also volume in lbs added to the exercise stats screen and also previous workouts.</li>
      </ul>
    ),
  },
  "20230804": {
    title: <span>Added RPE support</span>,
    body: (
      <ul>
        <li>
          RPE (Rating of Perceived Exertion) now is well supported in Liftosaur. It's how hard was the exercise, on the
          scale of 0-10, where 10 is the hardest (you couldn't make any more reps){" "}
        </li>
        <li>
          Now you can enable RPE support for your exercises (in Extra Features section), and each set will have 2
          additional fields: <strong>RPE</strong> and <strong>Log RPE</strong>.
        </li>
        <li>For RPE, you can provide Liftoscript expression, that would define required RPE for that set.</li>
        <li>If you enable "Log RPE", it'll ask you for YOUR perceived RPE value when you finish the set.</li>
        <li>
          You can access the required RPE values via <code>RPE</code> and logged RPE in <code>completedRPE</code>{" "}
          variables in the Finish Day Script.
        </li>
        <li>
          Using that, you can define progressions based on RPE, e.g. comparing if your RPE was lower than required RPE -{" "}
          then increase the weight, or something like that.
        </li>
        <li>
          On the history and workout screens, we show required RPE like{" "}
          <strong className="font-bold text-grayv2-main">@8</strong> (gray color) and logged RPE like{" "}
          <strong className="font-bold text-orangev2">@9</strong> (orange color), prefixed by <strong>@</strong> sign.
        </li>
      </ul>
    ),
  },
  "20230822": {
    title: <span>Added visual cues when rounding weights</span>,
    body: (
      <ul>
        <li>
          It's currently very confusing when and why we round the weights, especially for the new users of the app. It
          looks like a bug in the app because it's unexpected, but it just tries to round the weights to your available
          equipment.
        </li>
        <li>
          So, from now on, it'll show strikethrough original weights, and the weight it was rounded to. Also, will show
          a little help message, explaining where you can adjust the equipment.
        </li>
        <li>
          The rounding logic is slightly different now - we round the weights only at the very end, during the workouts.
          State variable changes are not rounded at all.
        </li>
        <li>
          If this change somehow breaks the rounding logic in your program, please contact in Discord or by{" "}
          <a className="font-bold underline text-bluev2" href="mailto:info@liftosaur.com">
            info@liftosaur.com
          </a>
          . It shouldn't break anything, but I could miss some edge cases...
        </li>
      </ul>
    ),
  },
  "20230831": {
    title: <span>Added multi-week support</span>,
    body: (
      <ul>
        <li>
          Now for programs you can enable "Multi-week" mode. That adds <strong>Weeks</strong> - they are similar to{" "}
          <strong>Days</strong>. Like you add exercises to Days and can reuse exercises between days - now you can add
          Days to Weeks and reuse Days between Weeks.
        </li>
        <li>
          That makes it easier to create multi-week programs with mesocycles, deload weeks, 1RM testing weeks, etc. You
          can create regular days, deload days or testing RM days, and then create e.g. 6 weeks with regular days, and
          then 1 week with deload days.
        </li>
        <li>
          When multi-week mode is enabled, the program follows the order of days in weeks. I.e. when you finish a
          workout, it'll go to the next day in the week, or when it was the last day in the week - goes to the first day
          of the next week.
        </li>
        <li>
          There are also new variables available for all the Liftoscript scripts - <strong>week</strong> and{" "}
          <strong>dayInWeek</strong>. You can use them to define logic based on the week number, or week day number.
        </li>
      </ul>
    ),
  },
  "20230902": {
    title: <span>Added rep ranges support</span>,
    body: (
      <ul>
        <li>
          There's a new "Extra Feature" you can enable for exercises now - <strong>Rep Ranges</strong>. If you turn it
          on, you can specify optional <strong>Min Reps</strong> Liftoscript scripts for each set in an exercise. On the
          sets, you'll see rep ranges instead of just a single rep number.
        </li>
        <li>
          If the reps are less than max reps, but more or equal than min reps, the set will be yellow, both in the
          workout and in the history.
        </li>
        <li>
          If the min reps are enabled and provided, you'll have them available in the <strong>minReps</strong> variable
          in the Finish Day scripts. If they're not enabled or provided, they'll use <strong>reps</strong> (i.e. max
          reps) variable values. For example, you don't have min reps for the first set, but max reps are{" "}
          <strong>5</strong>. Then, <code>minReps[1]</code> would be <strong>5</strong>.
        </li>
      </ul>
    ),
  },
  "20230920": {
    title: <span>Added Rep Max Calculator</span>,
    body: (
      <ul>
        <li>
          It's located near weight state variables. You can enter the known weight, reps and RPE, and target reps and
          RPE, and it'll calculate the weight for you.
        </li>
        <li>For actual Rep Max, use RPE = 10.</li>
      </ul>
    ),
  },
  "20230922": {
    title: <span>Moving Average on the Measurement Graphs</span>,
    body: (
      <ul>
        <li>
          Now, on the Measurement screen, for the graphs there you can add moving average graph. It's super useful
          especially for tracking bodyweight or body fat, due to high volatility of those measurements. This was added
          by awesome{" "}
          <a href="https://github.com/123marvin123" target="_blank" className="font-bold underline text-bluev2">
            @123marvin123
          </a>
          , thank you so so much for contributing and adding this feature! It'll help a lot of people tracking their
          weight, and it's a great addition to Liftosaur. Thank you very very much!
        </li>
      </ul>
    ),
  },
  "20230927": {
    title: <span>Offline mode</span>,
    body: (
      <ul>
        <li>
          Liftosaur now can work offline. If there's no Internet, it of course won't be able to load all the built-in
          programs, and it won't be able to sync your data to the server. But it'll still work, all your history and
          programs would be there, and it will just sync the data next time when Internet is available if you're logged
          in.
        </li>
      </ul>
    ),
  },
  "20231016": {
    title: <span>Changed how Web Editor program links work</span>,
    body: (
      <ul>
        <li>
          It used to be that when you edit a program in a web editor, it'd update the link right in the URL bar, and the
          short links like /p/123abc would just redirect to the long links with whole program presented into a URL.
        </li>
        <li>
          But apprently there's 10K limit in the URL length, so it was breaking for some large programs. So, I had to
          change how it works. Now, when you edit a program, you need to generate a link to "Save" it, each change won't
          automatically update the browser history. It'll also show a warning (that you can close) when you change a
          linked program that in order to "Save" the changes, you need to generate a new link that'll represent a
          changed program.
        </li>
      </ul>
    ),
  },
  "20231207": {
    title: <span>You can now fully delete your account</span>,
    body: (
      <ul>
        <li>Added deleting account on the cloud. It's available on the Settings - Account screen.</li>
        <li>
          Now you can be in control of your data, and fully wipe out all your data from the Liftosaur servers if
          necessary!
        </li>
      </ul>
    ),
  },
  "20231225": {
    title: <span>Improved Program Preview in the app and Web Editor</span>,
    body: (
      <ul>
        <li>
          🎄 Merry Christmas! I tweaked the program preview page in the app (both for built-in and your programs), and
          also added Program Preview for the Web Editor.
        </li>
        <li>
          You can use it to get a quick glance at the whole program, try your state var values (e.g. your weights)
          there. You can also enable "Playground" mode, and try how finish day scripts work for various exercises when
          you finish all sets.
        </li>
        <li>
          It should be especially useful for the Web Editor, before it was sometimes pretty tricky to understand if your
          program works properly, especially if it has a bunch of set variations. There was Exercise-level Playground,
          but wasn't Program-level Playground, and now there is!
        </li>
      </ul>
    ),
  },
  "20240103": {
    title: (
      <span>
        Added <strong>"Full Program"</strong> mode to the Workout Planner
      </span>
    ),
    body: (
      <ul>
        <li>
          Now there's a new "Full Program" mode in the{" "}
          <InternalLink
            name="web-editor"
            className="font-bold underline text-bluev2"
            href="https://www.liftosaur.com/planner"
          >
            Workout Planner
          </InternalLink>
          . You can activate it by clicking on the <IconDoc /> icon near the "Convert to Liftosaur program" button. It
          represents the planner program as one big text blob. That could be pretty convenient for editing programs,
          especially multi-week ones. You can save those programs as text files, edit them in any text editor, share
          them as text blobs.
        </li>
        <li>
          It adds 2 new syntax constructions you need to use in the "Full Program" mode - for weeks and for days. To
          create a week, you type a week name from a new line, starting with a hash sign. Like <strong># Week 1</strong>
          . To create a week - same thing, just starting with 2 hash signs, like <strong>## Day 1</strong>.
        </li>
        <li>There's also a bunch of features built-in into the Workout Planner editor:</li>
        <li>
          <strong>Find &amp; Replace</strong> - you can even use regular expressions for powerful replacing
        </li>
        <li>
          <strong>Multicursor typing</strong> - you can set several cursors (by Cmd+click or Ctrl+click), and type in
          multiple places simultaneously.
        </li>
      </ul>
    ),
  },
  "20240106": {
    title: <span>Added ability to set 1 Rep Max for exercises</span>,
    body: (
      <ul>
        <li>
          1RM would be reused across programs, and is tied to exercise themselves, not programs. You still can access it
          in the Liftoscript scripts via <strong>rm1</strong> variable, and you can set it in the Finish Day Script too.
        </li>
        <li>
          I.e. you can do things like <code>rm1 * 0.9</code> in your Weight Liftoscript expressions, or things like{" "}
          <code>rm1 += 5lb</code> in your Finish Day Scripts
        </li>
        <li>
          You can edit 1RM on the Exercise Stats screen (when you tap on the exercise name on the workout screen). Also,
          it'll show up on the "Edit" modal (when you tap on the Edit icon on the working screen) in case it was used
          anywhere in the program exercise scripts.
        </li>
        <li>That should be a good way to make 1RM of the exercises transferrable between programs.</li>
      </ul>
    ),
  },
  "20240127": {
    title: <span>✨ New "Experimental" programs (aka "in-app Workout Planner") ✨</span>,
    body: (
      <ul>
        <li>
          Massive update - now there's a way to build Liftosaur programs using completely different syntax - the one
          that you used in the{" "}
          <InternalLink
            name="whatsnew-workout-planner"
            className="font-bold underline text-bluev2"
            href="https://www.liftosaur.com/planner"
          >
            Workout Planner
          </InternalLink>
        </li>
        <li>
          The syntax got extended with the new features, making it pretty much as powerful as a regular way of building
          programs. You now can use Liftoscript within the new syntax to describe the progressions.
        </li>
        <li>
          Basically, the new programs is just one blob of text, and it changes over time based on your progressions. You
          can define set variations, quick add sets, descriptions, ways to switch between them, etc - everything is
          possible!
        </li>
        <li>
          To create that "experimental" program, just go to <strong>"Choose Program"</strong> screen, tap on{" "}
          <strong>"Create"</strong>, and tap the
          <strong>"Create experimental program"</strong> button.
        </li>
        <li>
          Read more about new syntax and how to write programs that way{" "}
          <InternalLink
            name="whatsnew-planner-blogpost"
            className="font-bold underline text-bluev2"
            href="https://www.liftosaur.com/blog/posts/new-experimental-program-editor/"
          >
            in the blogpost.
          </InternalLink>
        </li>
        <li>
          IMHO it should be much easier to build programs this way. Eventually I'd like to make it a default way of
          writing programs in Liftosaur. So, check it out, and don't hesitate to ask questions in our Discord channel,
          subreddit, or just shooting email to <strong>info@liftosaur.com</strong>!
        </li>
      </ul>
    ),
  },
  "20240205": {
    title: (
      <span>
        New <strong className="text-orangev2">update: custom()</strong> syntax for updates after completed sets (in the
        "Experimental" programs)
      </span>
    ),
    body: (
      <ul>
        <li>
          Now you can dynamically make updates in reps, sets or weights. Like for example, if you want to have AMRAP on
          the first set, and then based on the completed reps of that set adjust the reps of the rest sets, you can do
          it now. Do something like:
          <div className="m-2 overflow-x-auto">
            <PlannerCodeBlock
              script={`Squat / 1x6+, 3x3 / update: custom() {~
    if (setIndex == 1) {
      reps = floor(completedReps[1] / 2)
    }
  ~}`}
            />
          </div>
          and that will make the rest of the sets update after finishing the first set.
        </li>
        <li>
          That <strong>update</strong> script is run after completing every set or updating completed reps on the set.
          It's available only in the new "Experimental" programs.
        </li>
        <li>
          In that script, you may change <strong>reps</strong>, <strong>minReps</strong>, <strong>weights</strong>, and{" "}
          <strong>RPE</strong> variables. It doesn't change a program, and you cannot access state variables, but you
          can access any other built-in variable.
        </li>
        <li>
          You can target all incompleted sets (by using <strong>reps = 3</strong>, <strong>weights = 40lb</strong>,
          etc), or you can target specific sets (e.g. <strong>reps[3] = 10</strong>)
        </li>
      </ul>
    ),
  },
  "20240318": {
    title: (
      <span>Redesigned exercise picker and ability to replace exercises from the workout and new editor screens.</span>
    ),
    body: (
      <ul>
        <li>
          There's a new exercise picker modal, that now combines equipment selection + exercise selection, and also the
          "Substitute" feature.
        </li>
        <li>
          There's also a new "Swap" exercise feature on the workout screen (the <IconSwap className="inline-block" />{" "}
          icon), where you can replace exercise for this workout only, or for the whole program.
        </li>
        <li>
          And now you can replace the exercise across whole program in the new Liftoscript 2.0 editor, both in Web and
          app. You were able to do it before as well with Find & Replace, but now there's simpler UI for it.
        </li>
      </ul>
    ),
  },
  "20240328": {
    title: <span>Improved reusing of sets, reps, weight, RPE, timer and warmups</span>,
    body: (
      <ul>
        <li>
          Now the <b>...Squat</b> syntax would also reuse the warmups.
        </li>
        <li>
          Also, you can override the reused weights, RPE and timer. For example, if you do:
          <div className="m-2 overflow-x-auto">
            <PlannerCodeBlock script={`Squat / ...Bench Press / 200lb`} />
          </div>
          Then it would reuse sets x reps, timer, RPE and warmups from Bench Press - everything except the weight.
        </li>
      </ul>
    ),
  },
  "20240401": {
    title: <span>Loops</span>,
    body: (
      <ul>
        <li>
          You can now write <strong>for</strong> loops in the Liftoscripts.
        </li>
        <li>
          Looks like this:
          <div className="m-2 overflow-x-auto">
            <PlannerCodeBlock
              script={`Bench Press / 3x8 / progress: custom() {~
  for (var.i in completedReps) {
    weights[var.i] = weights[var.i] + 5lb
  }
~}`}
            />
          </div>
          In this case, <strong>var.i</strong> would contain an index of a set, starting from 1.
        </li>
      </ul>
    ),
  },
  "20240403": {
    title: <span>All built-in programs are migrated to the new syntax</span>,
    body: (
      <ul>
        <li>
          All the built-in programs now use the new <strong>Liftoscript 2.0 (aka Workout Planner)</strong> syntax.
        </li>
        <li>Also, by default you now create the programs with the new syntax.</li>
      </ul>
    ),
  },
  "20240413": {
    title: <span>Quickly change weights in a program exercise</span>,
    body: (
      <ul>
        <li>
          For the old programs, it was pretty convenient to just change <strong>state.weight</strong> state variable to
          adjust the weight across the sets of the exercise.
        </li>
        <li>
          In the new plain-text syntax, it got more complicated - if the program is not 1RM-based, you'd need to edit
          the absolute weight in the program text. Which could be quite cumbersome, especially if you have multiple
          weeks to adjust.
        </li>
        <li>
          So I added a way to quickly change the weights in the program exercise, in the "Edit" modal on the workout
          screen. It lists all the weights used by the exercise in a program, and you can quickly adjust them, either by
          typing, or by buttons, and there's also a Rep Max Calculator for convenience.
        </li>
      </ul>
    ),
  },
  "20240415": {
    title: <span>Added a bunch of new programs</span>,
    body: (
      <ul>
        <li>Namely:</li>
        <li>
          <ul className="ml-4 list-disc">
            <li>5/3/1: Boring But Big</li>
            <li>5/3/1: Building The Monolith</li>
            <li>nSuns LP</li>
            <li>Madcow 5x5</li>
            <li>PHUL</li>
            <li>Phrak's Greyskull LP</li>
          </ul>
        </li>
      </ul>
    ),
  },
  "20240417": {
    title: <span>update: custom() improvements</span>,
    body: (
      <ul>
        <li>
          You can use state variables defined in <strong>progress: custom()</strong> in your{" "}
          <strong>update: custom()</strong> scripts.
        </li>
        <li>
          Also kinda breaking change, but also now <strong>update: custom()</strong> script would run right after
          starting a workout. Before completing any sets. With <strong>setIndex == 0</strong>.
        </li>
        <li>You can use that to programmatically configure your workout</li>
      </ul>
    ),
  },
  "20240420": {
    title: <span>Added tags</span>,
    body: (
      <ul>
        <li>
          Now you can add <strong>id: tags(123)</strong> to your exercises, and then change state variables of that
          exercise from a progress block of another exercise. For example:
          <div className="m-2 overflow-x-auto">
            <PlannerCodeBlock
              script={`Squat / 3x8 / id: tags(123) / progress: custom(rating: 0) {~ ~}
Bench Press / 3x8 / progress: custom() {~
  state[123].rating = 2
~}`}
            />
          </div>
        </li>
        <li>
          That <strong>state[123].rating = 2</strong> will set state variable rating in <strong>Squat</strong> to{" "}
          <strong>2</strong>.
        </li>
        <li>It's kinda a niche feature, but could be useful for some programs.</li>
      </ul>
    ),
  },
  "20240421": {
    title: <span>Added rich reps / weight / rpe inputs</span>,
    body: (
      <ul>
        <li>
          Now all the modals (like modal when you edit a set for the current exercise, modal when you edit weights, or
          the AMRAP modal) have "rich" inputs for reps, weight and RPE. They have buttons allowing to adjust the values,
          weight inputs have a Rep Max Calculator, and the buttons increment and decrement various values properly.
        </li>
        <li>
          For example, it'd increment/decrement weights according to available equipment - getting next possible weight
          with your plates. And for reps - it increments by 1, and for RPE - by 0.5
        </li>
      </ul>
    ),
  },
  "20240506": {
    title: <span>"Quick-add sets" is now per set variations</span>,
    body: (
      <ul>
        <li>
          It used to be per whole exercise, so even if you add <strong>1+x5</strong> in one of the days/weeks for your
          exercise, it'd apply to ALL days/weeks (or set variations) in a program for that exercise.
        </li>
        <li>
          It's a bit inconvenient if you only want to have this feature enabled on certain days/weeks. So, now
          "Quick-add sets" is per set variation - if you have <strong>1+x5</strong> on day 1, and <strong>1x5</strong>{" "}
          on day 2, you won't have "Quick-add sets" enabled on day 2.
        </li>
        <li>
          ⚠️ This is a breaking change though! ⚠️ If you use this feature, you likely would need to change your program
          to enable it across all weeks/days where you want to have it, not only the first week/day of the exercise!!!
        </li>
      </ul>
    ),
  },
  "20240525": {
    title: <span>Add UI for tweaking programs</span>,
    body: (
      <ul>
        <li>
          Liftoscript is an amazing way to define weightlifting programs, but typing on the phone could be tedious.
          Sometimes you need to tweak your program on a phone, while you're in a gym - adjust warmups, reps, weights,
          replace/add some exercises. But it's not very convenient to do it in a plain text editor on a phone.
        </li>
        <li>
          So now there's a UI mode for editing the programs, which is the default mode on a phone. You can do almost
          anything you could do in a plain text editor except defining progress, update blocks, descriptions and tags.
        </li>
        <li>
          You can still switch to the plain text mode by tapping on <IconDoc />, and adjust the program text. Also, for
          the Web Editor the plain text mode is still the main way of editing programs.
        </li>
        <li>
          That's a very big feature, so could be bugs - don't hesitate to email me at{" "}
          <strong>info@liftosaur.com</strong> or contact via Discord if there're issues.
        </li>
      </ul>
    ),
  },
  "20240612": {
    title: <span>Changed how equipment works and added multi-gym support</span>,
    body: (
      <ul>
        <li>⚠️ This is a breaking change! Please read! ⚠️</li>

        <li>
          Exercises in Liftosaur used to consist of 2 parts - exercise name and equipment. For example:{" "}
          <strong>Bench Press</strong> and <strong>Dumbbell</strong>, or <strong>Squat</strong> and{" "}
          <strong>Barbell</strong>. And when you select an exercise, you have to pick both equipment and name.
        </li>

        <li>There were several issues with that, but mainly two:</li>
        <li>
          <ul className="ml-4 list-disc">
            <li>
              It was confusing for new users to <strong>pick the equipment AND exercise name</strong>. The fact that you
              need to pick equipment first, and then tap on the exercise name, even if you just want to change the
              equipment for the current exercise was very weird.
            </li>
            <li>
              <strong>Equipment was tied to the available plates</strong>. So, if you wanted to change bar/plates (like
              to a different barbell) - but keep the old ones - you'd get a new exercise, with the new history, graphs,
              etc - which sometimes was undesirable.
            </li>
          </ul>
        </li>

        <li>
          In this change I'm trying to simplify it - now exercise only consists of the exercise name. So, there're
          exercises like <strong>Bench Press, Dumbbell</strong> and <strong>Bench Press, Barbell</strong> - but those
          are 2 different exercises and exercise names.
        </li>

        <li>
          Equipment is separated from the exercise now, and it defines only the plates/bar/fixed weights. You can attach
          equipment to your exercises, and that will be used for rounding and plates calculator - but that's optional!
        </li>

        <li>
          So, for example, you can have <strong>Squat, Barbell</strong> exercise, and attach e.g.{" "}
          <strong>Olymplic Barbell</strong> equipment with 45lb bar and one set of plates. Or attach{" "}
          <strong>Standard Barbell</strong> with 35lb bar, and a different set of plates. Or don't attach any equipment
          - and just specify the default rounding - but in that case you won't have plates calculated.
        </li>

        <li>
          Or you may have <strong>Bicep Curl, Dumbbell</strong>, and attach <strong>Fixed Dumbbells</strong> or{" "}
          <strong>Loaded Dumbbells</strong> to it for rounding and plates calculation.
        </li>

        <li>
          It also changes how custom exercises work. You cannot choose equipment for custom exercises anymore - only the
          name. So, if you had custom exercises with different equipment or even custom equipment - they will be
          migrated to "equipment-less" new exercises.
        </li>

        <li>
          Another new feature is <strong>Gyms</strong>. You can create another <strong>Gym</strong> and specify
          different set of equipment for it. For each exercise you can specify equipment from each gym. And you can
          change the current gym in Settings, and that will define what equipment would be used for exercises.
        </li>

        <li>
          Gyms are totally optional, and by default you only have one. But it could be useful if you{" "}
          <strong>go to multiple gyms</strong>, or if you're <strong>travelling</strong> - then you can just create a
          new gym but don't attach equipment from it to exercises. In that case they'd just use default rounding, which
          could be good enough for travelling - you probably don't want to enter all the equipment details for temporary
          gyms.
        </li>

        <li>
          I know I say that a lot, but - that's a very big new feature, so could be bugs - so don't hesitate to email me
          at <strong>info@liftosaur.com</strong> or contact via Discord/Reddit if there're issues!
        </li>
      </ul>
    ),
  },
  "20240731": {
    title: <span>Updates related to syncing and program saving</span>,
    body: (
      <ul>
        <li>
          I did a massive under the hood update how the app syncs changes with the server, to ensure it only sends the
          necessary (that actually changed) data. Hopefully it'll make the data sync faster and more reliable. There're
          also some user-facing changes related to that:
        </li>
        <li>
          <ul className="ml-4 list-disc">
            <li>
              The Web Editor now has the "Save" button, and the programs don't autosave anymore. Autosaving sometimes
              worked pretty inconsistently, and it wasn't clear whether the changes got saved or not, so I'm trying to
              solve it with explicit saving.
            </li>
            <li>
              The app now has "Pull-to-refresh" functionality - pull the screen to the bottom to force fetch the data
              from the server. Could be useful if you make the changes on the Web Editor, and want to sync them
              immediately to the app.
            </li>
            <li>The app also will try to sync when it goes from background to foreground.</li>
          </ul>
        </li>
      </ul>
    ),
  },
  "20240803": {
    title: <span>Program Version History</span>,
    body: (
      <ul>
        <li>
          There's still a way to lose your program changes you did e.g. in the Web Editor, if immediately after saving
          on the Web you change a program in the app (e.g. by finishing a workout, or changing a program weight) - then
          the changes from the app will overwrite the changes from the Web.
        </li>
        <li>
          That could be super frustrating. So as a way to fix that, I'm adding <strong>Program Version History</strong>.
        </li>
        <li>
          Now each time you save a program (both on the web or in the app), it creates a snapshot of the program. You
          can access the history of all the snapshots in the Web Editor (there's <strong>Versions</strong> link there,
          that opens a modal with all the snapshots), and restore any of the past snapshots. I'll store up to 100 recent
          snapshots.
        </li>
        <li>
          Hopefully it'll reduce the chances of losing your program changes, and make the process less frustrating!
        </li>
      </ul>
    ),
  },
  "20240808": {
    title: <span>Settings - Exercises screen</span>,
    body: (
      <ul>
        <li>
          A lot of users were finding it weird you can only make 1RM or equipment adjustments for exercises during a
          workout. Which makes sense, so I added a separate "Exercises" screen that you can access from the "Settings"
          screen ("Workout" section).
        </li>
        <li>
          You can see exercises grouped by the ones used in your current program, and the ones you did previously, but
          not included into the current program. You can filter them by name, type, muscle groups, etc.
        </li>
        <li>
          And for each exercise you can see their 1RM and currently attached equipment (or default rounding if no
          equipment attached).
        </li>
      </ul>
    ),
  },
  "20240810": {
    title: <span>Custom Exercise Images</span>,
    body: (
      <ul>
        <li>
          Now you can optionally set exercise images to your custom exercises. You can provide URLs for a small image
          (used across the workout screen/program preview/etc) and a large image (used on the exercise stats screen).
        </li>
      </ul>
    ),
  },
  "20240825": {
    title: <span>💸 Introducing localized pricing</span>,
    body: (
      <ul>
        <li>
          It was a bit unfair to ask the same price for users from US and e.g. Afganistan or Phillipines, since the
          purchasing power is so different in those countries.
        </li>
        <li>
          So now the pricing is adjusted according to the country GDP per capita. E.g. it now costs{" "}
          <strong>$5/$40/$80</strong> for monthly/yearly/lifetime in <strong>US</strong>, and{" "}
          <strong>$2.5/$20/$40</strong> in <strong>Turkey</strong>, and <strong>$1/$8/$16</strong> in
          <strong>Phillipines</strong>.
        </li>
      </ul>
    ),
  },
  "20240914": {
    title: (
      <span>
        Custom unit (<strong>lb/kg</strong>) for equipment
      </span>
    ),
    body: (
      <ul>
        <li>Now equipment can override the default unit (lb or kg).</li>
        <li>
          The weight of an exercise would be converted to that unit if that equipment is attached to the exercise. You
          would see the weight in that unit in the history too, but not on graphs - graphs still use default unit.
        </li>
        <li>
          That could be useful if you have equipment with different units in your gym - like some machines are in lb,
          some plates are in kg - that way you can properly track all of them.
        </li>
        <li>
          To make it even better - you may want to use a matching unit in the program exercise as well, to avoid any
          conversions at all. Like if you live in the US, and you have default unit as lbs, but the gym you usually go
          has "Lat Pulldown" cable machine in kgs - it makes sense to specify weights in kg for Lat Pulldown, and set it
          to the kg-based equipment.
        </li>
      </ul>
    ),
  },
  "20240922": {
    title: <span>Pausing a workout</span>,
    body: (
      <ul>
        <li>
          You can now pause the workout, by tapping the pause button in the workout screen header. It'll stop the total
          workout timer.
        </li>
        <li>You can unpause it the same way, or just log any set - it'll unpause it too.</li>
      </ul>
    ),
  },
  "20241011": {
    title: <span>Apple Health and Google Health Connect integration</span>,
    body: (
      <ul>
        <li>
          Now you can submit workouts and body measurements to <strong>Apple Health</strong> and{" "}
          <strong>Google Health Connect</strong>.
        </li>
        <li>
          For the body measurements - it will submit your bodyweight, body fat, and (Apple Health only) - waist
          circumference.
        </li>
        <li>
          It will also read the bodyweight/bodyfat and (Apple Health only) waist circumference from Apple Health or
          Google Health Connect, and add them to the app.
        </li>
        <li>You can enable that in the Settings - Sync - Apple (or Google) Health.</li>
        <li>
          It's available for <strong>Android 14</strong> and for <strong>iOS 15</strong> and higher.
        </li>
      </ul>
    ),
  },
  "20241103": {
    title: <span>Change numberOfSets in progress scripts</span>,
    body: (
      <ul>
        <li>
          Now you can change <strong>numberOfSets</strong> in the progress scripts. So, sets based progressions just got
          way easier to do. Before you had to use either <strong>numsets</strong> state variable + update script, or use
          multiple set variations. Now you can just do <strong>numberOfSets = 4</strong> or{" "}
          <strong>numberOfSets += 1</strong> in your progress scripts.
        </li>
        <li>
          <strong>numberOfSets</strong> also behaves a bit differently now both in <strong>progress</strong> and{" "}
          <strong>update</strong> scripts - if you add sets, it'll add them the same as the last set you had before. So,
          most of the time you don't need to pair it with the <strong>sets()</strong>
          function anymore. E.g. if you have <strong>2x4, 3x8 / 100lb</strong> and you do{" "}
          <strong>numberOfSets += 1</strong> - you'll end up with <strong>2x4, 4x8 / 100lb</strong>.
        </li>
        <li>
          In <strong>progress</strong> scripts you can also specify what week/day/set variation specifically you want to
          change number of sets for, by doing <strong>numberOfSets[week:day:setvariation] = 3</strong>, for example:
          <strong>numberOfSets[2:*:2] = 3</strong>.
        </li>
      </ul>
    ),
  },
  "20241109": {
    title: <span>Improve experience with kg units</span>,
    body: (
      <ul>
        <li>
          Now all the newly cloned programs will be automatically converted to the unit (kg or lb) you have selected in
          Settings. And if you import a program via link, and it has different units from the Settings one, it'll ask
          you if you want to convert into the Settings units.
        </li>
        <li>Also, for the new users the app will ask to pick your units before choosing a program.</li>
      </ul>
    ),
  },
  "20241117": {
    title: <span>Added some convenience shortcuts</span>,
    body: (
      <ul>
        <li>Now you can change the next day or start empty ("Ad-Hoc") workout from the history screen.</li>
        <li>
          On the workout screen there's "Equipment" and (if exercises uses it) - "1RM" links. They open modal to edit
          those, and in Equipment you can define availables plates right from the modal.
        </li>
        <li>
          Added big bold "Start" and "Continue" buttons to the start workout card, because some new users were confused
          how to start a workout.
        </li>
      </ul>
    ),
  },
  "20241130": {
    title: <span>Added Week Insights</span>,
    body: (
      <ul>
        <li>After each week workouts on the Workout History screen - there'll be a card with "Week Insights".</li>
        <li>
          It's pretty much the same as "Week Stats" on the Program screen, but for the actual week - it'll show how many
          sets total, hypertrophy/strength split, sets per muscle group you did with the workouts that week.
        </li>
        <li>
          It can help you analyze your performace in case you skipped workouts, or did Ad-Hoc workouts, or mixed
          different programs.
        </li>
        <li>It's a Premium-only feature! 💵</li>
      </ul>
    ),
  },
  "20241207": {
    title: <span>Added ongoing workout reminder push notification</span>,
    body: (
      <ul>
        <li>
          In case you forget to finish the workout, there will be an additional push notification that will remind you
          that you have an ongoing workout.
        </li>
        <li>
          It's mostly useful if you keep forgetting to finish it, and then you open it in like 5 hours, and it syncs to
          Apple/Google Health, and your calories stats go crazy.
        </li>
        <li>
          You can control the delay when it will notify you on the Settings - Timers screen. By default it's set to 15
          minutes.
        </li>
        <li>You need to update the app from App Store or Google Play to get the feature.</li>
      </ul>
    ),
  },
  "20241208": {
    title: <span>Added `print` function</span>,
    body: (
      <ul>
        <li>
          Useful for debugging your scripts. Use it like:
          <div className="m-2 overflow-x-auto">
            <PlannerCodeBlock
              script={`Squat / 3x3 / progress: custom() {~
  print(1, completedReps[1])
~}`}
            />
          </div>
        </li>
        <li>
          It accepts any number of arguments, and outputs them in the playground or during a workout. Unfortunately
          Liftoscript still doesn't support strings, but you can use numbers to distinguish prints, like:
          <div className="m-2 overflow-x-auto">
            <PlannerCodeBlock
              script={`Squat / 3x3 / progress: custom() {~
  var.a = 10%
  print(1, completedReps[1])
  print(2, 30lb)
  print(3, var.a)
~}`}
            />
          </div>
        </li>
        <li>
          You can use them both in <strong>progress</strong> and <strong>update</strong> scripts.
        </li>
      </ul>
    ),
  },
  "20241214": {
    title: <span>Added day/week descriptions</span>,
    body: (
      <ul>
        <li>
          Now you can add week and day descriptions, in Markdown format. Current week description will be shown on the
          history screen, and the day description will be shown on the ongoing workout screen.
        </li>
        <li>
          You can do that through UI, or in the full program mode you just add comments above the day or week, similarly
          how you do that for the exercises. Like:
        </li>
        <li>
          <div className="m-2 overflow-x-auto">
            <PlannerCodeBlock
              script={`// This is a description for week 1
// * Do this
// * Then do that
# Week 1

// This is a description for day 1
// **Do those exercises:**
## Day 1

Squat / 5x5 / progress: lp(5lb)`}
            />
          </div>
        </li>
      </ul>
    ),
  },
  "20241223": {
    title: <span>Added a way to generate program images</span>,
    body: (
      <ul>
        <li>You can share them in the social media, chats, etc.</li>
        <li>
          You can configure what the image would look like - how many columns (days) would it have, what days to
          include, etc.
        </li>
        <li>
          Available in the Web Editor (the picture icon on the right), or in the kebab menu in the top right corner on
          the Program screen in the app.
        </li>
      </ul>
    ),
  },
  "20250117": {
    title: <span>Share workouts on Social Media</span>,
    body: (
      <ul>
        <li>You can share your finished workouts on Instagram (and once Tiktok approves Liftosaur app - on Tiktok)</li>
        <li>
          You can do it from the congratulations screen, or if you tap on one of the past workouts. This replaces
          outdated "Share" functionality where you could share via a post on Facebook or Twitter.
        </li>
        <li>
          It generates an image of a workout that you could share on some default background, or use your photo as a
          background. Or you can just generate a workout image via "... More" menu, and share it through native share
          sheet.
        </li>
      </ul>
    ),
  },
  "20250119": {
    title: <span>Redesigned the sets, and added PRs to history/exercise stats</span>,
    body: (
      <ul>
        <li>
          Changed what the sets (on the history screen, in the program, etc) look like - now they laid out vertically,
          and it's easier to scan weight/reps for the sets.
        </li>
        <li>
          Also added PRs indication to the history and to the exercise stats screens - highlighting if some set was a
          PR.
        </li>
      </ul>
    ),
  },
  "20250202": {
    title: <span>Redesigning the navigation</span>,
    body: (
      <ul>
        <li>
          Changing the navigation quite drastically, to accomodate upcoming calendar. The following things changed:
        </li>
        <li>
          <ul className="pl-4 list-disc">
            <li>
              Footer buttons got changed - now there's "Home" for the history, "Settings" is renamed to "Me", and{" "}
              <strong>"Measurements" got moved into "Me"</strong>.
            </li>
            <li>
              To start a new workout, tap the Dumbbell button in the footer.{" "}
              <strong>No way to start a workout from the history screen anymore!</strong>
            </li>
            <li>If there's ongoing workout, tap the Dumbbell button again to get back to it.</li>
            <li>
              Each button in the footer resets the navigation stack. So if you go from Home to Program, there'd be no
              "Back" button. This is to make the app navigation more similar to other apps (like Instagram, Facebook,
              etc)
            </li>
          </ul>
        </li>
      </ul>
    ),
  },
  "20250210": {
    title: <span>📅 Added calendar</span>,
    body: (
      <ul>
        <li>Now instead of a flat list of workouts on the Workout History screen, there's a calendar now.</li>
        <li>
          At the top there's week calendar now, that you can swipe left and right to change the week. If you tap it - it
          opens monthly calendar.
        </li>
        <li>You can switch whether a week starts from Monday or Sunday in Settings.</li>
      </ul>
    ),
  },
  "20250304": {
    title: <span>Massive update where nothing is changed</span>,
    body: (
      <ul>
        <li>
          I rewrote the Liftoscript engine from the ground up, to simplify it and remove the dependency on the old-style
          programs. It's now way easier to add new features to it, but that also means I'm replacing a system that was
          battle-tested for years with a new one. So, there could be bugs.
        </li>
        <li>
          In case you see any issues with the Liftoscript or your programs - please please please let me know at{" "}
          <strong>info@liftosaur.com</strong>! Please include the account name (from Me -&gt; Account) in the email.
          Thanks!
        </li>
      </ul>
    ),
  },
  "20250305": {
    title: <span>Added negative weights support</span>,
    body: (
      <ul>
        <li>
          You can now use negative values for weights, e.g. <strong>-5lb</strong>.
        </li>
        <li>
          That could be useful e.g. for the assisted Pull Ups with Leverage Machine, e.g. you can define it as:
          <div className="m-2 overflow-x-auto">
            <PlannerCodeBlock script={`Pull Up / 3x8 40lb / progress: lp(-5lb)`} />
          </div>
          and it will decrease the weight you load on the machine by 5lb each time you finish a workout.
        </li>
        <li>
          Or you could do it like:
          <div className="m-2 overflow-x-auto">
            <PlannerCodeBlock script={`Pull Up / 3x8 -40lb / progress: lp(5lb)`} />
          </div>
          i.e. use negative weight as a base, and incrementing it over time.
        </li>
      </ul>
    ),
  },
  "20250309": {
    title: <span>Big changes in Liftoscript reuse syntax</span>,
    body: (
      <ul>
        <li>
          The reuse syntax like <strong>Squat / ...Bench Press</strong> just became way more powerful.
        </li>
        <li>
          <ul className="pl-4 list-disc">
            <li>
              It now reuses <strong>progress</strong> and <strong>update</strong> scripts as well, including built-in
              like <strong>lp</strong> or <strong>dp</strong>.
            </li>
            <li>
              For "template" exercises (the <strong>/ used: none /</strong> ones) it's not required to have a custom or
              built-in exercise matching the name anymore. So, you can name your templates like <strong>T1</strong> or
              something like that, and don't create custom exercises with <strong>T1</strong> name.
            </li>
            <li>
              If you reuse <strong>progress: custom()</strong>, you don't have to list all the state variables again in
              the reusing <strong>progress: custom()</strong> arguments. They will be inherited, you only need to list
              the ones that have different value from the original ones.
            </li>
            <li>You can reuse exercises with multiple set variations too now.</li>
          </ul>
        </li>
        <li>
          It's a slightly breaking change because if you previously used <strong>...Squat</strong> it didn't reuse
          progress and update scripts, and now it does. So, if you want to reuse everything except progress/update -
          you'd need to overwrite them in the reusing exercise, like:
          <div className="m-2 overflow-x-auto">
            <PlannerCodeBlock script={`Squat / ...Bench Press / progress: custom() {~ ~}`} />
          </div>
        </li>
      </ul>
    ),
  },
  "20250330": {
    title: <span>New Workout Screen!</span>,
    body: (
      <ul>
        <li>Workout screen was completely redesigned.</li>
        <li>
          It now looks closer to all the rest of the workout apps, where each row is a set, and reps and weights are
          input fields. It still will prefill the fields with the values from the program, but you can change them if
          necessary. You don't need to change the fields though, just tap the checkmark if they already look right.
        </li>
        <li>
          The <strong>Target</strong> column contains the requirements for the set - from the program. We still use the
          same color coding to distinguish between success sets (green), failed sets (red) and in-range sets (yellow).
        </li>
        <li>You can swipe the sets, to edit the target, or delete the set.</li>
        <li>
          Instead of one long list with all exercises, now there're tabs for each exercise at the top, and you can see
          the progress of each exercise there. Under each exercise there's graphs and history for that exercise.
        </li>
        <li>
          🚨 <strong>There's a breaking change!!!</strong> 🚨. Completed weights now are contained in the
          <strong>completedWeights</strong> array var (used to be in <strong>weights</strong>). <strong>weights</strong>
          now contains the program weights. There's automated migration that should run and theoretically you don't need
          to do anything, but check your scripts to make sure it looks good.
        </li>
      </ul>
    ),
  },
  "20250409": {
    title: <span>📅 Tweaked the Calendar (Home screen)</span>,
    body: (
      <ul>
        <li>Bringing back the infinite scroll to the Home screen!</li>
        <li>
          A few months ago I added calendar to the Home screen, and removed the infinite scroll, showing only the
          currently selected week workouts instead.
        </li>
        <li>
          The downside of that was that now the scrolling happens in 2 directions - horizontally (switching weeks) and
          vertically (scrolling the workouts) - not as convenient. Also, it used to be nice to see the currently ongoing
          workout on the top of the screen - that was removed with per-week workouts.
        </li>
        <li>
          So, now the infinite scroll is back, and it will show the currently ongoing workout (if any) at the top of
          home screen. While you're scrolling the list, it will update the week insights and week calendar on top. And
          if you open the month calendar (by tapping on the week calendar) and then tap on the workout there - it will
          scroll to that workout.
        </li>
      </ul>
    ),
  },
  "20250413": {
    title: <span>Add "programNumberOfSets" and "completedNumberOfSets" read-only variables</span>,
    body: (
      <ul>
        <li>Those could be useful for number of sets-based progressions.</li>
        <li>
          Currently, there is <strong>numberOfSets</strong> variable, but it only shows how many sets currently in the
          workout total. There's currently no way to read how many sets are in the program for that week/day, or how
          many sets is currently completed.
        </li>
        <li>Those 2 new variables return that. You can use them both in the progress and update scripts.</li>
      </ul>
    ),
  },
  "20250417": {
    title: <span>Add a way to create program days from Ad-hoc workouts</span>,
    body: (
      <ul>
        <li>
          If you did an ad-hoc workout, you may want to create a program day from it (either in a new or existing
          program) - so you could do it again, or incorporate it into your programs.
        </li>
        <li>
          It also lowers the barrier for creating programs - you don't have to create programs upfront, you can build
          them over time iteratively. You do ad-hoc workouts, then create program days from it, slap some progression
          logic on top of it, and you're good to go.
        </li>
        <li>
          You can do that either after finishing the workout - from the congratulations screen, or if you tap on the
          past workout on Home screen.
        </li>
      </ul>
    ),
  },
  "20250421": {
    title: <span>Sets are now optional in the program</span>,
    body: (
      <ul>
        <li>
          If you don't specify any sets for an exercise - it won't be an error anymore. So, a program like this is a
          valid program now:
          <div className="m-2 overflow-x-auto">
            <PlannerCodeBlock
              script={`Squat
Bench Press
Bicep Curl`}
            />
          </div>
        </li>
        <li>
          It could be also useful for "templates", where you could define a template without sets, but e.g. with
          progress and warmups:
          <div className="m-2 overflow-x-auto">
            <PlannerCodeBlock
              script={`main / used: none / warmup: 1x5 45lb, 1x5 135lb / progress: lp(5lb)
Squat / 3x8 100lb / ...main`}
            />
          </div>
        </li>
        <li>
          One <strong>BREAKING CHANGE</strong> is that if you don't specify the weight - it won't add 1RM percentage
          anymore based on reps/RPE. It'd be just empty weight field now, and will ask you about the weight on
          completion.
        </li>
      </ul>
    ),
  },
  "20250424": {
    title: <span>Redesigned "Choose Program" screen</span>,
    body: (
      <ul>
        <li>
          It now has filters (by frequency, duration of a workout, experience, etc) to help you find a suitable program.
        </li>
        <li>
          Builtin and your programs are now separated into separate tabs, and the cards for your programs look similar
          to built-in programs.
        </li>
        <li>
          Also, you can skip selecting a program now, and go without a program. Could be useful if you want to build a
          program iteratively over time from ad-hoc workouts.
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
    const url = UrlUtils.build(window.location.href);
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

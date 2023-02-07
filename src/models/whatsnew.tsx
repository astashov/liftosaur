import { h, JSX } from "preact";
import { ObjectUtils } from "../utils/object";
import { IDispatch } from "../ducks/types";
import { DateUtils } from "../utils/date";
import { IState, updateState } from "./state";
import { lb } from "lens-shmens";

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

import { h, JSX } from "preact";
import { useState } from "preact/hooks";
import { IconArrowDown2 } from "../../components/icons/iconArrowDown2";
import { IconArrowRight } from "../../components/icons/iconArrowRight";
import { DateUtils } from "../../utils/date";

interface IPlannerProgramRevisionsProps {
  programId: string;
  revisions: string[];
}

export function PlannerProgramRevisions(props: IPlannerProgramRevisionsProps): JSX.Element {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  return (
    <div className="my-2">
      <div>
        <button
          className="mr-1 text-center nm-web-editor-expand-collapse-day"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="inline-block w-6 text-center">
            {isCollapsed ? (
              <IconArrowRight className="inline-block align-middle" />
            ) : (
              <IconArrowDown2 className="inline-block align-middle" />
            )}
          </div>
          <h3 className="inline-block ml-1 text-base font-bold align-middle">Version History</h3>
        </button>
      </div>
      {!isCollapsed && (
        <ul>
          {props.revisions.map((revision) => {
            const date = DateUtils.parseYYYYMMDDHHMM(revision);
            if (!date) {
              return null;
            }
            return (
              <li>
                <a
                  target="_blank"
                  className="font-bold underline text-bluev2"
                  href={`/user/p/${props.programId}?revision=${revision}`}
                >
                  {DateUtils.formatWithTime(date)}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

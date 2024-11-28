import { h, JSX } from "preact";
import { IUserDao } from "../../../lambda/dao/userDao";
import { IEventPayload } from "../../api/service";
import { CollectionUtils } from "../../utils/collection";
import { DateUtils } from "../../utils/date";
import { ObjectUtils } from "../../utils/object";

export interface IUserDashboardContentProps {
  adminKey: string;
  userDao: IUserDao;
  events: IEventPayload[];
}

export function UserDashboardContent(props: IUserDashboardContentProps): JSX.Element {
  const { userDao, events: allEvents } = props;

  const groupedEvents = CollectionUtils.groupByExpr(allEvents, (event) => DateUtils.formatYYYYMMDD(event.timestamp));

  return (
    <div className="mx-4">
      <div className="mb-4">
        <h1 className="mt-4 mb-1 text-2xl font-bold leading-none">
          <a
            href={`/app/?admin=${props.adminKey}&userid=${userDao.id}&nosync=true`}
            target="_blank"
            className="underline text-bluev2"
          >
            {userDao.email}
          </a>
        </h1>
        <h2 className="text-base text-grayv2-main">
          id: <strong>{userDao.id}</strong>
        </h2>
        <div className="text-base">
          Workouts: <strong>{userDao.storage.history.length}</strong>, First workout:{" "}
          <strong>
            {DateUtils.formatYYYYMMDD(userDao.storage.history[userDao.storage.history.length - 1].startTime)}
          </strong>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="mb-1 text-2xl font-bold">Programs</h2>
        <ul>
          {userDao.storage.programs.map((program) => (
            <li key={program.id}>
              <div className="">{program.name}</div>
            </li>
          ))}
        </ul>
      </div>

      <h2 className="mb-2 text-2xl font-bold">Events</h2>

      {CollectionUtils.sort(ObjectUtils.keys(groupedEvents))
        .reverse()
        .map((date) => {
          const events = groupedEvents[date];
          if (!events) {
            return null;
          }
          const sortedEvents = CollectionUtils.sortBy(events, "timestamp", true);
          return (
            <div key={date}>
              <h3 className="mt-4 mb-2 text-lg font-bold leading-none">{date}</h3>
              <ul>
                {sortedEvents.map((event) => (
                  <li key={event.timestamp} className="mb-2">
                    <div className="text-sm text-grayv2-main">
                      <EventView event={event} adminKey={props.adminKey} userId={userDao.id} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
    </div>
  );
}

interface IEventViewProps {
  event: IEventPayload;
  adminKey: string;
  userId: string;
}

function EventView(props: IEventViewProps): JSX.Element | null {
  const { event } = props;
  const time = DateUtils.formatHHMMSS(event.timestamp);
  if (event.type === "event") {
    return (
      <div>
        <span className="text-grayv2-main">{time}</span>: <span className="">{event.name}</span>
        {event.extra && <span className="ml-2">{JSON.stringify(event.extra)}</span>}
      </div>
    );
  } else if (event.type === "error") {
    return (
      <div>
        <div>
          <span className="text-grayv2-main">{time}</span>:{" "}
          {event.rollbar_id && (
            <a
              href={`https://rollbar.com/occurrence/uuid/?uuid=${event.rollbar_id}`}
              target="_blank"
              className="font-bold underline text-bluev2"
            >
              RB
            </a>
          )}{" "}
          <span className="text-red-500">{event.message}</span>
        </div>
        <div className="text-xs text-grayv2-main">{event.stack}</div>
      </div>
    );
  } else if (event.type === "safesnapshot" || event.type === "mergesnapshot") {
    return (
      <div>
        <span className="text-grayv2-main">{time}: </span>
        <span className="">{event.type}: </span>
        <a
          target="_blank"
          className="font-bold underline text-bluev2"
          href={`/app/?admin=${props.adminKey}&userid=${props.userId}&storageid=${event.storage_id}nosync=true`}
        >
          {event.storage_id}
        </a>
      </div>
    );
  }
  return null;
}

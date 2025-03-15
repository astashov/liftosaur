import { h, JSX } from "preact";
import { IEventPayload } from "../../api/service";
import { CollectionUtils } from "../../utils/collection";
import { DateUtils } from "../../utils/date";
import { ObjectUtils } from "../../utils/object";

export interface IUserDashboardContentProps {
  adminKey: string;
  userDao: IUserDashboardData | undefined;
  events: IEventPayload[];
}

export interface IUserDashboardData {
  email: string;
  programNames: string[];
  id: string;
  workoutsCount: number;
  firstWorkoutDate?: string;
}

export function UserDashboardContent(props: IUserDashboardContentProps): JSX.Element {
  const { userDao, events: allEvents } = props;
  const userId = userDao ? userDao.id : (allEvents[0].userId ?? "");

  const groupedEvents = CollectionUtils.groupByExpr(allEvents, (event) => DateUtils.formatYYYYMMDD(event.timestamp));

  return (
    <div className="mx-4">
      <div className="mb-4">
        <h1 className="mt-4 mb-1 text-2xl font-bold leading-none">
          {userDao ? (
            <a
              href={`/app/?admin=${props.adminKey}&userid=${userDao.id}&nosync=true`}
              target="_blank"
              className="underline text-bluev2"
            >
              {userDao.email}
            </a>
          ) : (
            "User is not signed up"
          )}
        </h1>
        <h2 className="text-base text-grayv2-main">
          id: <strong>{userId}</strong>
        </h2>
        {userDao && (
          <div className="text-base">
            Workouts: <strong>{userDao.workoutsCount}</strong>
            {userDao.firstWorkoutDate && (
              <span>
                , First workout: <strong>{userDao.firstWorkoutDate}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {userDao && (
        <div className="mb-4">
          <h2 className="mb-1 text-2xl font-bold">Programs</h2>
          <ul>
            {userDao.programNames.map((program) => (
              <li key={program}>
                <div className="">{program}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

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
              <h3 className="sticky top-0 left-0 w-full py-2 mt-4 mb-2 text-lg font-bold leading-none bg-white">
                {date}
              </h3>
              <ul>
                {sortedEvents.map((event) => (
                  <li key={event.timestamp} className="mb-2">
                    <div className="text-sm text-grayv2-main">
                      <EventView event={event} adminKey={props.adminKey} userId={userId} />
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
        {event.isMobile ? <span className="text-grayv2-main">M </span> : <span className="text-greenv2-main">W </span>}
        <span className="text-grayv2-main">{time}</span>: <span className="">{event.name}</span>
        {event.extra && <span className="ml-2">{JSON.stringify(event.extra)}</span>}
      </div>
    );
  } else if (event.type === "error") {
    return (
      <div>
        <div>
          {event.isMobile ? (
            <span className="text-grayv2-main">M </span>
          ) : (
            <span className="text-greenv2-main">W </span>
          )}
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
        <pre className="text-xs leading-none text-grayv2-main">{event.stack}</pre>
      </div>
    );
  } else if (event.type === "safesnapshot" || event.type === "mergesnapshot") {
    return (
      <div>
        {event.isMobile ? <span className="text-grayv2-main">M </span> : <span className="text-greenv2-main">W </span>}
        <span className="text-grayv2-main">{time}: </span>
        <span className="">{event.type}: </span>
        <a
          target="_blank"
          className="font-bold underline text-bluev2"
          href={`/app/?admin=${props.adminKey}&userid=${props.userId}&storageid=${event.storage_id}&nosync=true`}
        >
          {event.storage_id}
        </a>
        <span className="ml-2">
          update: <pre>{event.update}</pre>
        </span>
      </div>
    );
  }
  return null;
}

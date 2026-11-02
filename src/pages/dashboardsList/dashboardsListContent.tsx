import { JSX, useState } from "react";
import { IAccount } from "../../models/account";
import { IDashboard } from "../../types";
import { Service } from "../../api/service";
import { Button } from "../../components/button";
import { IconDuplicate2 } from "../../components/icons/iconDuplicate2";
import { IconTrash } from "../../components/icons/iconTrash";
import { IconSpinner } from "../../components/icons/iconSpinner";
import { Dialog_alert, Dialog_confirm } from "../../utils/dialog";
import { UidFactory_generateUid } from "../../utils/generator";
import { UrlUtils_build } from "../../utils/url";
import { DashboardWebSave_blank, DashboardWebSave_copy, DashboardWebSave_delete } from "../../models/dashboardWebSave";

export interface IDashboardsListPageData {
  isMobile: boolean;
  account: IAccount;
  dashboards: IDashboard[];
  currentDashboardId?: string;
}

export interface IDashboardsListContentProps extends IDashboardsListPageData {
  client: Window["fetch"];
  deviceId: string;
}

function dashboardUrl(id: string): string {
  return UrlUtils_build(`/user/d/${encodeURIComponent(id)}`, window.location.href).toString();
}

export function DashboardsListContent(props: IDashboardsListContentProps): JSX.Element {
  const service = new Service(props.client);
  const [dashboards, setDashboards] = useState(props.dashboards);
  const [currentDashboardId, setCurrentDashboardId] = useState(props.currentDashboardId);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);
  const isBusy = busyId != null;

  const run = async (id: string, action: () => Promise<boolean>): Promise<void> => {
    setBusyId(id);
    try {
      await action();
    } finally {
      setBusyId(undefined);
    }
  };

  const create = (dashboard: IDashboard): Promise<boolean> =>
    service.postCreateDashboard(dashboard, props.deviceId).then((result) => {
      if (!result.success) {
        Dialog_alert(result.error);
      }
      return result.success;
    });

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Your Dashboards</h1>
        <Button
          name="new-dashboard"
          kind="purple"
          disabled={isBusy}
          onClick={() =>
            run("new", async () => {
              const dashboard = DashboardWebSave_blank(UidFactory_generateUid(8));
              const isCreated = await create(dashboard);
              if (isCreated) {
                window.location.href = dashboardUrl(dashboard.id);
              }
              return isCreated;
            })
          }
        >
          New Dashboard
        </Button>
      </div>
      <ul>
        {dashboards.map((dashboard) => (
          <li key={dashboard.id} className="flex flex-wrap items-center gap-2 mb-6" data-testid="dashboards-list-item">
            <a
              className="text-lg font-bold underline text-text-link"
              href={`/user/d/${encodeURIComponent(dashboard.id)}`}
            >
              {dashboard.name}
            </a>
            {dashboard.id === currentDashboardId ? (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-background-purpledark text-text-purple">
                Current
              </span>
            ) : (
              <button
                className="text-xs underline text-text-link"
                disabled={isBusy}
                onClick={() =>
                  run(dashboard.id, async () => {
                    const result = await service.postSelectDashboard(dashboard.id, props.deviceId);
                    if (result.success) {
                      setCurrentDashboardId(dashboard.id);
                    } else {
                      Dialog_alert(result.error);
                    }
                    return result.success;
                  })
                }
              >
                Make current
              </button>
            )}
            <button
              className="px-2 align-middle"
              title="Duplicate"
              disabled={isBusy}
              onClick={() =>
                run(dashboard.id, async () => {
                  const copy = DashboardWebSave_copy(dashboard, UidFactory_generateUid(8));
                  const isCreated = await create(copy);
                  if (isCreated) {
                    setDashboards((current) => [...current, copy]);
                  }
                  return isCreated;
                })
              }
            >
              <IconDuplicate2 />
            </button>
            <button
              className="px-2 align-middle"
              title="Delete"
              disabled={isBusy}
              onClick={async () => {
                const decision = DashboardWebSave_delete({ dashboards, currentDashboardId }, dashboard.id);
                if (decision.kind === "error") {
                  Dialog_alert(decision.message);
                  return;
                }
                if (!(await Dialog_confirm(`Delete dashboard '${dashboard.name}'?`))) {
                  return;
                }
                await run(dashboard.id, async () => {
                  const result = await service.deleteDashboard(dashboard.id, props.deviceId);
                  if (result.success) {
                    setDashboards(decision.dashboards);
                    setCurrentDashboardId(decision.currentDashboardId);
                  } else {
                    Dialog_alert(result.error);
                  }
                  return result.success;
                });
              }}
            >
              {busyId === dashboard.id ? <IconSpinner color="black" width={16} height={16} /> : <IconTrash />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

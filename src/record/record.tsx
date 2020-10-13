import { h, JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { Service, IRecordResponse } from "../api/service";
import { RecordContent } from "./recordContent";

interface IProps {
  client: Window["fetch"];
}

export function EntryView(props: IProps): JSX.Element {
  const [state, setState] = useState<IRecordResponse | undefined>(undefined);

  useEffect(() => {
    const url = new URL(document.location.href);
    const service = new Service(props.client);
    const user = url.searchParams.get("user");
    const id = url.searchParams.get("id");
    if (user != null && id != null) {
      service.record(user, id).then((response) => {
        if ("data" in response) {
          setState(response.data);
        }
      });
    }
  }, []);

  console.log(state);

  if (state == null) {
    return (
      <div class="flex h-full items-center justify-center">
        <div class="flex-1 text-center">Loading</div>
      </div>
    );
  } else {
    return (
      <div class="mx-auto my-0" style={{ maxWidth: "800px" }}>
        <RecordContent data={state} />
      </div>
    );
  }
}

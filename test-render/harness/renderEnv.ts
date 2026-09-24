import { IEnv } from "../../src/models/state";
import { Service } from "../../src/api/service";
import { AsyncQueue } from "../../src/utils/asyncQueue";
import { Persistence } from "../../src/utils/persistence";
import { MockAudioInterface } from "../../src/lib/audioInterface";
import { MockBridges_build } from "../../test/utils/mockBridges";
import { navigationRef } from "../../src/navigation/navigationRef";
import { getCurrentScreenData } from "../../src/navigation/navigationService";

export interface IRenderEnv {
  env: IEnv;
  bridges: ReturnType<typeof MockBridges_build>;
}

// A signed-out device syncs on boot and the server answers "not_authorized", which the app treats
// as "stay local". Every other route is a mistake the fixture should report, not answer.
const responses: Record<string, unknown> = {
  "/programdata/index.json": [],
  "/api/sync2": { type: "error", error: "not_authorized" },
};

function fixtureFetch(): Window["fetch"] {
  return (async (url: RequestInfo | URL) => {
    const href = typeof url === "string" ? url : url.toString();
    const route = Object.keys(responses).find((path) => href.includes(path));
    if (route == null) {
      throw new Error(`The render fixture has no response for ${href}; add it to renderEnv.ts`);
    }
    return new Response(JSON.stringify(responses[route]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as Window["fetch"];
}

export function RenderEnv_build(): IRenderEnv {
  const bridges = MockBridges_build();
  const env: IEnv = {
    service: new Service(fixtureFetch()),
    audio: new MockAudioInterface(),
    queue: new AsyncQueue(),
    persistence: new Persistence(undefined, "sharded", 0),
    navigationRef,
    getCurrentScreenData,
    timer: bridges.timer,
    workout: bridges.workout,
    watch: bridges.watch,
    keychain: bridges.keychain,
    mirroring: bridges.mirroring,
  };
  return { env, bridges };
}

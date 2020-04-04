import CloudflareWorkerGlobalScope from "types-cloudflare-worker";
import { Router } from "./router";

declare let self: CloudflareWorkerGlobalScope;
declare let webpushrKey: string;
declare let webpushrAuthToken: string;

self.addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  const response = await fetch("https://app.webpushr.com/api/v1/notification/send/sid", {
    method: "POST",
    headers: {
      webpushrKey: webpushrKey,
      webpushrAuthToken: webpushrAuthToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "Timer",
      message: "Time to get another attempt",
      target_url: "https://www.webpushr.com",
      expire_push: "5m",
      sid: url.searchParams.get("sid")
    })
  });

  const init = {
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "https://www.liftosaur.com"
    },
    status: response.status
  };
  const body = JSON.stringify({ status: response.ok ? "ok" : "error" });
  return new Response(body, init);
}

async function handleRequest(request: Request): Promise<Response> {
  const r = new Router();
  r.post(".*timernotification", (req: Request) => handler(req));
  const resp = await r.route(request);
  return resp;
}

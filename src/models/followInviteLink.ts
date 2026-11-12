const liftosaurHosts = ["liftosaur.com", "www.liftosaur.com"];
const tokenPattern = /^[A-Za-z0-9_-]{8,64}$/;

export function FollowInviteLink_token(url: string, allowAnyHost: boolean = false): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (!allowAnyHost && !liftosaurHosts.includes(parsed.host)) {
    return undefined;
  }
  const fromPath = parsed.pathname.match(/^\/f\/([^/]+)\/?$/)?.[1];
  const token = fromPath ?? parsed.searchParams.get("followInvite") ?? undefined;
  return token != null && tokenPattern.test(token) ? token : undefined;
}

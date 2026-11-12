const appStoreUrl = "https://apps.apple.com/us/app/liftosaur-scriptable-workouts/id1661880849";
const playStoreUrl = "https://play.google.com/store/apps/details?id=com.liftosaur.www.twa";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function FollowInvitePage_html(args: { token: string; nickname?: string; isValid: boolean }): string {
  const name = args.nickname ? escapeHtml(args.nickname) : "A Liftosaur lifter";
  const openUrl = `/app/?followInvite=${encodeURIComponent(args.token)}`;
  const body = args.isValid
    ? `<h1>${name} invited you to follow their training</h1>
       <p>Open the invite in Liftosaur to send a follow request.</p>
       <a class="primary" href="${openUrl}">Open in Liftosaur</a>`
    : `<h1>This invite has expired</h1>
       <p>Invites work once and expire after 7 days. Ask your friend for a new one.</p>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Liftosaur invite</title>
<style>
  body { font-family: Poppins, -apple-system, sans-serif; margin: 0; padding: 48px 16px; color: #000; background: #fff; text-align: center; }
  h1 { font-size: 22px; font-weight: 600; margin: 0 0 12px; }
  p { color: #607284; font-size: 15px; margin: 0 0 24px; }
  a.primary { display: inline-block; background: #8356F6; color: #fff; text-decoration: none; padding: 14px 24px; border-radius: 12px; font-weight: 600; }
  .stores { margin-top: 32px; font-size: 14px; }
  .stores a { color: #28839F; margin: 0 8px; }
</style>
</head>
<body>
${body}
<div class="stores"><a href="${appStoreUrl}">App Store</a><a href="${playStoreUrl}">Google Play</a></div>
</body>
</html>`;
}

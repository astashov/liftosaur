function updateGooglePlayParams(): void {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("cpgsrc");
  const medium = params.get("cpgmdm");
  const referrerParams = [];
  if (source) {
    referrerParams.push(`utm_source=${source}`);
  }
  if (medium) {
    referrerParams.push(`utm_medium=${medium}`);
  }
  const referrer = escape(referrerParams.join("&"));
  for (const link of Array.from(document.querySelectorAll(".google-play-link"))) {
    const href = link.getAttribute("href");
    link.setAttribute("href", `${href}&referrer=${referrer}`);
  }
}

async function main(): Promise<void> {
  updateGooglePlayParams();
}

main();

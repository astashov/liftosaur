function updateSource(): void {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("cpgsrc");
  if (source) {
    window.localStorage.setItem("source", source);
  }
}

function setStoreParams(): void {
  const source = window.localStorage.getItem("source");
  if (source) {
    for (const link of Array.from(document.querySelectorAll(".google-play-link"))) {
      const href = link.getAttribute("href");
      link.setAttribute("href", `${href}&referrer=${source}`);
    }

    for (const link of Array.from(document.querySelectorAll(".apple-store-link"))) {
      const href = link.getAttribute("href");
      link.setAttribute("href", `${href}&ct=${source}`);
    }
  }
}

async function main(): Promise<void> {
  updateSource();
  setStoreParams();
}

main();

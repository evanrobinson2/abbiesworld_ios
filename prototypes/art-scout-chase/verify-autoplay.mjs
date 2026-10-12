import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "/usr/local/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});

const page = await browser.newPage();
page.on("console", (m) => console.log("PAGE:", m.text()));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "networkidle0" });

const result = await page.evaluate(async () => {
  const final = await window.ArtScout.autoPlay(200);
  return {
    beat: final.beat,
    cluesFound: [...final.cluesFound],
    assembled: final.assembled,
    tricksterFound: final.tricksterFound,
    scene: document.getElementById("app").dataset.scene,
    debug: document.getElementById("debug-state").textContent,
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();

if (result.beat !== "celebrate" || !result.tricksterFound || result.cluesFound.length !== 3) {
  console.error("FAIL: playthrough did not reach celebrate with 3 clues");
  process.exit(1);
}
console.log("PASS: end-to-end playthrough ok");

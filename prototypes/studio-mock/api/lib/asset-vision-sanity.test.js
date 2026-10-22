/**
 * Unit checks for asset vision sanity helpers (no live OpenAI required).
 * Run: node prototypes/studio-mock/api/lib/asset-vision-sanity.test.js
 */
import { framingPromptAddon, runAssetSanityCheck } from "./asset-vision-sanity.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(framingPromptAddon("poi.exterior").includes("half"), "exterior framing");
assert(framingPromptAddon("portrait").toLowerCase().includes("face"), "portrait framing");

const skipped = await runAssetSanityCheck({
  openaiKey: "",
  brief: "pink rocket",
  kind: "poi.exterior",
  semanticId: "poi.moonBase.rocket.exterior",
});
assert(skipped.skipped === true, "skips without key");
assert(skipped.pass === true, "skip does not hard-block offline unit path");

const prev = process.env.ASSET_SANITY;
process.env.ASSET_SANITY = "0";
const forced = await runAssetSanityCheck({
  openaiKey: "sk-test",
  bytes: Buffer.from("fake"),
  brief: "x",
  kind: "map",
  semanticId: "map.test",
});
assert(forced.skipped === true && forced.pass === true, "ASSET_SANITY=0 skips");
if (prev === undefined) delete process.env.ASSET_SANITY;
else process.env.ASSET_SANITY = prev;

const noImage = await runAssetSanityCheck({
  openaiKey: "sk-test",
  brief: "abbie face portrait",
  kind: "portrait",
  semanticId: "token.abbie.face",
});
assert(noImage.pass === false, "no image fails");
assert(noImage.flags.includes("sanity_no_image"), "flags no image");

console.log("asset-vision-sanity.test.js OK");

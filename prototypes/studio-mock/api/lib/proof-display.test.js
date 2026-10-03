import {
  publicProofImageUrl,
  signProofImage,
  verifyProofImage,
  unapprovedImageGallery,
} from "./proof-display.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const token = signProofImage({ missionId: "m1", proofId: "p1", index: 2 });
assert(verifyProofImage({ missionId: "m1", proofId: "p1", index: 2, token }), "valid hmac");
assert(!verifyProofImage({ missionId: "m1", proofId: "p1", index: 3, token }), "wrong index");
assert(!verifyProofImage({ missionId: "m1", proofId: "p1", index: 2, token: "nope" }), "bad token");

const url = publicProofImageUrl({ missionId: "m1", proofId: "p1", index: 2 });
assert(url.includes("studio-mock-iota.vercel.app/api/proof-image"), "studio public host");
assert(url.includes("t="), "signed query");

const mission = {
  id: "m1",
  proofs: [
    {
      id: "p1",
      status: "awaiting_approval",
      requirementId: "req.art.rocket.exterior",
      payload: {
        candidates: [
          { index: 1, url: "https://cdn.example/a.png", label: "A" },
          { index: 2, url: "https://cdn.example/b.png", label: "B" },
        ],
      },
    },
  ],
  requirements: [{ id: "req.art.rocket.exterior", semanticId: "poi.home.rocket.exterior" }],
};
const gallery = unapprovedImageGallery(mission);
assert(gallery.length === 2, "two awaiting");
assert(gallery[0].markdown.startsWith("![A]("), "markdown");
assert(gallery[0].displayUrl.includes("proofId=p1"), "proof in url");

const dumped = structuredClone(mission);
dumped.proofs[0].status = "rejected";
const harvest = unapprovedImageGallery(dumped, {
  worldDoc: {
    creative: {
      executionCapacity: {
        jobs: {
          ecjob_1: {
            id: "ecjob_1",
            state: "completed",
            payload: { semanticId: "poi.home.rocket.exterior" },
            result: { candidateUrls: ["https://cdn.example/h1.png", "https://cdn.example/h2.png"] },
          },
        },
      },
    },
  },
});
assert(harvest.length === 2, "harvest after dump");
assert(harvest[0].jobId === "ecjob_1", "job id");
assert(harvest[0].displayUrl.includes("jobId=ecjob_1"), "job proxy");

console.log("proof-display.test.js OK");

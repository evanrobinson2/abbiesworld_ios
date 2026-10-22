# Midjourney: prompt, wait, upscale, download

How Claude pulls Midjourney images into the repo from Evan's Mac. It drives the Midjourney web app in Evan's signed-in Chrome through the Claude in Chrome extension, from a Claude Code session running on the Mac. Go at a human pace, one job at a time.

## Files

- `mj.js` is pasted into a midjourney.com tab (Claude in Chrome's `javascript_tool`, or the DevTools console). It defines `window.mj`: `jobIds`, `waitForNewJob`, `imagine`, `upscale` and `download`.
- `split_views.py` splits a turnaround sheet into `view_front.png`, `view_side.png` and `view_back.png`.
- `prompts/` holds the prompts that produced committed outputs.
- `outputs/<name>/` holds the images and a `provenance.json` with the prompt, job IDs, date, source URLs and hashes.

## Steps

1. Open `https://www.midjourney.com/imagine`. Type the prompt into the "What would you like to imagine?" bar and press Return. Typing it with the browser tool is the tested path; `mj.imagine(prompt)` sets the box from JS and has not been tried yet.
2. Wait about 20 to 40 seconds. The newest job sits at the top of the Create page. `mj.jobIds()[0]` gives its ID.
3. Open `https://www.midjourney.com/jobs/<jobId>?index=<0-3>` for the pick, paste `mj.js`, and run `await mj.upscale("Subtle")`. Pass `true` as the second argument for a dry run that only finds the button.
4. Back on `/imagine`, paste `mj.js` again. The upscale is the newest job, so `mj.jobIds()[0]` again, once `mj.busy()` is false.
5. `await mj.download(jobId, index, "name.png")` saves `https://cdn.midjourney.com/<jobId>/0_<index>.png` to `~/Downloads`. An upscale's image is index 0. The CDN returns 403 to curl, so the download has to go through the tab.
6. Copy the file into `outputs/<name>/`, run `split_views.py` if it is a sheet, and write `provenance.json`.

## Outputs

`outputs/paper-warrior-turnaround/` (2026-10-22) is a front, side and back sheet of the matte white papercraft Roman soldier on a teal backdrop. Grid job `3bc5823d-956d-4155-8795-9fe69db59e5f`, image 4, upscaled (Subtle) as job `9a563437-96d8-4e14-8ec1-911f762628db` to 2912×1632. It serves as the multi-view target for `tools/paper-warrior`.

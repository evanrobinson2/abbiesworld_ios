(function () {
  function jwt() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var raw = String(localStorage.getItem(localStorage.key(i)) || "");
        var match = raw.match(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/);
        if (match) return match[0];
      }
    } catch (error) {}
    return "";
  }
  function pushClip(songs, seen, clip) {
    if (!clip || !clip.id || seen[clip.id]) return;
    var audio = clip.audio_url || "";
    if (!audio && /^[0-9a-f-]{36}$/i.test(clip.id)) {
      audio = "https://cdn1.suno.ai/" + clip.id + ".mp3";
    }
    if (!audio) return;
    seen[clip.id] = 1;
    songs.push({
      id: String(clip.id),
      name: String(clip.title || clip.name || "Untitled").slice(0, 180),
      audio: String(audio),
      image: String(clip.image_url || ""),
      page: "https://suno.com/song/" + clip.id
    });
  }
  var songs = [];
  var seen = {};
  var note = "";
  var token = jwt();
  var cursor = null;
  for (var page = 0; page < 25 && songs.length < 400; page++) {
    var body = { limit: 20, filters: { trashed: "False" } };
    if (cursor) body.cursor = cursor;
    var xhr = new XMLHttpRequest();
    try {
      xhr.open("POST", "https://studio-api-prod.suno.com/api/feed/v3", false);
      xhr.withCredentials = true;
      xhr.setRequestHeader("content-type", "application/json");
      if (token) xhr.setRequestHeader("authorization", "Bearer " + token);
      xhr.send(JSON.stringify(body));
    } catch (error) {
      note = "feed-blocked";
      break;
    }
    if (xhr.status < 200 || xhr.status >= 300) {
      note = "feed-" + xhr.status;
      break;
    }
    var data;
    try { data = JSON.parse(xhr.responseText); }
    catch (error) { note = "feed-bad-json"; break; }
    var clips = data.clips || data.items || [];
    for (var i = 0; i < clips.length; i++) pushClip(songs, seen, clips[i]);
    if (!data.has_more || !data.next_cursor) break;
    cursor = data.next_cursor;
  }
  if (!songs.length) {
    var links = document.querySelectorAll("a[href*='/song/']");
    for (var j = 0; j < links.length; j++) {
      var href = links[j].href || "";
      var idMatch = href.match(/song\/([0-9a-f-]{36})/i);
      if (!idMatch) continue;
      var title = (links[j].innerText || "").trim().split("\n")[0];
      pushClip(songs, seen, {
        id: idMatch[1],
        title: title || "Untitled",
        audio_url: "https://cdn1.suno.ai/" + idMatch[1] + ".mp3"
      });
    }
    if (songs.length) note = note ? note + "+page" : "page-only";
  }
  return JSON.stringify({ songs: songs, note: note, href: location.href });
})()

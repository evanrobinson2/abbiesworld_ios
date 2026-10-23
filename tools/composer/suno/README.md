# Evan's Suno songs

`songs.json` lists Evan's own Suno songs for Abbie's World (the sung theme and its versions, the Crayon Physics set,
Reimagined, Launch and Launch Jackpot): ids, titles, style text and dates. No audio goes into git. The `suno-store`
workflow copies each song from Suno's CDN (`cdn1.suno.ai/<id>.mp3`) to our R2 CDN at `music/suno/<id>.mp3`, writes
`music/suno/catalog.json`, and attaches the files to the `suno-library` release. Add a song by adding its id here.

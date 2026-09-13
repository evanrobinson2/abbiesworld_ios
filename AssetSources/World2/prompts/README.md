# Exact World 2 prompts

Store each supplied prompt verbatim at:

`prompts/<productionId>/v<version>.txt`

For the first canonical set, the expected paths are `1001A/v1.txt`, `1001B/v1.txt`,
`1002/v1.txt`, and `1004/v1.txt` through `1009/v1.txt`.

Do not put placeholder or reconstructed prompt prose in these files. After adding an
exact prompt, compute its SHA-256 over the file's exact UTF-8 bytes and update both
`inventory.json` and `source-manifest.json`. Set `prompt.state` in the inventory to
`exact`. Existing versions are immutable; corrections or revisions get a new version.

Validation intentionally fails closed while any prompt remains in
`awaiting_exact_supplied_prompt` state.

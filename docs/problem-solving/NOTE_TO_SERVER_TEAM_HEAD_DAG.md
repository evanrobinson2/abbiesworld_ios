# Note to server team — Head DAG reasoning node

Client: Abbie’s World iOS, Whizbang / Incredimachine.

Do **not** add a second OpenAI SDK. The iPad will not call OpenAI. Route this through the existing `OpenAIClient` in `src/openai_client.py`.

## Need

`POST /api/reason`

This is the **reasoning node** of the head-extraction DAG:

```
load_source_image → reason (this endpoint) → crop_head
```

`reason` looks at a generated picture and returns where the character’s head is.

## Implementation

Add a method on `OpenAIClient` (or reuse `generate_prompt` with a JSON instruction). It must use the same `chat.completions.create` path, with the reference image attached as vision, same as prompt generation.

Suggested signature:

```python
def reason(
    self,
    instruction: str,
    reference_image_paths: list[str],
    reasoning_effort: str = "low",
) -> str:
    ...
```

Keep `reasoning_effort` on the client you already use (`generate_prompt` already passes `reasoning_effort`). Do not invent a new HTTP client.

Default instruction from iOS:

> Look at this picture. Return JSON only, no markdown:
> `{"bbox":{"x":0-1,"y":0-1,"w":0-1,"h":0-1},"notes":"short"}`
> `bbox` is the character’s head (and a little neck), normalized to the image, origin top-left.

## Request

```json
{
  "instruction": "...",
  "referenceImageIds": ["/static/generated/abc.png"],
  "via": "openai_client"
}
```

`referenceImageIds` are the same path style as `/api/create`.

## Response

```json
{
  "text": "{\"bbox\":{\"x\":0.31,\"y\":0.04,\"w\":0.38,\"h\":0.36},\"notes\":\"round purple ghost head\"}",
  "bbox": { "x": 0.31, "y": 0.04, "w": 0.38, "h": 0.36 }
}
```

Parse JSON from the model; also return `bbox` as an object so the iPad does not have to scrape prose.

## Draw-only heads (already possible)

The other DAG branch does **not** need a new route. iOS will `POST /api/create` with:

- `freeTextDescription`: draw **only** the character’s head, isolated, no body
- `referenceImageIds`: optional source picture
- `recipeItems`: `[]`

That already hits `OpenAIClient.generate_prompt` then `generate_image`. Confirm empty `recipeItems` is allowed.

## Why

Whizbang sticks a head on a ragdoll. Heads come from:

1. GPT Image draw-only heads (`generate_image`)
2. Heads cropped out of gallery pictures after **your** reasoning step

Both must go through `openai_client.py`.

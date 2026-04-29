# Graphic Novel Production — nano2 Workspace

## Gemini MCP Tools Available

- `generate_image` — Text-to-image. Use for character reference sheets and scenes without characters.
- `compose_images` — Combine 2-10 input images with a prompt. Use for ALL story pages with characters.
- `edit_image` — Modify an existing image.
- `style_transfer` — Apply style from one image to another.

**Model**: Gemini 3 Pro Image Preview (set via `GEMINI_IMAGE_ENDPOINT` in `.mcp.json`). Best text rendering and character consistency.

## Projects Folder

All graphic novel projects live under: `C:\Users\paqui\OneDrive\Documents\claude_code\nano2\`
Always use full absolute Windows paths for all file operations.

## fal.ai Video Generation (Veo 3.1)

For image-to-video with native lip sync (used by the `video-quote` skill at `C:\Users\paqui\.claude\skills\video-quote\SKILL.md`).

**API key**: Set `FAL_KEY` as a Windows env var (`setx FAL_KEY "<key>"` once, then restart shell). Do NOT commit the key. The actual value lives in the `fal-video-skill.md` hand-off doc and the user's password manager — never paste it into a tracked file.

**Endpoints**:
- Upload init: `POST https://rest.alpha.fal.ai/storage/upload/initiate` → returns `{file_url, upload_url}`. Then PUT bytes to `upload_url` (no auth header — signed URL).
- Submit: `POST https://queue.fal.run/fal-ai/veo3.1/image-to-video` with `Authorization: Key $FAL_KEY`
- Poll: `GET <status_url>` every **15s** (not less — fal returns same status for ~10s windows)
- Result: `GET <response_url>` → `{video: {url, ...}}`

**Veo 3.1 params**: `{prompt, image_url, duration: "8s", resolution: "720p", aspect_ratio: "auto", generate_audio: true}`. Inference ~75s. Start frame must be 720p+, 16:9 or 9:16, ≤8 MB.

**Slug gotcha**: Status returning `COMPLETED` instantly + result `{"detail":"Path /xxx not found"}` = wrong slug. fal namespaces are inconsistent (`fal-ai/veo3.1/...` ✓ but `bytedance/seedance-2.0/...` has no `fal-ai/` prefix). WebFetch the model's `/api` page to confirm.

**Payload discipline**: No `jq` on Windows. Build JSON with `python -c 'import json; print(json.dumps({...}))'`. Verify payload string is non-empty before curl — empty `-d ""` silently submits with defaults (cost wasted, no error).

**Prompt structure**: 5 components, 150–300 chars total. (1) subject+position, (2) micro-action before the line, (3) verbatim quote in `"..."` with speech verb, (4) ambient + SFX naming the source, (5) photoreal style guard. Cardinal rule: the start frame already locks identity — do NOT re-describe face/clothing.

See `C:\Users\paqui\Downloads\fal-video-skill.md` for the full hand-off doc with worked examples and failure mode tables.

## Workflow Per Issue

1. Create project folder: `nano2/[project-name]/` with `refs/` and `pages/` subfolders
2. Generate character reference sheets with `generate_image` → save to `refs/`
3. Generate story pages sequentially with `compose_images` (upload character refs as input images) → save to `pages/`
4. Generate cover with `compose_images`
5. Create `reader.html` (dark theme, vertical scroll, click-to-zoom, keyboard nav)
6. Optionally update a root landing page

## Critical Rules

### Character References First
- ALWAYS create character reference sheets BEFORE generating any story pages
- Reference sheet prompt: "Character reference sheet of [NAME]. Full body front view and side view. [Detailed appearance]. Bold ink outlines, comic book coloring, clean white background, character turnaround sheet style."
- Save as `refs/[character-name]-ref.jpg`

### compose_images for Pages
- Use `compose_images` (NOT `generate_image`) for all pages featuring characters
- Upload ALL character refs for characters present in the scene
- Include "Use the character designs from the reference images exactly" in every page prompt
- Minimum 2 images required by compose_images — if only 1 character, include a second ref

### Panel & Prompt Limits
- **2 panels per page maximum** — more complex layouts frequently fail (timeout or no image)
- **2000-character hard limit** on all prompts — write lean, every word must earn its place
- **2 reference images per compose call** to avoid timeouts (3+ increases risk significantly)
- Keep dialogue under 10-12 words per bubble to avoid garbled text
- For silent panels: explicitly write "NO speech bubble. NO text. Silent panel."

### Aspect Ratios
- Story pages & covers: Vertical 2:3
- Character reference sheets: Horizontal 3:2

### When Generations Fail
- Timeout → simplify prompt (shorter descriptions, fewer details per panel), retry
- "No image data returned" → simplify further, reduce to core action + dialogue only
- Garbled text → shorten dialogue or mark as silent panel
- File saves as `name_1.jpg` → rename over the original

## Prompt Patterns

### Reference Sheet
```
Character reference sheet of [NAME], [role]. Full body front view and side view.
[Build, skin, hair, eyes, costume, accessories, distinguishing features].
Bold ink outlines, comic book coloring, clean white background,
character turnaround sheet style.
```

### Story Page
```
Graphic novel PAGE [N] of "[Title]" with 2 panels.
Use the character designs from the reference images exactly.

Panel 1: [Shot type]. [Scene description]. [Character actions].
Speech bubble [Character]: "[dialogue]"

Panel 2: [Shot type]. [Scene description]. [Character actions].
Speech bubble [Character]: "[dialogue]"

[Art style line]. [Color palette]. Page number '[N]' at bottom.
Aspect Ratio: Vertical 2:3
```

### Cover
```
Comic book COVER for "[Title] - Issue #N".
[Composition with character poses, background].
Title "[TITLE]" in [style] font. "Issue #N" badge.
"[tagline]" tagline. Professional comic book cover style.
Aspect Ratio: Vertical 2:3
```

## Style Locking

Use positive anchoring, not negative constraints.

DO: `Art Style: Bold cartoon ink lines with bright saturated colors`
DON'T: `NOT cartoon, NOT anime, NOT watercolor...`

Include a 3-line style block in every prompt:
```
Art Style: [6-10 word technique description]
Color palette: [color 1], [color 2], [color 3], [color 4], [color 5]
Effects: [lighting, weather, atmosphere]
```

## Windows / MCP Notes

- The `validateFilePath` function in `gemini-nanobanana-mcp` is patched to allow absolute Windows paths
- Patched file: `C:\Users\paqui\AppData\Local\npm-cache\_npx\f384cd18864de729\node_modules\gemini-nanobanana-mcp\build\index.js`
- If npm cache clears, the patch must be re-applied (change `validateFilePath` to just `return !path.includes('..')`)
- `.mcp.json` uses `"command": "node"` pointing directly at patched file to prevent npx from overwriting it

## Audience

Content primarily for Francisco (9) and Sebastian (7). Visual style should match story tone — can range from fun cartoon to serious cinematic. These kids are smart and respond to intellectually rigorous, visually sophisticated content. Always have a philosophical undercurrent — never preachy, embedded in narrative and visual choices.

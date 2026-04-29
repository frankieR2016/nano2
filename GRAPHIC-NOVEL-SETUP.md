# Graphic Novel Production with Claude Code + Gemini MCP

Complete guide to set up AI-powered graphic novel production on a new Claude Code instance. Covers MCP server configuration, image generation workflow, and the battle-tested production process used to create 21+ issues of "Einstein & Spider-Strike."

---

## Part 1: MCP Server Setup (Gemini Image Generation)

### What You Get

The `gemini-nanobanana-mcp` package exposes 4 image generation tools to Claude Code:

| Tool | Purpose | When to Use |
|---|---|---|
| `generate_image` | Text-to-image from scratch | Character reference sheets, standalone scenes |
| `compose_images` | Combine 2-10 input images with a prompt | Story pages (pass character refs for consistency) |
| `edit_image` | Modify an existing image | Fix specific elements in a generated image |
| `style_transfer` | Apply one image's style to another | Consistent art style across different scenes |

### Prerequisites

- **Node.js >= 18** (`node --version` to check)
- **Gemini API key** — free at https://aistudio.google.com/apikey

### Step 1: Get a Gemini API Key

1. Go to https://aistudio.google.com/apikey
2. Sign in with Google
3. Click **Create API key**
4. Copy it (starts with `AIzaSy...`)

### Step 2: Create `.mcp.json` in Your Project Root

```json
{
  "mcpServers": {
    "gemini-nanobanana-mcp": {
      "command": "npx",
      "args": ["gemini-nanobanana-mcp@latest"],
      "env": {
        "GEMINI_API_KEY": "YOUR_API_KEY_HERE",
        "GEMINI_IMAGE_ENDPOINT": "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent",
        "DEFAULT_SAVE_DIR": "/absolute/path/to/your/project/images",
        "AUTO_SAVE": "true"
      }
    }
  }
}
```

> **IMPORTANT**: The `GEMINI_IMAGE_ENDPOINT` is required. The npm package hardcodes a deprecated model by default. Without this override, every generation will 404.

### Step 3: Model Selection

| Model | Endpoint ID | Use For |
|---|---|---|
| **Gemini 3 Pro Image Preview** | `gemini-3-pro-image-preview` | Best text rendering, graphic novels, multi-panel pages |
| **Gemini 2.5 Flash Image** (GA) | `gemini-2.5-flash-image` | Quick generations, simpler images |

For graphic novels, always use `gemini-3-pro-image-preview` — dramatically better speech bubble text and character consistency.

### Step 4: Windows-Specific Fix (REQUIRED on Windows)

On Windows, the MCP server rejects all absolute file paths. You must patch `validateFilePath`.

1. Run `npx gemini-nanobanana-mcp@latest` once to cache the package
2. Find the cached file:
   ```
   C:\Users\<you>\AppData\Local\npm-cache\_npx\<hash>\node_modules\gemini-nanobanana-mcp\build\index.js
   ```
3. Find the `validateFilePath` function and replace it:
   ```javascript
   // BEFORE (broken on Windows):
   function validateFilePath(path) {
       const normalizedPath = resolve(path);
       const basePath = resolve('.');
       return normalizedPath.startsWith(basePath) && !path.includes('..') && !path.includes('~');
   }

   // AFTER (fixed):
   function validateFilePath(path) {
       return !path.includes('..');
   }
   ```
4. Update `.mcp.json` to point directly at the patched file (prevents npx from overwriting it):
   ```json
   {
     "mcpServers": {
       "gemini-nanobanana-mcp": {
         "command": "node",
         "args": ["C:\\Users\\<you>\\AppData\\Local\\npm-cache\\_npx\\<hash>\\node_modules\\gemini-nanobanana-mcp\\build\\index.js"],
         "env": {
           "GEMINI_API_KEY": "YOUR_API_KEY_HERE",
           "GEMINI_IMAGE_ENDPOINT": "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent",
           "DEFAULT_SAVE_DIR": "C:\\Users\\<you>\\path\\to\\project\\images",
           "AUTO_SAVE": "true"
         }
       }
     }
   }
   ```

### Step 5: Verify

Restart Claude Code, then ask it to generate a test image. You should see 4 tools available: `generate_image`, `edit_image`, `compose_images`, `style_transfer`.

### Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `GEMINI_IMAGE_ENDPOINT` | Yes* | Full endpoint URL (override the broken default) |
| `DEFAULT_SAVE_DIR` | No | Absolute path for image output (default: `~/Downloads/gemini-images`) |
| `AUTO_SAVE` | No | `"true"` to auto-save (default: `"true"`) |

---

## Part 2: Graphic Novel Production Workflow

This is the proven workflow used to produce 21 issues, each with 6 story pages + cover. Every step matters — skipping any step degrades quality.

### Overview: Issue Production Pipeline

```
1. Create issue folder
2. Copy ALL hero reference sheets into folder
3. Generate NEW villain/character reference sheet (generate_image)
4. Generate 6 story pages (compose_images with 2 refs each)
5. Generate cover (compose_images)
6. Create HTML reader page
7. Update root index.html landing page
8. Commit and push to GitHub
```

### Step 1: Character Reference Sheets (THE #1 RULE)

**Before generating ANY story pages, create reference sheets for EVERY character.**

Use `generate_image` (NOT compose) for references:

```
Prompt pattern:
"Character reference sheet of [CHARACTER NAME], [role description]. Full body front view
and side view. [Detailed appearance: build, skin, hair, eyes, costume, accessories,
distinguishing features]. Bold ink outlines, comic book coloring, clean white background,
character turnaround sheet style."
```

Example:
```
"Character reference sheet of TITAN, a superhero who can grow to giant size. Full body
front view and side view. Massive muscular man, 6'5" tall. Brown skin, strong jaw, kind
eyes. Wears dark navy blue and silver armored suit with glowing orange energy lines along
arms and chest. Heavy boots and reinforced gauntlets. Short black hair with silver streaks
at temples. Bold ink outlines, comic book coloring, clean white background, character
turnaround sheet style."
```

Save refs in the issue folder: `graphic_novel_pN/ref_charactername.png`

### Step 2: Folder Structure Per Issue

Each issue gets its own folder with ALL character refs copied in:

```
graphic_novel_pN/
├── ref_hero1.png          # Copied from previous issue
├── ref_hero2.png          # Copied from previous issue
├── ref_villain.png        # NEW - generated for this issue
├── cover.png              # Generated last
├── pN_page1.png           # Story pages
├── pN_page2.png
├── pN_page3.png
├── pN_page4.png
├── pN_page5.png
├── pN_page6.png
└── index.html             # HTML reader
```

Why copy refs into each folder? So `compose_images` can access them via relative paths, and each issue is self-contained.

### Step 3: Generating Story Pages

Use `compose_images` (NOT `generate_image`) for all story pages. Pass 2 character reference images as inputs.

```
Prompt pattern:
"Graphic novel PAGE [N] with 2 panels. Use the character designs from the reference
images exactly.
Panel 1: [Scene description. Character actions. Dialogue.]
Speech bubble [Character]: '[dialogue text]'
Panel 2: [Scene description. Character actions. Dialogue.]
Speech bubble [Character]: '[dialogue text]'
Bold graphic novel art style, dramatic lighting, vibrant comic book colors, page number
'[N]' at bottom."
```

#### Critical Rules for Pages:

1. **2 panels per page maximum.** 6-panel layouts are too complex and frequently fail (timeout or no image returned).
2. **Use only 2 reference images per compose call.** More than 3 refs increases timeout risk significantly.
3. **Keep prompts concise.** 2-3 sentences per panel. Cut atmospheric adjectives first if hitting the 2000-char limit.
4. **Include dialogue in quotes.** Gemini renders readable speech bubble text when you write `Speech bubble Character: "text"`.
5. **Include page numbers.** Add `page number 'N' at bottom` and they render correctly.

#### When Generations Fail:

| Problem | Solution |
|---|---|
| Timeout (60s) | Simplify prompt — shorter descriptions, fewer details per panel |
| "No image data returned" | Simplify prompt further, reduce to core action + dialogue only |
| Garbled text in bubbles | Keep dialogue under 10-12 words per bubble |
| File saves as `name_1.png` | compose_images appended `_1` instead of overwriting — `mv name_1.png name.png` |

### Step 4: Generating the Cover

Generate AFTER all story pages (so you know the visual style).

Use `compose_images` with 2 character refs:
```
"Comic book COVER for '[Series Title]: [Issue Title] - Issue #N'. [Composition description
with character poses, villain, background]. Title '[ISSUE TITLE]' in [style] font.
'Issue #N' badge. '[tagline]' tagline. Professional comic book cover style."
```

### Step 5: HTML Reader

Each issue gets a self-contained HTML reader with:
- Dark theme matching the issue's color
- Thumbnail strip
- Page navigation (prev/next buttons + dot indicators)
- Keyboard navigation (ArrowLeft/Right, Escape for fullscreen)
- Click-to-fullscreen overlay

Pages are defined in a JS array — easy to update:
```javascript
const pages = [
  { src: 'cover.png', label: 'Cover' },
  { src: 'pN_page1.png', label: 'Page 1 — Title' },
  // ...
];
```

Each issue should have a unique color theme for its reader UI (backgrounds, borders, active dot colors, button hover colors).

### Step 6: Root Landing Page

A root `index.html` with CSS grid showing all issues as cards. Each issue card has:
- Cover image
- Issue badge (colored)
- Title
- Subtitle
- "6 Pages" meta

Each issue gets 3 CSS blocks in the root index: `.card.issueN:hover`, `.card.issueN .card-body h2`, `.card.issueN .badge` — each using the issue's unique color.

### Step 7: Git & Deploy

After each issue:
```bash
git add graphic_novel_pN/ index.html
git commit -m "Add Issue #N: Title (6 pages + cover)"
git push origin master
# Trigger GitHub Pages rebuild:
gh api repos/OWNER/REPO/pages/builds -X POST
```

GitHub Pages may cache aggressively — tell users to Ctrl+Shift+R (hard refresh).

---

## Part 3: Production Tips (Hard-Won Lessons)

### Image Generation

1. **compose_images is the workhorse.** Use it for ALL story pages. generate_image is only for reference sheets and standalone art.
2. **2 refs + simple prompt = reliable.** 3+ refs or complex prompts = frequent timeouts.
3. **Retry with simpler prompt on failure.** Don't debug — just simplify and retry. Cut adjectives, shorten dialogue, reduce scene complexity.
4. **Copyright filter exists.** "Spider-Man" gets blocked. Use alternative names for refs ("Spider-Strike"), but compose_images can still produce the look from a reference sheet.
5. **Images are 500KB-1.1MB JPEGs** on average.
6. **The 2000-character prompt limit is hard.** Write lean. Every word must earn its place.

### Character Consistency

1. **Reference sheets are everything.** The quality of your refs directly determines consistency across pages.
2. **Copy refs into every issue folder.** Don't reference across folders.
3. **Generate refs with generate_image, pages with compose_images.** Never generate refs with compose (no input images needed) and never generate pages without refs.
4. **When a new character appears, STOP and make their ref first.** Never generate a page featuring a character that doesn't have a reference sheet yet.

### Story Structure

1. **6 pages per issue** is the sweet spot — enough for a complete arc, manageable to generate.
2. **2 panels per page** = 12 panels per issue = enough for setup, conflict, climax, resolution.
3. **End issues with hooks.** Tease the next threat, show a villain smiling in the shadows, leave a cliffhanger.
4. **Plan multi-issue arcs.** E.g., Issues #17-20 form a connected prison breakout arc with escalating tension.

### Common Color Themes Used (for reference)

```
Issue #1:  #f0a030 (warm gold)       Issue #12: #38bdf8 (ice blue)
Issue #2:  #a855f7 (purple)          Issue #13: #dc2626 (crimson)
Issue #3:  #ef4444 (red)             Issue #14: #4ade80 (ghostly green)
Issue #4:  #22d3ee (cyan)            Issue #15: #f59e0b (amber)
Issue #5:  #22c55e (green)           Issue #16: #0ea5e9 (ocean blue)
Issue #6:  #fbbf24 (golden)          Issue #17: #eab308 (electric yellow)
Issue #7:  #f97316 (orange)          Issue #18: #64748b (steel gray)
Issue #8:  #6366f1 (indigo)          Issue #19: #e11d48 (crimson rose)
Issue #9:  #14b8a6 (teal)            Issue #20: #f97316 (fiery orange)
Issue #10: #8b5cf6 (violet)          Issue #21: #2dd4bf (teal crystal)
Issue #11: #b45309 (burgundy/gold)
```

---

## Part 4: CLAUDE.md Template

Put this in your project's `CLAUDE.md` so Claude Code knows the workflow:

```markdown
# Graphic Novel Project

## Gemini MCP Tools Available
- `generate_image` — Text-to-image. Use for character reference sheets.
- `compose_images` — Combine 2-10 input images with a prompt. Use for ALL story pages.
- `edit_image` — Modify an existing image.
- `style_transfer` — Apply style from one image to another.

## Workflow Per Issue
1. Create `graphic_novel_pN/` folder
2. Copy ALL hero reference sheets into the folder
3. Generate new villain/character ref with `generate_image`
4. Generate 6 pages with `compose_images` (2 panels per page, 2 refs per call)
5. Generate cover with `compose_images`
6. Create `index.html` reader (dark theme, unique color per issue)
7. Update root `index.html` with new issue card
8. `git add`, `commit`, `push`

## Critical Rules
- ALWAYS create character reference sheets BEFORE generating pages
- Use `compose_images` (not `generate_image`) for story pages
- 2 panels per page maximum — 6-panel layouts fail
- Use only 2 reference images per compose call to avoid timeouts
- Keep prompts concise (under 2000 chars)
- If generation fails/times out, simplify the prompt and retry
- Each issue folder must contain its own copies of ALL character refs

## Prompt Patterns
Reference sheet: "Character reference sheet of [NAME]. Full body front view and side view. [Details]. Bold ink outlines, comic book coloring, clean white background, character turnaround sheet style."

Story page: "Graphic novel PAGE [N] with 2 panels. Use the character designs from the reference images exactly. Panel 1: [scene]. Speech bubble [char]: '[text]'. Panel 2: [scene]. Speech bubble [char]: '[text]'. Bold graphic novel art style, dramatic lighting, vibrant comic book colors, page number '[N]' at bottom."

Cover: "Comic book COVER for '[Title] - Issue #N'. [Composition]. Title '[NAME]' in [style] font. 'Issue #N' badge. Professional comic book cover style."
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| 404 error on generation | Default model deprecated | Set `GEMINI_IMAGE_ENDPOINT` in `.mcp.json` |
| File path rejected (Windows) | `validateFilePath` blocks absolute paths | Patch the function (see Windows fix above) |
| compose_images timeout | Too many refs or complex prompt | Use 2 refs, simplify prompt, retry |
| "No image data returned" | Prompt too complex | Simplify significantly, reduce to core elements |
| Garbled text in speech bubbles | Too many words per bubble | Keep dialogue under 10-12 words |
| Cover saves as `cover_1.png` | Didn't overwrite existing file | `mv cover_1.png cover.png` |
| GitHub Pages shows old version | CDN cache | `gh api repos/OWNER/REPO/pages/builds -X POST` + Ctrl+Shift+R |
| Tools don't appear | Config not loaded | Restart Claude Code session |
| npx overwrites Windows patch | Fresh download each time | Point `args` directly at patched `index.js` file |

# Multi-part tutorial dialogue

This is presentation infrastructure only; no production story step uses it yet.

```js
{
  id: 'example_conversation', screenId: 'home', scene: 'grassland',
  speaker: 'Speaker A', portrait: 'images/example.webp',
  dialogue: [
    {text: 'First speech.\nAn intentional line break.'},
    {speaker: 'Speaker A・Speaker B', portrait: null, text: 'A shared response.'},
    {speaker: '{{playerName}}', scene: 'workshop', text: 'A question.'}
  ],
  choices: [{id: 'yes', label: 'Yes'}, {id: 'agree', label: 'Agreed'}],
  nextStepId: 'example_next'
}
```

- `dialogue` is a non-empty array of authored speeches. Split long dialogue at meaningful boundaries; the engine never shortens, rewrites, or automatically breaks a name placeholder. Explicit newlines and long unbroken strings wrap/scroll inside the existing mobile bubble.
- Only `text`, `speaker`, `portrait`, and `scene` are allowed in a speech. Omitted visual fields inherit from the preceding speech (initially the parent). Explicit `null` clears a visual. Change or clear the portrait when changing its speaker.
- Multiple speakers can share a name label, such as `Speaker A・Speaker B`. The current renderer has one portrait layer; use `portrait: null` when a single portrait would misrepresent a shared line. Multiple simultaneous portrait artwork is not provided by this phase.
- Choices are optional, contain 2–4 unique IDs and non-empty labels, and appear on the final speech. They all converge to the parent step's normal continuation. Per-choice `nextStepId` is rejected, not silently interpreted as branching.
- Plain Next, the right-arrow key and external-action completion cannot bypass a choice. Conversation skip stops at a choice. Existing whole-tutorial skip retains its separate confirmation and reward handling.
- Contracts, transitions, real-screen targets, inputs and event waits belong in separate steps. Mixing them into a dialogue block is rejected to keep page turning separate from gameplay effects.
- Page turning and Back use a short 250 ms double-tap guard. Detached choice buttons are invalidated on rerender, pause and restart.
- The cursor and choices are transient, not save fields. Resume replays the parent checkpoint from its first speech. When authoring, keep `persistAs` at a safe parent checkpoint; do not reuse an old checkpoint with different side effects or move it past unread dialogue without compatibility review.
- Chapter boundaries and linked-step progression happen only after the final speech/choice. Existing single-text steps remain supported.
- Text and names are rendered with `textContent`, never interpreted as HTML.

## Validation

`npm run check:prologue-tutorial-engine` runs the legacy engine tests and the dynamic multi-part-dialogue tests. It is also included in `npm run check`.

Optional browser check: `node scripts/check-tutorial-dialogue-browser.cjs`. It requires Playwright and Chromium in the development environment, starts the local preview server, and uses isolated browser contexts with synthetic dialogue at 320×568, 360×640, 390×844, 844×390 and 1366×768. It exercises title entry, long-text scrolling, Back, shared speaker labels, keyboard choices, literal names and legacy action gating. It does not export or embed the private story draft. Set `PLAYWRIGHT_EXECUTABLE_PATH` for an existing browser, `CODEX_PRIMARY_RUNTIME_NODE_MODULES` for runtime-owned dependencies, and optionally `TUTORIAL_SCREENSHOT` for a local screenshot. Install a Japanese-capable system font before assessing Japanese typography.

Check actual narrow and landscape browser layouts when adding story content. Geometry/unit checks do not replace Android/Chromebook verification. This unused infrastructure does not require a player-facing notice; the story integration must provide one before publication.

An optional step-level `previousStepId` overrides Back at the first page when the forward route bypasses retained legacy entries. Intra-conversation Back remains page-based; an unresolved previous ID leaves the step unchanged. This is flow configuration, not a save field.

# SP Decomposition Tree Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor monolithic `decomposition_tree.html` into separate files with Manuscript theme (dark/light), canvas pan/zoom, draggable nodes, collapsible sidebar, and node inspector.

**Architecture:** 6 files — HTML shell, CSS with theme variables, 4 JS files sharing a global `SP` namespace. No bundler, no ES modules (must work via `file://`). All existing functionality preserved.

**Tech Stack:** Vanilla HTML/CSS/JS, Google Fonts (Cormorant Garamond, Outfit, Fira Code), SVG for tree rendering.

**Spec:** `docs/superpowers/specs/2026-03-17-decomposition-tree-redesign.md`

---

## Chunk 1: Foundation (HTML + CSS + Parser + Layout)

### Task 1: Create directory structure and main.html

**Files:**
- Create: `css/` directory
- Create: `js/` directory
- Create: `main.html`

- [ ] **Step 1: Create directories**

```bash
mkdir -p css js
```

- [ ] **Step 2: Create main.html**

Create `main.html` with the full HTML structure. This is the shell that loads all external CSS and JS files. Key elements: header with theme toggle, sidebar with 4 sections (expression input, animation, inspector, legend), canvas with empty state + SVG + floating controls, sidebar toggle button.

All element IDs must match what the JS files expect:
- `exprInput`, `parseBtn`, `exampleSelect`, `errorArea`, `successArea`
- `btnReset`, `btnBack`, `btnPlay`, `btnForward`, `btnEnd`, `speedSlider`, `stepInfo`
- `sidebar`, `sidebarToggle`, `themeToggle`
- `canvasArea`, `emptyState`, `treeSvg`, `viewport`
- `inspector`, `inspectorSection`
- `btnZoomIn`, `btnZoomOut`, `btnFitView`, `btnResetLayout`, `zoomLevel`

SVG structure: `<svg id="treeSvg"><g id="viewport"><g class="edges-layer"></g><g class="nodes-layer"></g></g></svg>`

Canvas controls float bottom-right: Fit View, Reset Layout, +, -, zoom percentage.

Script load order: `parser.js`, `layout.js`, `renderer.js`, `canvas.js` (each as `<script src="js/...">`).

- [ ] **Step 3: Verify HTML loads without errors**

Open `main.html` in browser. Should show the header, empty sidebar, and empty canvas. Console should show 404s for JS/CSS files (expected — they don't exist yet).

---

### Task 2: Create css/styles.css

**Files:**
- Create: `css/styles.css`

- [ ] **Step 1: Write complete stylesheet**

Must include:
1. **CSS reset** — `*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }`
2. **Light theme variables** on `[data-theme="light"]` (default) — all tokens from spec
3. **Dark theme variables** on `[data-theme="dark"]` — all tokens from spec
4. **Computed variables** that both themes share: `--series-bg`, `--parallel-bg`, `--edge-bg` (derived from series/parallel/edge with alpha), `--accent-hover`, `--edge-stroke`, `--shadow`
5. **Google Fonts import** — Cormorant Garamond (400,600), Outfit (400,500,600,700), Fira Code (400,500)
6. **Font variables** — `--font-display`, `--font-body`, `--font-mono`
7. **Theme transition** — `html { transition: background-color 0.3s ease; }` and on body, sidebar, header, canvas
8. **Header** — flex row, title uses `--font-display`, theme toggle button styled as icon button
9. **App layout** — flex row, `flex:1`, `overflow:hidden`
10. **Sidebar** — `width:340px`, `transition: width 0.3s ease`, `position:relative`. `.sidebar.collapsed { width:0; }`. `.sidebar.collapsed .sidebar-inner { opacity:0; pointer-events:none; }`
11. **Sidebar toggle** — positioned `right:-20px` absolutely on sidebar, always visible, chevron icon rotates when collapsed
12. **Sidebar sections** — padding, border-bottom between sections
13. **Form elements** — textarea, buttons, select, range input — all using theme variables
14. **Error/success messages** — same pattern as original, using `.visible` class
15. **Animation controls** — flex row of `ctrl-btn` buttons, speed slider, step info
16. **Node inspector** — `.inspector-empty` for placeholder, `.inspector-content` with labeled rows, `.inspector-expr` code block
17. **Legend** — flex row with colored dots (circles for all, pill-shaped for S/P distinction)
18. **Canvas** — `flex:1`, background uses `--bg-tertiary` with dot grid using `--canvas-dot` variable, `position:relative`, `overflow:hidden`, `cursor:grab` (changes to `grabbing` when panning)
19. **Canvas controls** — `position:absolute; bottom:16px; right:16px;`, glass-morphism style background, small buttons
20. **Empty state** — centered in canvas, faded illustration
21. **SVG styles** — tree edges (stroke, opacity transition), node groups (opacity/scale transition with `.visible`), node shapes (fill+stroke by type, selected glow), labels, sublabels
22. **Node interaction** — `.node-group { cursor:pointer; }`, `.node-group:hover .node-shape { filter: brightness(1.2); }`, `.node-group.selected .node-shape { stroke-width:2.5; filter: drop-shadow(0 0 8px var(--accent)); }`
23. **Scrollbar** — themed scrollbar styles

- [ ] **Step 2: Verify styling**

Open `main.html`. Should render with Manuscript light theme, proper fonts loading, sidebar and canvas visible.

---

### Task 3: Create js/parser.js

**Files:**
- Create: `js/parser.js`

- [ ] **Step 1: Write parser.js**

Two functions on the `SP` namespace:

`SP.parse(input)` — Recursive descent parser. Strips whitespace, parses `SC(left,right)` → `{type:'S', left, right}`, `PC(left,right)` → `{type:'P', left, right}`, `e(num,num)` → `{type:'e', source:num, sink:num}`. Throws Error with position info on invalid input. This is the same logic as the original `parse()` function but uses `source`/`sink` property names instead of `src`/`sink` for consistency with the spec.

`SP.nodeToExpression(node)` — Reconstructs the expression string from a tree node. Returns `"e(source,sink)"` for edges, `"SC(left,right)"` for series, `"PC(left,right)"` for parallel. Used by the inspector to show sub-expressions.

- [ ] **Step 2: Verify in console**

Open browser console, run: `SP.parse("SC(e(0,1),e(1,2))")` — should return tree object. Run `SP.nodeToExpression(SP.parse("SC(e(0,1),e(1,2))"))` — should return `"SC(e(0,1),e(1,2))"`.

---

### Task 4: Create js/layout.js

**Files:**
- Create: `js/layout.js`

- [ ] **Step 1: Write layout.js**

Constants: `SP.H_SPACING = 70`, `SP.V_SPACING = 80`, `SP.SP_W = 48`, `SP.SP_H = 32`, `SP.SP_RX = 12`, `SP.LEAF_R = 18`.

`SP.layout(root)` — Takes parsed tree, returns array of positioned nodes in post-order (leaves first, root last). Each node gets:
- `id` — sequential integer
- `depth` — tree depth (root=0)
- `parent` — reference to parent node (null for root)
- `x`, `y` — computed layout position (x = leafIndex * H_SPACING for leaves, midpoint for internal; y = depth * V_SPACING)
- `dx`, `dy` — drag offset, initialized to 0
- `source`, `sink` — for edge nodes these are already set; for internal nodes, series: source=left.source, sink=right.sink; parallel: source=left.source, sink=left.sink

The function mutates the tree nodes in-place (adding properties) and returns them collected in post-order. Same algorithm as the original `layoutTree()`.

- [ ] **Step 2: Verify in console**

Run `SP.layout(SP.parse("SC(e(0,1),e(1,2))"))` — should return 3 nodes with positions, IDs, depths.

---

## Chunk 2: Rendering + Interactivity

### Task 5: Create js/renderer.js

**Files:**
- Create: `js/renderer.js`

- [ ] **Step 1: Write renderer.js**

`SP.Renderer` object with:

**State:**
- `svgEl` — reference to `#treeSvg`
- `viewportEl` — reference to `#viewport`
- `edgesLayer` / `nodesLayer` — references to the layer groups
- `nodes` — current node array
- `edges` — array of `{element, parent, child}` objects for edge path updates
- `nodeElements` — Map of nodeId → SVG group element
- `selectedId` — currently selected node id (or null)

**Methods:**

`init(svgEl, viewportEl)` — store references, get layer groups.

`render(nodes)` — Clear existing content from both layers. Store nodes. For each internal node, create edge paths (cubic bezier) in edges-layer with `data-parent-id` and `data-child-id`. For each node, create a `<g class="node-group">` in nodes-layer containing the shape (rect for S/P, circle for e), label text, sublabel text showing `(source,sink)` for all node types. Store in `nodeElements` map. All nodes start hidden (no `.visible` class). Wire mousedown on each node group for drag/click detection.

`computeEdgePath(parent, child)` — Given two node objects, compute cubic bezier `d` attribute. Use actual position (x+dx, y+dy). Parent exit point: bottom center of shape. Child entry point: top center of shape. Mid control point for smooth curve.

`updateEdgesForNode(nodeId)` — Find all edges where parent or child matches nodeId, recalculate their `d` attributes. Called during node dragging.

`highlightNode(id)` — Remove `.selected` from previous, add to new. Update inspector via `SP.Inspector.show(node)`.

`clearHighlight()` — Remove `.selected` from all nodes, clear inspector.

`setVisibility(step, nodes)` — Show/hide nodes and edges based on animation step. Same logic as original `updateVisibility()`.

`resetPositions()` — Set `dx=0, dy=0` on all nodes, update all node group transforms and edge paths.

`getNodeById(id)` — Return node object by id.

**`SP.Inspector` object:**

`show(node)` — Update the `#inspector` element content: type indicator (colored dot + name), source→sink, depth, sub-expression (via `SP.nodeToExpression`), and children info for internal nodes.

`clear()` — Reset inspector to empty state ("Click a node to inspect").

- [ ] **Step 2: Verify rendering**

Type an expression and click Visualize (requires canvas.js wiring — verify after Task 6).

---

### Task 6: Create js/canvas.js

**Files:**
- Create: `js/canvas.js`

- [ ] **Step 1: Write canvas.js**

This file contains pan/zoom, node dragging, theme toggle, sidebar collapse, animation controls, and app initialization. All wired together.

**`SP.Canvas` — Pan/Zoom:**
- State: `tx`, `ty` (translate), `scale` (zoom level), `isPanning`, `panStart`
- `init(svgEl, viewportEl)` — attach wheel event for zoom, mousedown/mousemove/mouseup on canvas for panning
- Wheel handler: calculate zoom delta, adjust scale (clamp 0.1–3.0), zoom toward cursor position by adjusting tx/ty, apply transform, update zoom indicator
- Pan: on mousedown (if not on a node), start pan. Mousemove updates tx/ty. Mouseup ends pan. Set cursor to `grabbing` during pan.
- `applyTransform()` — set `viewport.setAttribute('transform', \`translate(${tx},${ty}) scale(${scale})\`)`
- `fitToView()` — calculate bounding box of all nodes, compute scale and translate to center tree in canvas with 80px padding. Max scale 1.5.
- `zoomIn()` / `zoomOut()` — step by 0.2×, centered on canvas center
- `resetZoom()` — call fitToView()

**`SP.Drag` — Node Dragging:**
- State: `dragNode`, `dragStartX/Y`, `totalDist`, `isDragging`
- On mousedown on a node-group: record start position, set `dragNode`
- On mousemove: if totalDist > 4px, set `isDragging=true`, update node's `dx`/`dy`, update node group transform, call `SP.Renderer.updateEdgesForNode(id)`
- On mouseup: if `isDragging` was false (totalDist < 4px), treat as click → `SP.Renderer.highlightNode(id)`. Reset drag state.
- Must account for current viewport transform (scale, translate) when converting mouse coords to SVG coords.

**`SP.Theme` — Theme Toggle:**
- `init()` — read `localStorage.getItem('sp-theme')`, apply or default to `'light'`. Attach click handler to `#themeToggle`.
- `toggle()` — flip `data-theme` on `<html>`, save to localStorage, update toggle button icon (sun↔moon SVG).

**`SP.Sidebar` — Collapsible Sidebar:**
- `init()` — attach click handler to `#sidebarToggle`
- `toggle()` — toggle `.collapsed` class on `#sidebar`, rotate chevron icon

**`SP.Controls` — Animation:**
- State: `currentStep`, `totalSteps`, `playInterval`, `treeNodes`
- `init()` — attach all button click handlers, speed slider handler, parse button, example select, textarea enter key
- `doParse()` — get input, call `SP.parse()`, `SP.layout()`, `SP.Renderer.render()`, `SP.Canvas.fitToView()`, init animation state, enable buttons
- `stopPlay()`, `play()`, `stepForward()`, `stepBack()`, `reset()`, `skipToEnd()` — same logic as original
- `updateVisibility()` — call `SP.Renderer.setVisibility(currentStep, treeNodes)`, update step info text, update button disabled states

**`SP.App` — Initialization:**
- `init()` — called on DOMContentLoaded. Initialize all subsystems in order: Theme, Sidebar, Renderer, Canvas, Controls.

- [ ] **Step 2: Wire DOMContentLoaded**

At bottom of canvas.js: `document.addEventListener('DOMContentLoaded', function() { SP.App.init(); });`

---

### Task 7: End-to-end verification

- [ ] **Step 1: Open main.html in browser**

Verify: page loads, Manuscript light theme, sidebar visible, empty state shown.

- [ ] **Step 2: Test theme toggle**

Click theme toggle. Verify smooth transition to dark theme. Click again → light. Refresh page → persisted.

- [ ] **Step 3: Test expression parsing**

Paste `SC(PC(SC(e(2,3),e(3,4)),e(2,4)),SC(e(0,2),e(2,5)))` into textarea, click Visualize. Tree should render.

- [ ] **Step 4: Test examples dropdown**

Select each example, verify tree renders correctly.

- [ ] **Step 5: Test animation**

Click play, verify nodes appear in post-order. Test step forward/back, reset, skip-to-end. Adjust speed.

- [ ] **Step 6: Test pan/zoom**

Scroll wheel to zoom. Click and drag empty canvas to pan. Click "Fit" to reset. Test +/- buttons. Verify zoom percentage updates.

- [ ] **Step 7: Test node dragging**

Click and drag a node. Edges should follow. Drag multiple nodes. Click "Reset Layout" to snap back.

- [ ] **Step 8: Test node inspector**

Click a node (without dragging). Sidebar inspector should show type, source/sink, depth, expression. Click different node → updates. Click empty canvas → clears.

- [ ] **Step 9: Test sidebar collapse**

Click sidebar toggle. Sidebar should slide closed, canvas expands. Toggle button stays visible. Click again → reopens.

- [ ] **Step 10: Test error handling**

Enter invalid expression like `SC(broken`. Should show error message. Enter empty → error.

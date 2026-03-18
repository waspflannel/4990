# SP Decomposition Tree Visualizer — Redesign Spec

## Goal

Refactor the monolithic `decomposition_tree.html` into separate files with upgraded UX: dark/light theming, canvas pan/zoom, draggable nodes, collapsible sidebar, and a node inspector.

## File Structure

```
main.html            — HTML shell, loads external CSS and JS
css/styles.css       — All styles with CSS custom properties for theming
js/parser.js         — SP expression parser (SC/PC/e)
js/layout.js         — Binary tree layout computation
js/renderer.js       — SVG rendering, node creation, edge paths, inspector updates
js/canvas.js         — Pan/zoom/drag, sidebar toggle, theme switch, animation controls
```

All files load locally via `<link>` and `<script>` tags — no bundler, no ES modules (avoids `file://` CORS issues). Scripts share a global `SP` namespace.

## Aesthetic: "Manuscript"

### Light Theme (default)
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#faf8f5` | Page background |
| `--bg-secondary` | `#ffffff` | Surfaces (sidebar, cards) |
| `--bg-tertiary` | `#f0ebe4` | Canvas background, inputs |
| `--border` | `#e2ddd5` | Borders |
| `--text-primary` | `#24292f` | Body text |
| `--text-secondary` | `#57606a` | Muted text |
| `--accent` | `#c7684a` | Terracotta — primary accent, buttons |
| `--series` | `#3182ce` | Series node color |
| `--parallel` | `#c53030` | Parallel node color |
| `--edge` | `#2f855a` | Edge node color |

### Dark Theme
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#1a1e2a` | Page background |
| `--bg-secondary` | `#232838` | Surfaces |
| `--bg-tertiary` | `#1e2235` | Canvas, inputs |
| `--border` | `#2e3448` | Borders |
| `--text-primary` | `#e2e8f0` | Body text |
| `--text-secondary` | `#8b949e` | Muted text |
| `--accent` | `#d4956a` | Gold — primary accent |
| `--series` | `#63b3ed` | Series node color |
| `--parallel` | `#fc8181` | Parallel node color |
| `--edge` | `#68d391` | Edge node color |

### Typography
- **Display:** Cormorant Garamond (Google Fonts) — header title
- **Body:** Outfit (Google Fonts) — UI text, labels, buttons
- **Mono:** Fira Code (Google Fonts) — expressions, code

Theme toggles via `data-theme="light|dark"` on `<html>`. All themed properties use CSS custom properties. Transition: `background-color 0.3s, color 0.3s, border-color 0.3s`.

## HTML Structure

```
<html data-theme="light">
<header>
  Logo/title (left) | Theme toggle button (right)
</header>
<div class="app">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-inner">
      Section: Expression Input (textarea, visualize btn, examples dropdown, error/success)
      Section: Animation (reset/back/play/forward/end buttons, speed slider, step counter)
      Section: Node Inspector (updates on node click; default: "Click a node to inspect")
      Section: Legend (S/P/e with colored indicators)
    </div>
    <button class="sidebar-toggle"> (chevron, always visible)
  </aside>
  <main class="canvas">
    <div class="empty-state"> (shown when no tree)
    <svg id="treeSvg">
      <g id="viewport"> (pan/zoom transform applied here)
        <g class="edges-layer"> (bezier edge paths)
        <g class="nodes-layer"> (node groups with individual transforms)
      </g>
    </svg>
    <div class="canvas-controls"> (floating: fit, +, -, zoom %)
  </main>
</div>
```

## Interactions

### Pan and Zoom
- **Pan:** Mousedown on empty canvas → mousemove updates viewport `translate(tx, ty)`
- **Zoom:** Wheel event scales viewport around cursor position. Clamped to 0.1–3.0×
- **Fit button:** Calculates bounding box of all nodes, sets transform to center and fit with padding
- **+/- buttons:** Step zoom in/out by 0.2×
- **Zoom indicator:** Shows current zoom percentage, resets on click

### Draggable Nodes
- Mousedown on a node group → track offset, mousemove updates that node's position (`dx`, `dy` offset from layout position)
- All edges connected to the dragged node recalculate their bezier paths in real-time
- Mouseup ends drag. Node stays where placed.
- "Reset Layout" button (in canvas controls) clears all `dx`/`dy` offsets, snapping nodes back to computed positions
- Distinguish click vs drag: if mouse moves <4px total, treat as click (select for inspector); otherwise it's a drag

### Node Click → Inspector
On click (not drag), the node gets a highlight class (glow ring). The sidebar inspector section updates:
- **Type indicator:** Colored dot + "Series Composition" / "Parallel Composition" / "Edge"
- **Source / Sink:** Vertex numbers
- **Depth:** Level in the tree
- **Expression:** The sub-expression rooted at this node, rendered in a code block
- **Children** (internal nodes only): Left and right child expressions

Clicking another node or empty canvas clears the selection.

### Collapsible Sidebar
- Toggle button: chevron positioned at the right edge of the sidebar, vertically centered
- `sidebar.collapsed` class: width transitions from 340px to 0, inner content fades out
- Toggle button remains visible (positioned absolutely, overflows the sidebar boundary)
- Canvas flexes to fill available space. SVG viewport adjusts.

### Theme Toggle
- Button in header with sun (light mode) / moon (dark mode) icon
- Toggles `data-theme` attribute on `<html>`
- Saves preference to `localStorage`
- CSS transition on all themed properties (0.3s ease)

### Animation
Identical behavior to current implementation:
- Post-order node reveal (leaves first, root last)
- Play/pause with configurable speed
- Step forward/back, reset, skip-to-end
- Edges appear when both connected nodes are visible

## JS Namespace

```js
window.SP = {};

// parser.js
SP.parse = function(input) → tree object {type, source, sink, left, right}
SP.nodeToExpression = function(node) → string

// layout.js
SP.layout = function(root) → array of positioned node objects

// renderer.js
SP.Renderer = {
  init(svgEl, viewportEl),
  render(nodes),
  updateEdgePath(edge),
  highlightNode(id),
  clearHighlight(),
  setVisibility(step),
  getNodeById(id)
}

// canvas.js — wires everything together
SP.Canvas, SP.Controls, SP.Theme, SP.App
```

## Node Data Shape

```js
{
  id: number,
  type: 'S' | 'P' | 'e',
  source: number,
  sink: number,
  depth: number,
  x: number,        // computed layout x
  y: number,        // computed layout y
  dx: number,       // drag offset x (default 0)
  dy: number,       // drag offset y (default 0)
  left: node | null,
  right: node | null,
  parent: node | null
}
```

## Constants

```
H_SPACING = 70     // horizontal gap between leaf nodes
V_SPACING = 80     // vertical gap between tree levels
SP_W = 48          // S/P node pill width
SP_H = 32          // S/P node pill height
SP_RX = 12         // S/P node corner radius
LEAF_R = 18        // edge node circle radius
```

## Out of Scope

- Backend/server — purely static files opened locally
- Graph input (adjacency list) — input is always SP expression text
- Mobile/touch support — desktop mouse interactions only
- Undo/redo for node dragging

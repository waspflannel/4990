window.SP = window.SP || {};

var SVG_NS = 'http://www.w3.org/2000/svg';

SP.Renderer = {
  svgEl: null,
  viewportEl: null,
  edgesLayer: null,
  nodesLayer: null,
  nodes: [],
  edges: [],
  nodeElements: {},
  selectedId: null,

  init: function(svgEl, viewportEl) {
    this.svgEl = svgEl;
    this.viewportEl = viewportEl;
    this.edgesLayer = viewportEl.querySelector('.edges-layer');
    this.nodesLayer = viewportEl.querySelector('.nodes-layer');
  },

  render: function(nodes) {
    this.edgesLayer.textContent = '';
    this.nodesLayer.textContent = '';
    this.nodes = nodes;
    this.edges = [];
    this.nodeElements = {};
    this.selectedId = null;

    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.type !== 'e') {
        var children = [n.left, n.right];
        for (var j = 0; j < children.length; j++) {
          var child = children[j];
          var path = document.createElementNS(SVG_NS, 'path');
          path.setAttribute('d', this.computeEdgePath(n, child));
          path.classList.add('tree-edge');
          path.dataset.parentId = n.id;
          path.dataset.childId = child.id;
          this.edgesLayer.appendChild(path);
          this.edges.push({ element: path, parent: n, child: child });
        }
      }
    }

    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var g = document.createElementNS(SVG_NS, 'g');
      g.classList.add('node-group');
      g.dataset.nodeId = n.id;
      g.setAttribute('transform', 'translate(' + (n.x + n.dx) + ',' + (n.y + n.dy) + ')');

      if (n.type === 'e') {
        var circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('cx', 0);
        circle.setAttribute('cy', 0);
        circle.setAttribute('r', SP.LEAF_R);
        circle.classList.add('node-shape', 'e-node');
        g.appendChild(circle);
      } else {
        var rect = document.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', -SP.SP_W / 2);
        rect.setAttribute('y', -SP.SP_H / 2);
        rect.setAttribute('width', SP.SP_W);
        rect.setAttribute('height', SP.SP_H);
        rect.setAttribute('rx', SP.SP_RX);
        rect.classList.add('node-shape', n.type === 'S' ? 's-node' : 'p-node');
        g.appendChild(rect);
      }

      var label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', 0);
      label.setAttribute('y', 0);
      label.classList.add('node-label');
      if (n.type === 'S') { label.classList.add('s-label'); label.textContent = 'S'; }
      else if (n.type === 'P') { label.classList.add('p-label'); label.textContent = 'P'; }
      else { label.classList.add('e-label'); label.textContent = 'e'; }
      g.appendChild(label);

      var sub = document.createElementNS(SVG_NS, 'text');
      var subY = n.type === 'e' ? SP.LEAF_R + 6 : SP.SP_H / 2 + 6;
      sub.setAttribute('x', 0);
      sub.setAttribute('y', subY);
      sub.classList.add('node-sublabel');
      sub.classList.add(n.type === 'S' ? 's-sub' : n.type === 'P' ? 'p-sub' : 'e-sub');
      sub.textContent = '(' + n.source + ',' + n.sink + ')';
      g.appendChild(sub);

      this.nodesLayer.appendChild(g);
      this.nodeElements[n.id] = g;
    }
  },

  computeEdgePath: function(parent, child) {
    var px = parent.x + parent.dx;
    var py = parent.y + parent.dy + SP.SP_H / 2;
    var cx = child.x + child.dx;
    var cy = child.y + child.dy - (child.type === 'e' ? SP.LEAF_R : SP.SP_H / 2);
    var midY = (py + cy) / 2;
    return 'M ' + px + ' ' + py + ' C ' + px + ' ' + midY + ', ' + cx + ' ' + midY + ', ' + cx + ' ' + cy;
  },

  updateEdgesForNode: function(nodeId) {
    for (var i = 0; i < this.edges.length; i++) {
      var edge = this.edges[i];
      if (edge.parent.id === nodeId || edge.child.id === nodeId) {
        edge.element.setAttribute('d', this.computeEdgePath(edge.parent, edge.child));
      }
    }
  },

  highlightNode: function(id) {
    this.clearHighlight();
    var el = this.nodeElements[id];
    if (el) {
      el.classList.add('selected');
      this.selectedId = id;
    }
    var node = this.getNodeById(id);
    if (node) SP.Inspector.show(node);
  },

  clearHighlight: function() {
    if (this.selectedId !== null) {
      var el = this.nodeElements[this.selectedId];
      if (el) el.classList.remove('selected');
      this.selectedId = null;
    }
    SP.Inspector.clear();
  },

  setVisibility: function(step, nodes) {
    var visibleIds = new Set();
    for (var i = 0; i < step && i < nodes.length; i++) {
      visibleIds.add(nodes[i].id);
    }

    var groups = this.nodesLayer.querySelectorAll('.node-group');
    for (var i = 0; i < groups.length; i++) {
      var nid = parseInt(groups[i].dataset.nodeId, 10);
      groups[i].classList.toggle('visible', visibleIds.has(nid));
    }

    var edgeEls = this.edgesLayer.querySelectorAll('.tree-edge');
    for (var i = 0; i < edgeEls.length; i++) {
      var pid = parseInt(edgeEls[i].dataset.parentId, 10);
      var cid = parseInt(edgeEls[i].dataset.childId, 10);
      edgeEls[i].classList.toggle('visible', visibleIds.has(pid) && visibleIds.has(cid));
    }
  },

  resetPositions: function() {
    for (var i = 0; i < this.nodes.length; i++) {
      var n = this.nodes[i];
      n.dx = 0;
      n.dy = 0;
      var el = this.nodeElements[n.id];
      if (el) el.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')');
    }
    for (var i = 0; i < this.edges.length; i++) {
      var edge = this.edges[i];
      edge.element.setAttribute('d', this.computeEdgePath(edge.parent, edge.child));
    }
  },

  getNodeById: function(id) {
    for (var i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].id === id) return this.nodes[i];
    }
    return null;
  }
};

/* ══════════════════ Inspector ══════════════════ */

SP.Inspector = {
  el: null,

  init: function() {
    this.el = document.getElementById('inspector');
  },

  _createRow: function(labelText, valueText, extraClass) {
    var row = document.createElement('div');
    row.className = 'inspector-row';
    var label = document.createElement('span');
    label.className = 'inspector-label';
    label.textContent = labelText;
    var value = document.createElement('span');
    value.className = 'inspector-value' + (extraClass ? ' ' + extraClass : '');
    value.textContent = valueText;
    row.appendChild(label);
    row.appendChild(value);
    return row;
  },

  show: function(node) {
    var typeNames = { S: 'Series Composition', P: 'Parallel Composition', e: 'Edge' };
    var typeClass = { S: 'series', P: 'parallel', e: 'edge' };

    // Clear existing content
    while (this.el.firstChild) this.el.removeChild(this.el.firstChild);

    var content = document.createElement('div');
    content.className = 'inspector-content';

    // Type indicator
    var typeDiv = document.createElement('div');
    typeDiv.className = 'inspector-type';
    var dot = document.createElement('span');
    dot.className = 'inspector-dot ' + typeClass[node.type];
    var typeName = document.createElement('span');
    typeName.className = 'inspector-type-name';
    typeName.textContent = typeNames[node.type];
    typeDiv.appendChild(dot);
    typeDiv.appendChild(typeName);
    content.appendChild(typeDiv);

    // Source, Sink, Depth
    content.appendChild(this._createRow('Source', String(node.source)));
    content.appendChild(this._createRow('Sink', String(node.sink)));
    content.appendChild(this._createRow('Depth', String(node.depth)));

    // Expression
    var exprLabel = document.createElement('div');
    exprLabel.className = 'inspector-expr-label';
    exprLabel.textContent = 'Expression';
    content.appendChild(exprLabel);

    var exprBox = document.createElement('div');
    exprBox.className = 'inspector-expr';
    exprBox.textContent = SP.nodeToExpression(node);
    content.appendChild(exprBox);

    // Children (internal nodes only)
    if (node.type !== 'e') {
      content.appendChild(this._createRow('Left', SP.nodeToExpression(node.left), 'inspector-child-expr'));
      content.appendChild(this._createRow('Right', SP.nodeToExpression(node.right), 'inspector-child-expr'));
    }

    this.el.appendChild(content);
  },

  clear: function() {
    while (this.el.firstChild) this.el.removeChild(this.el.firstChild);
    var p = document.createElement('p');
    p.className = 'inspector-empty';
    p.textContent = 'Click a node to inspect';
    this.el.appendChild(p);
  }
};

window.SP = window.SP || {};

/* ══════════════════ Theme ══════════════════ */

SP.Theme = {
  current: 'light',

  init: function() {
    var saved = localStorage.getItem('sp-theme');
    this.current = saved || 'light';
    document.documentElement.setAttribute('data-theme', this.current);
    this.updateIcon();

    var self = this;
    document.getElementById('themeToggle').addEventListener('click', function() {
      self.toggle();
    });
  },

  toggle: function() {
    this.current = this.current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.current);
    localStorage.setItem('sp-theme', this.current);
    this.updateIcon();
  },

  updateIcon: function() {
    var btn = document.getElementById('themeToggle');
    var sun = btn.querySelector('.icon-sun');
    var moon = btn.querySelector('.icon-moon');
    sun.style.display = this.current === 'light' ? 'none' : 'block';
    moon.style.display = this.current === 'light' ? 'block' : 'none';
  }
};

/* ══════════════════ Sidebar ══════════════════ */

SP.Sidebar = {
  collapsed: false,

  init: function() {
    var self = this;
    document.getElementById('sidebarToggle').addEventListener('click', function() {
      self.toggle();
    });
  },

  toggle: function() {
    this.collapsed = !this.collapsed;
    document.getElementById('sidebar').classList.toggle('collapsed', this.collapsed);
    document.getElementById('sidebarToggle').classList.toggle('rotated', this.collapsed);
  }
};

/* ══════════════════ Canvas (Pan / Zoom) ══════════════════ */

SP.Canvas = {
  tx: 0,
  ty: 0,
  scale: 1,
  isPanning: false,
  panStartX: 0,
  panStartY: 0,
  panStartTx: 0,
  panStartTy: 0,
  svgEl: null,
  viewportEl: null,

  init: function(svgEl, viewportEl) {
    this.svgEl = svgEl;
    this.viewportEl = viewportEl;
    var self = this;
    var canvasArea = document.getElementById('canvasArea');

    canvasArea.addEventListener('wheel', function(e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? -0.1 : 0.1;
      var newScale = Math.max(0.1, Math.min(3.0, self.scale + delta));

      var rect = canvasArea.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;
      var ratio = newScale / self.scale;
      self.tx = mx - ratio * (mx - self.tx);
      self.ty = my - ratio * (my - self.ty);
      self.scale = newScale;
      self.applyTransform();
    }, { passive: false });

    canvasArea.addEventListener('mousedown', function(e) {
      if (e.target === canvasArea || e.target === svgEl || e.target.tagName === 'svg' ||
          (e.target.closest('.edges-layer') && !e.target.closest('.node-group'))) {
        self.isPanning = true;
        self.panStartX = e.clientX;
        self.panStartY = e.clientY;
        self.panStartTx = self.tx;
        self.panStartTy = self.ty;
        canvasArea.style.cursor = 'grabbing';
        SP.Renderer.clearHighlight();
      }
    });

    window.addEventListener('mousemove', function(e) {
      if (self.isPanning) {
        self.tx = self.panStartTx + (e.clientX - self.panStartX);
        self.ty = self.panStartTy + (e.clientY - self.panStartY);
        self.applyTransform();
      }
    });

    window.addEventListener('mouseup', function() {
      if (self.isPanning) {
        self.isPanning = false;
        document.getElementById('canvasArea').style.cursor = '';
      }
    });

    document.getElementById('btnZoomIn').addEventListener('click', function() { self.zoomStep(0.2); });
    document.getElementById('btnZoomOut').addEventListener('click', function() { self.zoomStep(-0.2); });
    document.getElementById('btnFitView').addEventListener('click', function() { self.fitToView(); });
    document.getElementById('btnResetLayout').addEventListener('click', function() {
      SP.Renderer.resetPositions();
      self.fitToView();
    });
    document.getElementById('zoomLevel').addEventListener('click', function() { self.fitToView(); });
  },

  applyTransform: function() {
    this.viewportEl.setAttribute('transform', 'translate(' + this.tx + ',' + this.ty + ') scale(' + this.scale + ')');
    document.getElementById('zoomLevel').textContent = Math.round(this.scale * 100) + '%';
  },

  zoomStep: function(delta) {
    var canvasArea = document.getElementById('canvasArea');
    var rect = canvasArea.getBoundingClientRect();
    var cx = rect.width / 2;
    var cy = rect.height / 2;
    var newScale = Math.max(0.1, Math.min(3.0, this.scale + delta));
    var ratio = newScale / this.scale;
    this.tx = cx - ratio * (cx - this.tx);
    this.ty = cy - ratio * (cy - this.ty);
    this.scale = newScale;
    this.applyTransform();
  },

  fitToView: function() {
    var nodes = SP.Renderer.nodes;
    if (!nodes.length) return;

    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var ax = n.x + n.dx;
      var ay = n.y + n.dy;
      var hw = n.type === 'e' ? SP.LEAF_R : SP.SP_W / 2;
      var hh = n.type === 'e' ? SP.LEAF_R : SP.SP_H / 2;
      if (ax - hw < minX) minX = ax - hw;
      if (ax + hw > maxX) maxX = ax + hw;
      if (ay - hh < minY) minY = ay - hh;
      if (ay + hh + 24 > maxY) maxY = ay + hh + 24;
    }

    var pad = 80;
    var treeW = maxX - minX + pad * 2;
    var treeH = maxY - minY + pad * 2;
    var treeCX = (minX + maxX) / 2;
    var treeCY = (minY + maxY) / 2;

    var canvasArea = document.getElementById('canvasArea');
    var rect = canvasArea.getBoundingClientRect();
    var scaleX = rect.width / treeW;
    var scaleY = rect.height / treeH;
    this.scale = Math.min(scaleX, scaleY, 1.5);

    this.tx = rect.width / 2 - treeCX * this.scale;
    this.ty = rect.height / 2 - treeCY * this.scale;
    this.applyTransform();
  }
};

/* ══════════════════ Node Dragging ══════════════════ */

SP.Drag = {
  dragNode: null,
  startX: 0,
  startY: 0,
  totalDist: 0,
  isDragging: false,

  init: function() {
    var self = this;

    document.getElementById('treeSvg').addEventListener('mousedown', function(e) {
      var nodeGroup = e.target.closest('.node-group');
      if (!nodeGroup) return;

      e.stopPropagation();
      var nodeId = parseInt(nodeGroup.dataset.nodeId, 10);
      var node = SP.Renderer.getNodeById(nodeId);
      if (!node) return;

      self.dragNode = node;
      self.startX = e.clientX;
      self.startY = e.clientY;
      self.totalDist = 0;
      self.isDragging = false;
    });

    window.addEventListener('mousemove', function(e) {
      if (!self.dragNode) return;

      var ddx = e.clientX - self.startX;
      var ddy = e.clientY - self.startY;
      self.totalDist += Math.abs(ddx) + Math.abs(ddy);

      if (self.totalDist > 4) {
        self.isDragging = true;
        self.dragNode.dx += ddx / SP.Canvas.scale;
        self.dragNode.dy += ddy / SP.Canvas.scale;
        self.startX = e.clientX;
        self.startY = e.clientY;

        var el = SP.Renderer.nodeElements[self.dragNode.id];
        if (el) {
          el.setAttribute('transform', 'translate(' + (self.dragNode.x + self.dragNode.dx) + ',' + (self.dragNode.y + self.dragNode.dy) + ')');
        }
        SP.Renderer.updateEdgesForNode(self.dragNode.id);
      }
    });

    window.addEventListener('mouseup', function() {
      if (!self.dragNode) return;

      if (!self.isDragging) {
        SP.Renderer.highlightNode(self.dragNode.id);
      }

      self.dragNode = null;
      self.isDragging = false;
    });
  }
};

/* ══════════════════ Animation Controls ══════════════════ */

SP.Controls = {
  currentStep: 0,
  totalSteps: 0,
  playInterval: null,
  treeNodes: [],

  init: function() {
    var self = this;

    document.getElementById('parseBtn').addEventListener('click', function() { self.doParse(); });
    document.getElementById('exprInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); self.doParse(); }
    });
    document.getElementById('exampleSelect').addEventListener('change', function() {
      if (this.value) {
        document.getElementById('exprInput').value = this.value;
        this.value = '';
        self.doParse();
      }
    });

    document.getElementById('btnReset').addEventListener('click', function() {
      self.stopPlay(); self.currentStep = 0; self.updateVisibility();
    });
    document.getElementById('btnBack').addEventListener('click', function() {
      self.stopPlay();
      if (self.currentStep > 0) { self.currentStep--; self.updateVisibility(); }
    });
    document.getElementById('btnForward').addEventListener('click', function() {
      self.stopPlay();
      if (self.currentStep < self.totalSteps) { self.currentStep++; self.updateVisibility(); }
    });
    document.getElementById('btnEnd').addEventListener('click', function() {
      self.stopPlay(); self.currentStep = self.totalSteps; self.updateVisibility();
    });
    document.getElementById('btnPlay').addEventListener('click', function() { self.togglePlay(); });
    document.getElementById('speedSlider').addEventListener('input', function() {
      if (self.playInterval) { self.stopPlay(); self.togglePlay(); }
    });
  },

  doParse: function() {
    this.stopPlay();
    this.clearMessages();

    var input = document.getElementById('exprInput').value.trim();
    if (!input) { this.showError('Enter an expression first.'); return; }

    var tree;
    try {
      tree = SP.parse(input);
    } catch (e) {
      this.showError(e.message);
      return;
    }

    this.treeNodes = SP.layout(tree);
    this.totalSteps = this.treeNodes.length;
    this.currentStep = 0;

    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('treeSvg').style.display = 'block';
    document.getElementById('canvasControls').style.display = 'flex';

    SP.Renderer.render(this.treeNodes);
    SP.Canvas.fitToView();
    this.updateVisibility();
    this.enableControls(true);

    this.showSuccess('Loaded: ' + input);
  },

  stopPlay: function() {
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
      var btn = document.getElementById('btnPlay');
      btn.classList.remove('playing');
      // Swap to play icon: show play svg, hide pause svg
      var playSvg = btn.querySelector('.play-icon');
      var pauseSvg = btn.querySelector('.pause-icon');
      if (playSvg) playSvg.style.display = '';
      if (pauseSvg) pauseSvg.style.display = 'none';
    }
  },

  togglePlay: function() {
    if (this.playInterval) {
      this.stopPlay();
      return;
    }
    if (this.currentStep >= this.totalSteps) this.currentStep = 0;
    var btn = document.getElementById('btnPlay');
    btn.classList.add('playing');
    // Swap to pause icon: hide play svg, show pause svg
    var playSvg = btn.querySelector('.play-icon');
    var pauseSvg = btn.querySelector('.pause-icon');
    if (playSvg) playSvg.style.display = 'none';
    if (pauseSvg) pauseSvg.style.display = '';
    var speed = 2100 - parseInt(document.getElementById('speedSlider').value, 10);
    var self = this;
    this.playInterval = setInterval(function() {
      if (self.currentStep < self.totalSteps) {
        self.currentStep++;
        self.updateVisibility();
      } else {
        self.stopPlay();
      }
    }, speed);
  },

  updateVisibility: function() {
    SP.Renderer.setVisibility(this.currentStep, this.treeNodes);

    document.getElementById('stepInfo').textContent = this.totalSteps > 0
      ? 'Step ' + this.currentStep + ' of ' + this.totalSteps
      : 'No tree loaded';

    var hasPrev = this.currentStep > 0;
    var hasNext = this.currentStep < this.totalSteps;
    document.getElementById('btnReset').disabled = !hasPrev;
    document.getElementById('btnBack').disabled = !hasPrev;
    document.getElementById('btnForward').disabled = !hasNext;
    document.getElementById('btnEnd').disabled = !hasNext;
  },

  enableControls: function(enabled) {
    document.getElementById('btnPlay').disabled = !enabled;
    if (enabled) this.updateVisibility();
  },

  showError: function(msg) {
    var el = document.getElementById('errorArea');
    el.textContent = msg;
    el.classList.add('visible');
  },

  showSuccess: function(msg) {
    var el = document.getElementById('successArea');
    el.textContent = msg;
    el.classList.add('visible');
  },

  clearMessages: function() {
    var err = document.getElementById('errorArea');
    err.classList.remove('visible');
    err.textContent = '';
    var suc = document.getElementById('successArea');
    suc.classList.remove('visible');
    suc.textContent = '';
  }
};

/* ══════════════════ App Init ══════════════════ */

SP.App = {
  init: function() {
    var svgEl = document.getElementById('treeSvg');
    var viewportEl = document.getElementById('viewport');

    SP.Theme.init();
    SP.Sidebar.init();
    SP.Inspector.init();
    SP.Renderer.init(svgEl, viewportEl);
    SP.Canvas.init(svgEl, viewportEl);
    SP.Drag.init();
    SP.Controls.init();
  }
};

document.addEventListener('DOMContentLoaded', function() {
  SP.App.init();
});

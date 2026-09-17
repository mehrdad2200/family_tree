/**
 * شجره‌نامه — Tree Renderer
 * Combines Canvas for lines + DOM for interactive cards
 */

class TreeRenderer {
  constructor(wrapperEl) {
    this.wrapper = wrapperEl;
    this.canvas = wrapperEl.querySelector('#tree-canvas');
    this.overlay = wrapperEl.querySelector('#tree-overlay');
    this.ctx = this.canvas.getContext('2d');

    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.selectedId = null;
    this.onPersonClick = null;
    this.onPersonContext = null;

    this.layoutEngine = new TreeLayout();
    this.layoutResult = null;
    this.people = [];
    this.relationships = [];

    this._resize();
    this._bindEvents();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const rect = this.wrapper.getBoundingClientRect();
    this.canvas.width = rect.width * devicePixelRatio;
    this.canvas.height = rect.height * devicePixelRatio;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    this.render();
  }

  setData(people, relationships) {
    this.people = people || [];
    this.relationships = relationships || [];
    this.layoutResult = this.layoutEngine.compute(this.people, this.relationships);
    this.render();
  }

  select(id) {
    this.selectedId = id;
    this.render();
  }

  fit() {
    if (!this.layoutResult || this.layoutResult.nodes.length === 0) return;

    const nodes = this.layoutResult.nodes;
    const pad = 80;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + this.layoutEngine.cardWidth);
      maxY = Math.max(maxY, n.y + this.layoutEngine.cardHeight);
    });

    const treeW = maxX - minX + pad * 2;
    const treeH = maxY - minY + pad * 2;
    const viewW = this.wrapper.clientWidth;
    const viewH = this.wrapper.clientHeight;

    this.scale = Math.min(viewW / treeW, viewH / treeH, 1.2) * 0.92;
    this.offsetX = (viewW - treeW * this.scale) / 2 - minX * this.scale + pad * this.scale;
    this.offsetY = (viewH - treeH * this.scale) / 2 - minY * this.scale + pad * this.scale;

    this._applyTransform();
    this.render();
  }

  zoomIn() {
    this.scale = Utils.clamp(this.scale * 1.2, 0.15, 3);
    this._applyTransform();
    this.render();
  }

  zoomOut() {
    this.scale = Utils.clamp(this.scale / 1.2, 0.15, 3);
    this._applyTransform();
    this.render();
  }

  reset() {
    this.scale = 1;
    this.offsetX = 40;
    this.offsetY = 40;
    this._applyTransform();
    this.fit();
  }

  render() {
    this._drawLines();
    this._drawCards();
  }

  _applyTransform() {
    this.overlay.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
  }

  _drawLines() {
    const ctx = this.ctx;
    const w = this.wrapper.clientWidth;
    const h = this.wrapper.clientHeight;
    ctx.clearRect(0, 0, w, h);

    if (!this.layoutResult) return;

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    const { nodes, parentsOf, spousesOf } = this.layoutResult;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const cardW = this.layoutEngine.cardWidth;
    const cardH = this.layoutEngine.cardHeight;

    // Parent-child lines
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    nodes.forEach(node => {
      const pids = node.parentIds || [];
      if (pids.length === 0) return;

      // Connect to midpoint of parents if couple, else to single parent
      const parentNodes = pids.map(id => nodeMap.get(id)).filter(Boolean);
      if (parentNodes.length === 0) return;

      let parentX;
      if (parentNodes.length >= 2) {
        parentX = (parentNodes[0].x + parentNodes[1].x + cardW) / 2;
      } else {
        parentX = parentNodes[0].x + cardW / 2;
      }
      const parentY = parentNodes[0].y + cardH;

      const childX = node.x + cardW / 2;
      const childY = node.y;
      const midY = parentY + (childY - parentY) / 2;

      ctx.beginPath();
      ctx.moveTo(parentX, parentY);
      ctx.lineTo(parentX, midY);
      ctx.lineTo(childX, midY);
      ctx.lineTo(childX, childY);
      ctx.stroke();
    });

    // Spouse lines
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2;
    const drawn = new Set();

    nodes.forEach(node => {
      if (!node.spouseOf || drawn.has(node.id)) return;
      const spouse = nodeMap.get(node.spouseOf);
      if (!spouse) return;

      drawn.add(node.id);
      drawn.add(spouse.id);

      const y = node.y + cardH / 2;
      const x1 = Math.min(node.x + cardW, spouse.x);
      const x2 = Math.max(node.x, spouse.x + cardW);

      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
    });

    ctx.restore();
  }

  _drawCards() {
    this.overlay.innerHTML = '';

    if (!this.layoutResult || this.layoutResult.nodes.length === 0) {
      // App handles welcome screen via showWelcome()
      return;
    }

    this.layoutResult.nodes.forEach((node, i) => {
      const p = node.person;
      const card = document.createElement('div');
      card.className = `tree-card ${p.gender || 'unknown'}`;
      if (p.id === this.selectedId) card.classList.add('selected');
      card.style.left = node.x + 'px';
      card.style.top = node.y + 'px';
      card.style.animationDelay = (i * 0.02) + 's';
      card.dataset.id = p.id;

      const name = Utils.fullName(p);
      const dates = Utils.dates(p);
      const initials = Utils.initials(p);

      let photoHtml = `<div class="initials">${initials}</div>`;
      if (p.photo) {
        photoHtml = `<img src="${p.photo}" alt="${name}" />`;
      }

      card.innerHTML = `
        <div class="card-photo">${photoHtml}</div>
        <div class="card-body">
          <div class="card-name" title="${name}">${name}</div>
          ${dates ? `<div class="card-dates">${dates}</div>` : ''}
        </div>
      `;

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onPersonClick) this.onPersonClick(p);
      });

      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.onPersonContext) this.onPersonContext(p, e.clientX, e.clientY);
      });

      this.overlay.appendChild(card);
    });

    this._applyTransform();
  }

  _bindEvents() {
    this.wrapper.addEventListener('mousedown', (e) => {
      if (e.target.closest('.tree-card')) return;
      this.isPanning = true;
      this.panStart = { x: e.clientX - this.offsetX, y: e.clientY - this.offsetY };
      this.wrapper.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      this.offsetX = e.clientX - this.panStart.x;
      this.offsetY = e.clientY - this.panStart.y;
      this._applyTransform();
      this._drawLines();
    });

    window.addEventListener('mouseup', () => {
      this.isPanning = false;
      this.wrapper.style.cursor = 'grab';
    });

    this.wrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.scale = Utils.clamp(this.scale * delta, 0.15, 3);
      this._applyTransform();
      this._drawLines();
    }, { passive: false });
  }
}

window.TreeRenderer = TreeRenderer;

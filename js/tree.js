/**
 * شجره‌نامه - Tree Rendering Engine
 * Hierarchical layout for family trees
 */

class TreeRenderer {
  constructor(container) {
    this.container = container;
    this.viewport = container.querySelector('#tree-viewport') || container;
    this.people = [];
    this.relationships = [];
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.selectedId = null;
    this.mode = 'vertical'; // vertical | horizontal
    this.cardWidth = 160;
    this.cardHeight = 130;
    this.hGap = 40;
    this.vGap = 80;
    this.onPersonClick = null;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    
    this._setupPanZoom();
  }

  setData(people, relationships) {
    this.people = people || [];
    this.relationships = relationships || [];
    this.render();
  }

  setMode(mode) {
    this.mode = mode;
    this.render();
  }

  select(personId) {
    this.selectedId = personId;
    this.render();
  }

  fitToView() {
    if (this.people.length === 0) return;
    
    const cards = this.viewport.querySelectorAll('.person-card');
    if (cards.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    cards.forEach(card => {
      const x = parseFloat(card.style.left);
      const y = parseFloat(card.style.top);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + this.cardWidth);
      maxY = Math.max(maxY, y + this.cardHeight);
    });

    const treeW = maxX - minX + 100;
    const treeH = maxY - minY + 100;
    const viewW = this.container.clientWidth;
    const viewH = this.container.clientHeight;

    const scaleX = viewW / treeW;
    const scaleY = viewH / treeH;
    this.scale = Math.min(scaleX, scaleY, 1) * 0.9;

    this.offsetX = (viewW - treeW * this.scale) / 2 - minX * this.scale + 40;
    this.offsetY = (viewH - treeH * this.scale) / 2 - minY * this.scale + 40;

    this._applyTransform();
  }

  zoomIn() {
    this.scale = Math.min(this.scale * 1.2, 3);
    this._applyTransform();
  }

  zoomOut() {
    this.scale = Math.max(this.scale / 1.2, 0.2);
    this._applyTransform();
  }

  resetView() {
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this._applyTransform();
    this.fitToView();
  }

  render() {
    this.viewport.innerHTML = '';
    
    if (this.people.length === 0) return;

    const layout = this._computeLayout();
    
    // Draw lines first
    layout.forEach(node => {
      if (node.parentId) {
        const parent = layout.find(n => n.id === node.parentId);
        if (parent) {
          this._drawLine(parent, node);
        }
      }
      // Spouse lines
      if (node.spouseId && node.id < node.spouseId) {
        const spouse = layout.find(n => n.id === node.spouseId);
        if (spouse) {
          this._drawSpouseLine(node, spouse);
        }
      }
    });

    // Draw cards
    layout.forEach(node => {
      this._drawCard(node);
    });
  }

  _computeLayout() {
    // Build parent-child map
    const childrenOf = {};
    const parentsOf = {};
    const spousesOf = {};

    this.relationships.forEach(rel => {
      if (rel.type === 'parent') {
        // fromId is parent, toId is child
        if (!childrenOf[rel.fromId]) childrenOf[rel.fromId] = [];
        childrenOf[rel.fromId].push(rel.toId);
        if (!parentsOf[rel.toId]) parentsOf[rel.toId] = [];
        parentsOf[rel.toId].push(rel.fromId);
      } else if (rel.type === 'spouse') {
        spousesOf[rel.fromId] = rel.toId;
        spousesOf[rel.toId] = rel.fromId;
      }
    });

    // Find roots (people with no parents)
    const hasParent = new Set();
    Object.values(parentsOf).forEach(parents => parents.forEach(p => hasParent.add(p)));
    
    // Better: people who are never a child
    const isChild = new Set();
    this.relationships.forEach(rel => {
      if (rel.type === 'parent') isChild.add(rel.toId);
    });

    let roots = this.people.filter(p => !isChild.has(p.id));
    if (roots.length === 0 && this.people.length > 0) {
      roots = [this.people[0]];
    }

    // Assign levels (generation)
    const levels = {};
    const visited = new Set();
    
    const assignLevel = (id, level) => {
      if (visited.has(id)) return;
      visited.add(id);
      levels[id] = Math.max(levels[id] || 0, level);
      
      // Children go down
      (childrenOf[id] || []).forEach(childId => assignLevel(childId, level + 1));
      
      // Spouse same level
      if (spousesOf[id] && !visited.has(spousesOf[id])) {
        levels[spousesOf[id]] = level;
        visited.add(spousesOf[id]);
        (childrenOf[spousesOf[id]] || []).forEach(childId => assignLevel(childId, level + 1));
      }
    };

    roots.forEach(r => assignLevel(r.id, 0));
    
    // Any remaining people
    this.people.forEach(p => {
      if (!visited.has(p.id)) assignLevel(p.id, 0);
    });

    // Group by level
    const byLevel = {};
    this.people.forEach(p => {
      const lvl = levels[p.id] || 0;
      if (!byLevel[lvl]) byLevel[lvl] = [];
      byLevel[lvl].push(p);
    });

    // Position
    const positions = [];
    const maxLevel = Math.max(...Object.keys(byLevel).map(Number), 0);

    for (let lvl = 0; lvl <= maxLevel; lvl++) {
      const peopleAtLevel = byLevel[lvl] || [];
      
      // Sort by family grouping roughly
      peopleAtLevel.sort((a, b) => {
        const aParents = (parentsOf[a.id] || []).join(',');
        const bParents = (parentsOf[b.id] || []).join(',');
        return aParents.localeCompare(bParents);
      });

      const totalWidth = peopleAtLevel.length * (this.cardWidth + this.hGap) - this.hGap;
      let startX = -totalWidth / 2;

      peopleAtLevel.forEach((person, idx) => {
        const x = startX + idx * (this.cardWidth + this.hGap);
        const y = lvl * (this.cardHeight + this.vGap);
        
        // Find a parent for line drawing
        const parentIds = parentsOf[person.id] || [];
        const parentId = parentIds[0] || null;

        positions.push({
          id: person.id,
          person,
          x,
          y,
          level: lvl,
          parentId,
          spouseId: spousesOf[person.id] || null
        });
      });
    }

    // Center the whole tree
    if (positions.length > 0) {
      const minX = Math.min(...positions.map(p => p.x));
      positions.forEach(p => {
        p.x = p.x - minX + 50;
        p.y = p.y + 50;
      });
    }

    return positions;
  }

  _drawCard(node) {
    const { person, x, y } = node;
    const card = document.createElement('div');
    card.className = `person-card ${person.gender || 'unknown'}`;
    if (person.id === this.selectedId) card.classList.add('selected');
    card.style.left = x + 'px';
    card.style.top = y + 'px';
    card.dataset.id = person.id;

    const initials = (person.firstName || '?').charAt(0);
    const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ');
    const dates = [person.birthDate, person.deathDate].filter(Boolean).join(' – ');

    card.innerHTML = `
      <div class="card-header">
        <div class="avatar-large">${initials}</div>
        <div class="card-name">${fullName || 'بدون نام'}</div>
        ${dates ? `<div class="card-dates">${dates}</div>` : ''}
      </div>
    `;

    card.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onPersonClick) this.onPersonClick(person);
    });

    this.viewport.appendChild(card);
  }

  _drawLine(parent, child) {
    const parentCenterX = parent.x + this.cardWidth / 2;
    const parentBottom = parent.y + this.cardHeight;
    const childCenterX = child.x + this.cardWidth / 2;
    const childTop = child.y;

    const midY = parentBottom + (childTop - parentBottom) / 2;

    // Vertical from parent
    this._createLine(parentCenterX, parentBottom, parentCenterX, midY, 'vertical');
    // Horizontal
    this._createLine(
      Math.min(parentCenterX, childCenterX),
      midY,
      Math.max(parentCenterX, childCenterX),
      midY,
      'horizontal'
    );
    // Vertical to child
    this._createLine(childCenterX, midY, childCenterX, childTop, 'vertical');
  }

  _drawSpouseLine(a, b) {
    const y = a.y + this.cardHeight / 2;
    const x1 = Math.min(a.x + this.cardWidth, b.x);
    const x2 = Math.max(a.x, b.x + this.cardWidth);
    
    // Simple horizontal connection between spouses
    const line = this._createLine(
      a.x + this.cardWidth,
      y,
      b.x,
      y,
      'horizontal'
    );
    line.style.background = '#f472b6';
    line.style.height = '2px';
  }

  _createLine(x1, y1, x2, y2, type) {
    const line = document.createElement('div');
    line.className = `tree-line ${type}`;
    
    if (type === 'horizontal') {
      line.style.left = Math.min(x1, x2) + 'px';
      line.style.top = y1 + 'px';
      line.style.width = Math.abs(x2 - x1) + 'px';
    } else {
      line.style.left = x1 + 'px';
      line.style.top = Math.min(y1, y2) + 'px';
      line.style.height = Math.abs(y2 - y1) + 'px';
    }
    
    this.viewport.appendChild(line);
    return line;
  }

  _applyTransform() {
    this.viewport.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
  }

  _setupPanZoom() {
    const canvas = this.container.querySelector('.tree-canvas') || this.container;
    
    canvas.addEventListener('mousedown', (e) => {
      if (e.target.closest('.person-card')) return;
      this.isDragging = true;
      this.dragStart = { x: e.clientX - this.offsetX, y: e.clientY - this.offsetY };
      canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.offsetX = e.clientX - this.dragStart.x;
      this.offsetY = e.clientY - this.dragStart.y;
      this._applyTransform();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      canvas.style.cursor = 'grab';
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.scale = Math.min(Math.max(this.scale * delta, 0.2), 3);
      this._applyTransform();
    }, { passive: false });
  }
}

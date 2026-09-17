/**
 * شجره‌نامه — Hierarchical Family Tree Layout Engine
 * Computes positions for people based on parent-child and spouse relationships.
 */

class TreeLayout {
  constructor(options = {}) {
    this.cardWidth = options.cardWidth || 168;
    this.cardHeight = options.cardHeight || 148;
    this.gapX = options.gapX || 48;
    this.gapY = options.gapY || 90;
    this.spouseGap = options.spouseGap || 24;
  }

  /**
   * Main entry: returns array of { id, person, x, y, level, spouseOf }
   */
  compute(people, relationships) {
    if (!people || people.length === 0) return [];

    const peopleMap = new Map(people.map(p => [p.id, p]));
    const childrenOf = new Map(); // parentId -> [childIds]
    const parentsOf = new Map();  // childId -> [parentIds]
    const spousesOf = new Map();  // personId -> [spouseIds]

    // Build graphs
    relationships.forEach(rel => {
      const type = rel.type;

      if (['father', 'mother', 'parent'].includes(type) || 
          (type === 'parent')) {
        // from = parent, to = child
        if (!childrenOf.has(rel.fromId)) childrenOf.set(rel.fromId, []);
        childrenOf.get(rel.fromId).push(rel.toId);

        if (!parentsOf.has(rel.toId)) parentsOf.set(rel.toId, []);
        parentsOf.get(rel.toId).push(rel.fromId);
      } 
      else if (['son', 'daughter', 'child', 'adopted-child'].includes(type)) {
        // from = parent, to = child (normalized)
        if (!childrenOf.has(rel.fromId)) childrenOf.set(rel.fromId, []);
        childrenOf.get(rel.fromId).push(rel.toId);

        if (!parentsOf.has(rel.toId)) parentsOf.set(rel.toId, []);
        parentsOf.get(rel.toId).push(rel.fromId);
      }
      else if (['spouse', 'ex-spouse'].includes(type)) {
        if (!spousesOf.has(rel.fromId)) spousesOf.set(rel.fromId, []);
        if (!spousesOf.has(rel.toId)) spousesOf.set(rel.toId, []);
        spousesOf.get(rel.fromId).push(rel.toId);
        spousesOf.get(rel.toId).push(rel.fromId);
      }
      // siblings are derived from shared parents, we don't force layout from them primarily
    });

    // Determine generation (level) for each person
    const levels = new Map();
    const visited = new Set();

    // Find roots: people who are never listed as a child
    const isChild = new Set();
    parentsOf.forEach((_, childId) => isChild.add(childId));

    let roots = people.filter(p => !isChild.has(p.id));
    if (roots.length === 0) roots = [people[0]];

    const assignLevel = (id, level) => {
      if (visited.has(id)) {
        // Keep the minimum level (oldest generation higher)
        if (levels.has(id) && level < levels.get(id)) {
          levels.set(id, level);
        }
        return;
      }
      visited.add(id);
      levels.set(id, level);

      // Children go to next generation
      (childrenOf.get(id) || []).forEach(cid => assignLevel(cid, level + 1));

      // Spouses share the same generation
      (spousesOf.get(id) || []).forEach(sid => {
        if (!visited.has(sid)) {
          assignLevel(sid, level);
        }
      });
    };

    roots.forEach(r => assignLevel(r.id, 0));

    // Any remaining unvisited (disconnected components)
    people.forEach(p => {
      if (!visited.has(p.id)) assignLevel(p.id, 0);
    });

    // Group by level
    const byLevel = new Map();
    people.forEach(p => {
      const lvl = levels.get(p.id) || 0;
      if (!byLevel.has(lvl)) byLevel.set(lvl, []);
      byLevel.get(lvl).push(p);
    });

    const maxLevel = Math.max(...byLevel.keys(), 0);

    // Position calculation with family grouping
    const positions = [];
    const placed = new Map(); // id -> {x, y}

    // Helper to place a couple side by side
    const placeCouple = (p1, p2, baseX, y) => {
      const w = this.cardWidth;
      const gap = this.spouseGap;
      const total = w * 2 + gap;
      const x1 = baseX;
      const x2 = baseX + w + gap;
      return { x1, x2, width: total };
    };

    for (let lvl = 0; lvl <= maxLevel; lvl++) {
      const nodes = byLevel.get(lvl) || [];

      // Sort to keep families together (by first parent id)
      nodes.sort((a, b) => {
        const pa = (parentsOf.get(a.id) || []).join(',');
        const pb = (parentsOf.get(b.id) || []).join(',');
        if (pa !== pb) return pa.localeCompare(pb);
        return (a.firstName || '').localeCompare(b.firstName || '', 'fa');
      });

      // Calculate total width needed
      let totalWidth = 0;
      const units = []; // either single or couple

      const used = new Set();
      nodes.forEach(p => {
        if (used.has(p.id)) return;

        const spouses = (spousesOf.get(p.id) || []).filter(sid => 
          nodes.some(n => n.id === sid) && !used.has(sid)
        );

        if (spouses.length > 0) {
          const spouse = peopleMap.get(spouses[0]);
          used.add(p.id);
          used.add(spouse.id);
          units.push({ type: 'couple', p1: p, p2: spouse });
          totalWidth += this.cardWidth * 2 + this.spouseGap + this.gapX;
        } else {
          used.add(p.id);
          units.push({ type: 'single', p });
          totalWidth += this.cardWidth + this.gapX;
        }
      });

      totalWidth -= this.gapX; // last gap
      let cursorX = -totalWidth / 2;

      units.forEach(unit => {
        const y = lvl * (this.cardHeight + this.gapY);

        if (unit.type === 'couple') {
          const x1 = cursorX;
          const x2 = cursorX + this.cardWidth + this.spouseGap;

          positions.push({
            id: unit.p1.id,
            person: unit.p1,
            x: x1,
            y,
            level: lvl,
            spouseOf: unit.p2.id
          });
          positions.push({
            id: unit.p2.id,
            person: unit.p2,
            x: x2,
            y,
            level: lvl,
            spouseOf: unit.p1.id
          });

          placed.set(unit.p1.id, { x: x1, y });
          placed.set(unit.p2.id, { x: x2, y });

          cursorX += this.cardWidth * 2 + this.spouseGap + this.gapX;
        } else {
          positions.push({
            id: unit.p.id,
            person: unit.p,
            x: cursorX,
            y,
            level: lvl,
            spouseOf: null
          });
          placed.set(unit.p.id, { x: cursorX, y });
          cursorX += this.cardWidth + this.gapX;
        }
      });
    }

    // Normalize so minX/minY start from a padding
    if (positions.length > 0) {
      const minX = Math.min(...positions.map(p => p.x));
      const minY = Math.min(...positions.map(p => p.y));
      positions.forEach(p => {
        p.x = p.x - minX + 80;
        p.y = p.y - minY + 60;
      });
    }

    // Attach parent info for line drawing
    positions.forEach(pos => {
      const parentIds = parentsOf.get(pos.id) || [];
      pos.parentIds = parentIds;
    });

    return {
      nodes: positions,
      childrenOf,
      parentsOf,
      spousesOf,
      levels
    };
  }
}

window.TreeLayout = TreeLayout;

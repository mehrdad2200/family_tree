/**
 * شجره‌نامه — Family Statistics
 */

class StatsEngine {
  constructor(app) {
    this.app = app;
  }

  compute() {
    const people = this.app.people || [];
    const rels = this.app.relationships || [];

    const males = people.filter(p => p.gender === 'male').length;
    const females = people.filter(p => p.gender === 'female').length;
    const living = people.filter(p => Utils.isLiving(p)).length;
    const deceased = people.length - living;

    // Generations from layout if available
    let generations = 1;
    if (this.app.renderer && this.app.renderer.layoutResult) {
      const levels = this.app.renderer.layoutResult.levels;
      if (levels && levels.size) {
        generations = Math.max(...levels.values()) + 1;
      }
    }

    // Most common places
    const places = {};
    people.forEach(p => {
      if (p.birthPlace) {
        places[p.birthPlace] = (places[p.birthPlace] || 0) + 1;
      }
    });
    const topPlaces = Object.entries(places)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Occupations
    const jobs = {};
    people.forEach(p => {
      if (p.occupation) {
        jobs[p.occupation] = (jobs[p.occupation] || 0) + 1;
      }
    });

    return {
      total: people.length,
      males,
      females,
      living,
      deceased,
      relationships: rels.length,
      generations,
      topPlaces,
      jobs: Object.entries(jobs).sort((a, b) => b[1] - a[1]).slice(0, 5)
    };
  }

  render(container) {
    const s = this.compute();

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${s.total}</div>
          <div class="stat-label">کل افراد</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${s.males}</div>
          <div class="stat-label">مرد</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${s.females}</div>
          <div class="stat-label">زن</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${s.living}</div>
          <div class="stat-label">زنده</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${s.deceased}</div>
          <div class="stat-label">فوت‌شده</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${s.generations}</div>
          <div class="stat-label">نسل</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${s.relationships}</div>
          <div class="stat-label">رابطه</div>
        </div>
      </div>

      ${s.topPlaces.length ? `
        <h4 style="margin:20px 0 10px;font-size:0.9rem;color:var(--color-text-muted)">پراکندگی محل تولد</h4>
        <ul style="list-style:none;padding:0">
          ${s.topPlaces.map(([place, count]) => `
            <li style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--color-border)">
              <span>${Utils.escapeHtml(place)}</span>
              <strong>${count}</strong>
            </li>
          `).join('')}
        </ul>
      ` : ''}
    `;
  }
}

window.StatsEngine = StatsEngine;

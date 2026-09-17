/**
 * شجره‌نامه — Main Application Controller
 * Orchestrates UI, data, renderer, history, export
 */

class ShajarehApp {
  constructor() {
    this.currentProject = null;
    this.people = [];
    this.relationships = [];
    this.editingPersonId = null;
    this.profilePersonId = null;
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.history = new HistoryManager(40);
    this.renderer = null;
    this.exporter = null;
    this.stats = null;
    this._pendingPhoto = null;
  }

  async init() {
    try {
      await db.init();

      this.renderer = new TreeRenderer(document.getElementById('tree-wrapper'));
      this.renderer.onPersonClick = (p) => this.onPersonSelected(p);
      this.renderer.onPersonContext = (p, x, y) => this.showContextMenu(p, x, y);
      this.renderer.onEmptyStart = () => this.startWithMe();

      this.exporter = new ExportEngine(this);
      this.stats = new StatsEngine(this);

      this._bindUI();
      this._bindKeyboard();

      await this._loadProjects();
      await this._applySettings();

      document.getElementById('loading-screen').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');

      const projects = await db.getProjects();
      if (projects.length === 0) {
        // Empty start — show "شروع با من" (no fake data)
        this.showWelcome();
      } else {
        await this.loadProject(projects[0].id);
      }
    } catch (err) {
      console.error(err);
      alert('خطا در راه‌اندازی. صفحه را رفرش کنید.\n' + err.message);
    }
  }

  _snapshot() {
    return {
      people: Utils.clone(this.people),
      relationships: Utils.clone(this.relationships)
    };
  }

  _pushHistory() {
    this.history.push(this._snapshot());
    this._updateUndoButtons();
  }

  _updateUndoButtons() {
    const u = document.getElementById('btn-undo');
    const r = document.getElementById('btn-redo');
    if (u) u.disabled = !this.history.canUndo();
    if (r) r.disabled = !this.history.canRedo();
  }

  async _restore(state) {
    if (!state || !this.currentProject) return;
    this.people = state.people;
    this.relationships = state.relationships;
    this._refreshAll();
  }

  async _loadProjects() {
    const projects = await db.getProjects();
    const list = document.getElementById('project-list');
    if (!list) return;
    list.innerHTML = '';
    projects.forEach(p => {
      const el = document.createElement('div');
      el.className = 'project-item' + (this.currentProject?.id === p.id ? ' active' : '');
      el.innerHTML = `<span class="project-dot"></span><span>${Utils.escapeHtml(p.name)}</span>`;
      el.onclick = () => this.loadProject(p.id);
      list.appendChild(el);
    });
  }

  async loadProject(id) {
    this.currentProject = await db.getProject(id);
    if (!this.currentProject) return;

    this.people = await db.getPeople(id);
    this.relationships = await db.getRelationships(id);

    this.history.clear();
    this._pushHistory();

    const title = document.getElementById('project-title');
    if (title) title.textContent = this.currentProject.name;
    this._updateMeta();
    this._refreshAll();
    await this._loadProjects();
    setTimeout(() => this.renderer.fit(), 150);
  }

  /** First-run welcome: no fake data */
  showWelcome() {
    const overlay = document.getElementById('tree-overlay');
    if (!overlay) return;
    overlay.innerHTML = `
      <div class="welcome-screen" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;text-align:center;padding:24px;z-index:5">
        <div style="font-size:4.5rem;line-height:1">🌳</div>
        <h2 style="font-size:1.6rem;font-weight:700;color:var(--color-primary-dark);margin:0">شجره‌نامه خودت را بساز</h2>
        <p style="max-width:360px;color:var(--color-text-muted);line-height:1.7;margin:0">
          از خودت شروع کن. بعد با یک کلیک پدر، مادر، همسر، خواهر، برادر یا فرزند اضافه کن.
        </p>
        <button id="btn-start-with-me" class="btn btn-primary" style="height:48px;padding:0 28px;font-size:1rem">
          شروع با من
        </button>
        <button id="btn-load-sample-optional" class="btn btn-ghost" style="font-size:0.85rem;color:var(--color-text-muted)">
          یا بارگذاری شجره‌نامه نمونه (اختیاری)
        </button>
      </div>
    `;
    document.getElementById('btn-start-with-me').onclick = () => this.startWithMe();
    document.getElementById('btn-load-sample-optional').onclick = () => this._askLoadSample();
  }

  async _askLoadSample() {
    if (!window.SAMPLE_FAMILY) {
      this.toast('فایل نمونه موجود نیست', 'error');
      return;
    }
    if (!confirm('شجره‌نامه نمونه «خانواده آزادگان» بارگذاری شود؟\n(بعداً می‌توانی پاک کنی و از صفر شروع کنی)')) return;
    await this._loadSampleFamily();
  }

  async _loadSampleFamily() {
    const sample = window.SAMPLE_FAMILY;
    if (!sample) return;
    await db.saveProject(sample.project);
    for (const p of sample.people) await db.savePerson(p);
    for (const r of sample.relationships) await db.saveRelationship(r);
    await this.loadProject(sample.project.id);
    this.toast('شجره‌نامه نمونه بارگذاری شد', 'success');
  }

  /** Create project + centered "Me" person */
  async startWithMe() {
    const project = {
      id: Utils.uid(),
      name: 'شجره‌نامه من',
      description: '',
      theme: 'forest',
      createdAt: Utils.now(),
      updatedAt: Utils.now()
    };
    await db.saveProject(project);
    this.currentProject = project;

    const me = {
      id: Utils.uid(),
      projectId: project.id,
      firstName: 'من',
      lastName: '',
      gender: 'male',
      birthDate: '',
      deathDate: '',
      confidence: 'certain',
      isRoot: true
    };
    await db.savePerson(me);
    this.people = [me];
    this.relationships = [];

    document.getElementById('project-title').textContent = project.name;
    await this._loadProjects();
    this._pushHistory();
    this._refreshAll();
    setTimeout(() => this.renderer.fit(), 100);
    this.toast('روی «من» کلیک کن و پدر، مادر، همسر یا فرزند اضافه کن', 'success');
  }

  /** When user clicks a person on the tree */
  onPersonSelected(person) {
    this.profilePersonId = person.id;
    this.renderer.select(person.id);
    this.openInspector(person);
    this.showAddRelationBar(person);
  }

  /** Floating bar: پدر / مادر / همسر / برادر / خواهر / پسر / دختر */
  showAddRelationBar(person) {
    let bar = document.getElementById('add-relation-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'add-relation-bar';
      bar.style.cssText = `
        position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
        background:var(--color-bg-elevated);border:1px solid var(--color-border);
        border-radius:16px;padding:10px 14px;display:flex;gap:8px;flex-wrap:wrap;
        justify-content:center;box-shadow:var(--shadow-xl);z-index:80;
        max-width:95vw;
      `;
      document.body.appendChild(bar);
    }

    const actions = [
      { key: 'father', label: 'پدر', icon: '👨' },
      { key: 'mother', label: 'مادر', icon: '👩' },
      { key: 'spouse', label: 'همسر', icon: '💑' },
      { key: 'brother', label: 'برادر', icon: '👦' },
      { key: 'sister', label: 'خواهر', icon: '👧' },
      { key: 'son', label: 'پسر', icon: '🧒' },
      { key: 'daughter', label: 'دختر', icon: '👧' }
    ];

    bar.innerHTML = actions.map(a => `
      <button data-rel="${a.key}" style="
        display:flex;flex-direction:column;align-items:center;gap:4px;
        padding:8px 12px;border-radius:12px;border:1px solid var(--color-border);
        background:var(--color-bg-muted);cursor:pointer;font-family:inherit;
        font-size:0.75rem;font-weight:500;min-width:64px;transition:all .15s
      " onmouseover="this.style.background='var(--color-primary)';this.style.color='white';this.style.borderColor='var(--color-primary)'"
        onmouseout="this.style.background='var(--color-bg-muted)';this.style.color='';this.style.borderColor='var(--color-border)'">
        <span style="font-size:1.25rem">${a.icon}</span>
        ${a.label}
      </button>
    `).join('') + `
      <button id="btn-close-rel-bar" style="
        padding:8px 12px;border-radius:12px;border:none;background:transparent;
        cursor:pointer;font-size:1.1rem;color:var(--color-text-muted)
      ">×</button>
    `;

    bar.querySelectorAll('[data-rel]').forEach(btn => {
      btn.onclick = () => this.quickAddRelative(person, btn.dataset.rel);
    });
    document.getElementById('btn-close-rel-bar').onclick = () => bar.remove();
  }

  /** Quick-add a relative from the bar */
  async quickAddRelative(basePerson, relKey) {
    if (!this.currentProject) return;

    const defaults = {
      father:   { firstName: 'پدر', gender: 'male', type: 'father' },
      mother:   { firstName: 'مادر', gender: 'female', type: 'mother' },
      spouse:   { firstName: 'همسر', gender: basePerson.gender === 'male' ? 'female' : 'male', type: 'spouse' },
      brother:  { firstName: 'برادر', gender: 'male', type: 'brother' },
      sister:   { firstName: 'خواهر', gender: 'female', type: 'sister' },
      son:      { firstName: 'پسر', gender: 'male', type: 'son' },
      daughter: { firstName: 'دختر', gender: 'female', type: 'daughter' }
    };

    const def = defaults[relKey];
    if (!def) return;

    this._pushHistory();

    const newPerson = {
      id: Utils.uid(),
      projectId: this.currentProject.id,
      firstName: def.firstName,
      lastName: basePerson.lastName || '',
      gender: def.gender,
      birthDate: '',
      deathDate: '',
      confidence: 'certain'
    };
    await db.savePerson(newPerson);
    this.people.push(newPerson);

    // Build relationship in correct direction
    let fromId, toId, type;
    if (relKey === 'father' || relKey === 'mother') {
      fromId = newPerson.id;   // parent
      toId = basePerson.id;    // child
      type = relKey;
    } else if (relKey === 'son' || relKey === 'daughter') {
      fromId = basePerson.id;  // parent
      toId = newPerson.id;     // child
      type = relKey;
    } else if (relKey === 'spouse') {
      fromId = basePerson.id;
      toId = newPerson.id;
      type = 'spouse';
    } else {
      // brother / sister — link as sibling (same generation)
      fromId = basePerson.id;
      toId = newPerson.id;
      type = relKey;
    }

    const rel = {
      id: Utils.uid(),
      projectId: this.currentProject.id,
      type,
      fromId,
      toId
    };
    await db.saveRelationship(rel);
    this.relationships.push(rel);

    await db.saveProject(this.currentProject);
    this._refreshAll();
    setTimeout(() => this.renderer.fit(), 80);

    // Open edit form so user can fill real name
    this.openPersonForm(newPerson);
    this.toast(`${def.firstName} اضافه شد — نام واقعی را وارد کن`, 'success');
  }

  async createProject() {
    const name = document.getElementById('project-name').value.trim();
    if (!name) {
      this.toast('نام پروژه الزامی است', 'error');
      return;
    }
    const theme = document.querySelector('#project-theme-picker .theme-swatch.active')?.dataset.theme || 'forest';
    const project = {
      id: Utils.uid(),
      name,
      description: document.getElementById('project-desc').value.trim(),
      theme,
      createdAt: Utils.now(),
      updatedAt: Utils.now()
    };
    await db.saveProject(project);
    this.closeModal('modal-project');
    document.getElementById('project-name').value = '';
    document.getElementById('project-desc').value = '';
    document.documentElement.setAttribute('data-theme', theme);
    await this.loadProject(project.id);
    this.toast('پروژه ایجاد شد', 'success');
  }

  _refreshPeopleList() {
    const list = document.getElementById('people-list');
    const countEl = document.getElementById('people-count');
    if (!list) return;
    list.innerHTML = '';
    let filtered = this.people;
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const hay = [p.firstName, p.lastName, p.nickname, p.birthPlace, p.occupation, p.bio].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    if (this.currentFilter === 'male') filtered = filtered.filter(p => p.gender === 'male');
    if (this.currentFilter === 'female') filtered = filtered.filter(p => p.gender === 'female');
    if (this.currentFilter === 'living') filtered = filtered.filter(p => Utils.isLiving(p));
    if (this.currentFilter === 'deceased') filtered = filtered.filter(p => !Utils.isLiving(p));
    if (countEl) countEl.textContent = this.people.length;
    filtered.forEach(p => {
      const el = document.createElement('div');
      el.className = 'person-item' + (p.id === this.profilePersonId ? ' selected' : '');
      el.innerHTML = `
        <div class="avatar">${p.photo ? `<img src="${p.photo}">` : Utils.initials(p)}</div>
        <div class="info">
          <div class="name">${Utils.escapeHtml(Utils.fullName(p))}</div>
          <div class="meta">${Utils.escapeHtml(Utils.dates(p))}</div>
        </div>`;
      el.onclick = () => this.openInspector(p);
      list.appendChild(el);
    });
  }

  openPersonForm(person = null) {
    this.editingPersonId = person ? person.id : null;
    document.getElementById('person-modal-title').textContent = person ? 'ویرایش فرد' : 'افزودن فرد جدید';
    const map = {
      'p-firstName': 'firstName', 'p-lastName': 'lastName', 'p-nickname': 'nickname',
      'p-gender': 'gender', 'p-birthDate': 'birthDate', 'p-birthPlace': 'birthPlace',
      'p-deathDate': 'deathDate', 'p-deathPlace': 'deathPlace', 'p-occupation': 'occupation',
      'p-education': 'education', 'p-residence': 'residence', 'p-confidence': 'confidence',
      'p-bio': 'bio', 'p-privateNotes': 'privateNotes'
    };
    Object.entries(map).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') el.value = person?.[key] || (key === 'gender' ? 'male' : key === 'confidence' ? 'certain' : '');
      else el.value = person?.[key] || '';
    });
    const preview = document.getElementById('avatar-preview');
    if (person?.photo) preview.innerHTML = `<img src="${person.photo}">`;
    else preview.innerHTML = `<span id="avatar-initials">${person ? Utils.initials(person) : '؟'}</span>`;
    document.getElementById('btn-delete-person').classList.toggle('hidden', !person);
    this.openModal('modal-person');
  }

  async savePerson() {
    if (!this.currentProject) { this.toast('ابتدا پروژه بسازید', 'error'); return; }
    const firstName = document.getElementById('p-firstName').value.trim();
    if (!firstName) { this.toast('نام الزامی است', 'error'); return; }
    this._pushHistory();
    const person = {
      id: this.editingPersonId || Utils.uid(),
      projectId: this.currentProject.id,
      firstName,
      lastName: document.getElementById('p-lastName').value.trim(),
      nickname: document.getElementById('p-nickname').value.trim(),
      gender: document.getElementById('p-gender').value,
      birthDate: document.getElementById('p-birthDate').value.trim(),
      birthPlace: document.getElementById('p-birthPlace').value.trim(),
      deathDate: document.getElementById('p-deathDate').value.trim(),
      deathPlace: document.getElementById('p-deathPlace').value.trim(),
      occupation: document.getElementById('p-occupation').value.trim(),
      education: document.getElementById('p-education').value.trim(),
      residence: document.getElementById('p-residence').value.trim(),
      confidence: document.getElementById('p-confidence').value,
      bio: document.getElementById('p-bio').value.trim(),
      privateNotes: document.getElementById('p-privateNotes').value.trim(),
      photo: this._pendingPhoto || (this.editingPersonId ? this.people.find(p => p.id === this.editingPersonId)?.photo : null)
    };
    await db.savePerson(person);
    await db.saveProject(this.currentProject);
    const idx = this.people.findIndex(p => p.id === person.id);
    if (idx >= 0) this.people[idx] = person; else this.people.push(person);
    this._pendingPhoto = null;
    this.closeModal('modal-person');
    this._refreshAll();
    this.toast(this.editingPersonId ? 'فرد ویرایش شد' : 'فرد اضافه شد', 'success');
  }

  async deletePerson(id) {
    if (!id) id = this.editingPersonId || this.profilePersonId;
    if (!id) return;
    if (!confirm('این فرد و تمام روابط مرتبط حذف می‌شوند. ادامه می‌دهید؟')) return;
    this._pushHistory();
    await db.deletePerson(id);
    this.people = this.people.filter(p => p.id !== id);
    this.relationships = this.relationships.filter(r => r.fromId !== id && r.toId !== id);
    this.closeModal('modal-person');
    this.closeInspector();
    this._refreshAll();
    this.toast('فرد حذف شد', 'success');
  }

  openRelationForm(fromPerson) {
    this.profilePersonId = fromPerson.id;
    document.getElementById('rel-from-display').textContent = Utils.fullName(fromPerson);
    const select = document.getElementById('rel-to');
    select.innerHTML = '';
    this.people.filter(p => p.id !== fromPerson.id).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = Utils.fullName(p);
      select.appendChild(opt);
    });
    if (select.options.length === 0) { this.toast('فرد دیگری وجود ندارد', 'error'); return; }
    this.openModal('modal-relation');
  }

  async saveRelation() {
    const type = document.getElementById('rel-type').value;
    const toId = document.getElementById('rel-to').value;
    if (!toId || !this.profilePersonId) return;
    this._pushHistory();
    let fromId = this.profilePersonId;
    let toIdFinal = toId;
    let relType = type;
    if (type === 'father' || type === 'mother') {
      fromId = toId;
      toIdFinal = this.profilePersonId;
      relType = type;
    }
    const rel = {
      id: Utils.uid(),
      projectId: this.currentProject.id,
      type: relType,
      fromId,
      toId: toIdFinal,
      startDate: document.getElementById('rel-start').value.trim(),
      endDate: document.getElementById('rel-end').value.trim()
    };
    await db.saveRelationship(rel);
    this.relationships.push(rel);
    this.closeModal('modal-relation');
    this._refreshAll();
    const person = this.people.find(p => p.id === this.profilePersonId);
    if (person) this.openInspector(person);
    this.toast('رابطه ثبت شد', 'success');
  }

  openInspector(person) {
    this.profilePersonId = person.id;
    this.renderer.select(person.id);
    document.getElementById('inspector').classList.remove('hidden');
    document.getElementById('inspector-title').textContent = Utils.fullName(person);
    const parents = [], children = [], spouses = [], siblings = [];
    this.relationships.forEach(rel => {
      if (['father', 'mother', 'parent'].includes(rel.type)) {
        if (rel.toId === person.id) {
          const p = this.people.find(x => x.id === rel.fromId);
          if (p) parents.push({ person: p });
        }
        if (rel.fromId === person.id) {
          const c = this.people.find(x => x.id === rel.toId);
          if (c) children.push({ person: c });
        }
      }
      if (['son', 'daughter', 'child', 'adopted-child'].includes(rel.type)) {
        if (rel.fromId === person.id) {
          const c = this.people.find(x => x.id === rel.toId);
          if (c) children.push({ person: c });
        }
      }
      if (['spouse', 'ex-spouse'].includes(rel.type)) {
        const otherId = rel.fromId === person.id ? rel.toId : (rel.toId === person.id ? rel.fromId : null);
        if (otherId) {
          const s = this.people.find(x => x.id === otherId);
          if (s && !spouses.find(x => x.person.id === s.id)) spouses.push({ person: s });
        }
      }
      if (['brother', 'sister'].includes(rel.type)) {
        const otherId = rel.fromId === person.id ? rel.toId : (rel.toId === person.id ? rel.fromId : null);
        if (otherId) {
          const s = this.people.find(x => x.id === otherId);
          if (s) siblings.push({ person: s });
        }
      }
    });
    const chip = (item) => `<span class="rel-chip" style="display:inline-block;background:var(--color-accent-soft);color:var(--color-primary-dark);padding:4px 10px;border-radius:999px;font-size:0.8rem;margin:2px;cursor:pointer" data-id="${item.person.id}">${Utils.escapeHtml(Utils.fullName(item.person))}</span>`;
    const body = document.getElementById('inspector-body');
    body.innerHTML = `
      <div style="text-align:center;margin-bottom:20px">
        <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--color-accent),var(--color-primary));margin:0 auto 10px;display:flex;align-items:center;justify-content:center;color:white;font-size:2rem;font-weight:700;overflow:hidden">
          ${person.photo ? `<img src="${person.photo}" style="width:100%;height:100%;object-fit:cover">` : Utils.initials(person)}
        </div>
        <h2 style="font-size:1.25rem;margin-bottom:4px">${Utils.escapeHtml(Utils.fullName(person))}</h2>
        <div style="color:var(--color-text-muted);font-size:0.9rem">${Utils.escapeHtml(Utils.dates(person))}</div>
      </div>
      ${person.birthPlace ? `<div style="margin-bottom:12px"><div style="font-size:0.75rem;color:var(--color-text-muted)">محل تولد</div><div>${Utils.escapeHtml(person.birthPlace)}</div></div>` : ''}
      ${person.occupation ? `<div style="margin-bottom:12px"><div style="font-size:0.75rem;color:var(--color-text-muted)">شغل</div><div>${Utils.escapeHtml(person.occupation)}</div></div>` : ''}
      ${person.bio ? `<div style="margin-bottom:12px"><div style="font-size:0.75rem;color:var(--color-text-muted)">زندگینامه</div><div style="line-height:1.6">${Utils.escapeHtml(person.bio)}</div></div>` : ''}
      ${parents.length ? `<div style="margin-bottom:14px"><div style="font-size:0.75rem;color:var(--color-text-muted);margin-bottom:6px">والدین</div><div>${parents.map(chip).join('')}</div></div>` : ''}
      ${spouses.length ? `<div style="margin-bottom:14px"><div style="font-size:0.75rem;color:var(--color-text-muted);margin-bottom:6px">همسر</div><div>${spouses.map(chip).join('')}</div></div>` : ''}
      ${children.length ? `<div style="margin-bottom:14px"><div style="font-size:0.75rem;color:var(--color-text-muted);margin-bottom:6px">فرزندان</div><div>${children.map(chip).join('')}</div></div>` : ''}
      ${siblings.length ? `<div style="margin-bottom:14px"><div style="font-size:0.75rem;color:var(--color-text-muted);margin-bottom:6px">خواهر و برادر</div><div>${siblings.map(chip).join('')}</div></div>` : ''}
    `;
    body.querySelectorAll('.rel-chip').forEach(el => {
      el.onclick = () => {
        const p = this.people.find(x => x.id === el.dataset.id);
        if (p) this.openInspector(p);
      };
    });
    this._refreshPeopleList();
  }

  closeInspector() {
    document.getElementById('inspector').classList.add('hidden');
    this.profilePersonId = null;
    this.renderer.select(null);
    this._refreshPeopleList();
  }

  showContextMenu(person, x, y) {
    const menu = document.getElementById('context-menu');
    menu.classList.remove('hidden');
    menu.style.left = Math.min(x, window.innerWidth - 200) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - 220) + 'px';
    menu.onclick = (e) => {
      const action = e.target.dataset.action;
      if (!action) return;
      menu.classList.add('hidden');
      if (action === 'view') this.openInspector(person);
      if (action === 'edit') this.openPersonForm(person);
      if (action === 'add-child' || action === 'add-spouse' || action === 'add-parent') this.openRelationForm(person);
      if (action === 'delete') this.deletePerson(person.id);
    };
    const hide = () => { menu.classList.add('hidden'); document.removeEventListener('click', hide); };
    setTimeout(() => document.addEventListener('click', hide), 10);
  }

  switchView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('view-' + view)?.classList.add('active');
    document.querySelector(`.view-btn[data-view="${view}"]`)?.classList.add('active');
    if (view === 'list') this._renderListView();
    if (view === 'timeline') this._renderTimelineView();
  }

  _renderListView() {
    const container = document.getElementById('list-container');
    if (!container) return;
    const sort = document.getElementById('list-sort')?.value || 'name';
    let sorted = [...this.people];
    if (sort === 'name') sorted.sort((a, b) => Utils.fullName(a).localeCompare(Utils.fullName(b), 'fa'));
    if (sort === 'birth') sorted.sort((a, b) => (a.birthDate || '').localeCompare(b.birthDate || ''));
    container.innerHTML = sorted.map(p => `
      <div class="list-row" data-id="${p.id}">
        <div class="avatar" style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--color-accent),var(--color-primary));display:flex;align-items:center;justify-content:center;color:white;font-weight:600">${Utils.initials(p)}</div>
        <div style="flex:1">
          <div style="font-weight:600">${Utils.escapeHtml(Utils.fullName(p))}</div>
          <div style="font-size:0.8rem;color:var(--color-text-muted)">${Utils.escapeHtml(Utils.dates(p))} ${p.occupation ? '· ' + Utils.escapeHtml(p.occupation) : ''}</div>
        </div>
      </div>`).join('');
    container.querySelectorAll('.list-row').forEach(row => {
      row.onclick = () => {
        const p = this.people.find(x => x.id === row.dataset.id);
        if (p) this.openInspector(p);
      };
    });
  }

  _renderTimelineView() {
    const container = document.getElementById('timeline-container');
    if (!container) return;
    const events = [];
    this.people.forEach(p => {
      if (p.birthDate) events.push({ year: p.birthDate, text: `تولد ${Utils.fullName(p)}` });
      if (p.deathDate) events.push({ year: p.deathDate, text: `فوت ${Utils.fullName(p)}` });
    });
    events.sort((a, b) => String(a.year).localeCompare(String(b.year)));
    if (!events.length) {
      container.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:40px">رویدادی ثبت نشده. تاریخ تولد/فوت را وارد کنید.</p>';
      return;
    }
    container.innerHTML = events.map(e => `
      <div class="timeline-item">
        <div class="timeline-year">${Utils.escapeHtml(e.year)}</div>
        <div class="timeline-event">${Utils.escapeHtml(e.text)}</div>
      </div>`).join('');
  }

  _refreshAll() {
    this._refreshPeopleList();
    this.renderer.setData(this.people, this.relationships);
    this._updateMeta();
    this._updateUndoButtons();
    if (this.people.length === 0 && !this.currentProject) {
      this.showWelcome();
    }
  }

  _updateMeta() {
    const el = document.getElementById('project-meta');
    if (el) el.textContent = `${this.people.length} نفر · ${this.relationships.length} رابطه`;
  }

  openModal(id) { document.getElementById(id)?.classList.add('open'); }
  closeModal(id) {
    if (id) document.getElementById(id)?.classList.remove('open');
    else document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
  }

  toast(msg, type = '') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2800);
  }

  async _applySettings() {
    const theme = await db.getSetting('theme', 'forest');
    document.documentElement.setAttribute('data-theme', theme);
  }

  _bindUI() {
    document.getElementById('btn-new-project').onclick = () => this.openModal('modal-project');
    document.getElementById('btn-create-project').onclick = () => this.createProject();
    document.getElementById('btn-add-person').onclick = () => this.openPersonForm();
    document.getElementById('btn-add-person-sidebar').onclick = () => this.openPersonForm();
    document.getElementById('btn-save-person').onclick = () => this.savePerson();
    document.getElementById('btn-delete-person').onclick = () => this.deletePerson();
    document.getElementById('btn-upload-photo').onclick = () => document.getElementById('photo-input').click();
    document.getElementById('photo-input').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        this._pendingPhoto = ev.target.result;
        document.getElementById('avatar-preview').innerHTML = `<img src="${ev.target.result}">`;
      };
      reader.readAsDataURL(file);
    };
    document.getElementById('btn-add-relation').onclick = () => {
      const p = this.people.find(x => x.id === this.profilePersonId);
      if (p) this.openRelationForm(p);
    };
    document.getElementById('btn-save-relation').onclick = () => this.saveRelation();
    document.getElementById('btn-edit-from-inspector').onclick = () => {
      const p = this.people.find(x => x.id === this.profilePersonId);
      if (p) { this.closeInspector(); this.openPersonForm(p); }
    };
    document.getElementById('btn-close-inspector').onclick = () => this.closeInspector();
    document.getElementById('global-search').oninput = Utils.debounce((e) => {
      this.searchQuery = e.target.value;
      this._refreshPeopleList();
    }, 150);
    document.querySelectorAll('#filter-chips .chip').forEach(chip => {
      chip.onclick = () => {
        document.querySelectorAll('#filter-chips .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentFilter = chip.dataset.filter;
        this._refreshPeopleList();
      };
    });
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.onclick = () => this.switchView(btn.dataset.view);
    });
    document.getElementById('btn-zoom-in').onclick = () => this.renderer.zoomIn();
    document.getElementById('btn-zoom-out').onclick = () => this.renderer.zoomOut();
    document.getElementById('btn-fit').onclick = () => this.renderer.fit();
    document.getElementById('btn-undo').onclick = async () => {
      const state = this.history.undo();
      if (state) await this._restore(state);
    };
    document.getElementById('btn-redo').onclick = async () => {
      const state = this.history.redo();
      if (state) await this._restore(state);
    };
    document.getElementById('btn-stats').onclick = () => {
      this.stats.render(document.getElementById('stats-body'));
      this.openModal('modal-stats');
    };
    document.getElementById('btn-export').onclick = () => this.openModal('modal-export');
    document.querySelectorAll('.export-option').forEach(btn => {
      btn.onclick = () => {
        const type = btn.dataset.export;
        this.closeModal('modal-export');
        if (type === 'pdf-tree') this.exporter.exportPDFTree();
        else if (type === 'png') this.exporter.exportPNG();
        else if (type === 'html') this.exporter.exportHTML();
        else if (type === 'json') this.exporter.exportJSON();
        else if (type === 'gedcom') this.exporter.exportGEDCOM();
        else this.toast('این خروجی در نسخه بعدی اضافه می‌شود');
      };
    });
    document.getElementById('btn-settings').onclick = () => this.openModal('modal-settings');
    document.querySelectorAll('#settings-theme-picker .theme-swatch, #project-theme-picker .theme-swatch').forEach(sw => {
      sw.onclick = () => {
        const parent = sw.parentElement;
        parent.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        if (parent.id === 'settings-theme-picker') {
          document.documentElement.setAttribute('data-theme', sw.dataset.theme);
          db.setSetting('theme', sw.dataset.theme);
        }
      };
    });
    document.getElementById('btn-download-backup').onclick = () => this.exporter.exportJSON();
    document.getElementById('btn-import-backup').onclick = () => document.getElementById('import-file').click();
    document.getElementById('import-file').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const data = Utils.parseJSON(text);
      if (!data) { this.toast('فایل نامعتبر', 'error'); return; }
      await db.importAll(data);
      this.toast('پشتیبان وارد شد', 'success');
      location.reload();
    };
    document.getElementById('btn-reset-all').onclick = async () => {
      if (!confirm('تمام داده‌ها پاک می‌شوند. مطمئن هستید؟')) return;
      await db.clearAll();
      location.reload();
    };
    document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
      el.onclick = () => this.closeModal();
    });
    const listSort = document.getElementById('list-sort');
    if (listSort) listSort.onchange = () => this._renderListView();
  }

  _bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        this.closeInspector();
        document.getElementById('context-menu').classList.add('hidden');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        document.getElementById('btn-undo').click();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        document.getElementById('btn-redo').click();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search').focus();
      }
    });
  }
}

const app = new ShajarehApp();
document.addEventListener('DOMContentLoaded', () => app.init());
window.app = app;

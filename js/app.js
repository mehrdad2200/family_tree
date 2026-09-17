/**
 * شجره‌نامه - Main Application
 * Complete family tree management system
 */

class ShajarehApp {
  constructor() {
    this.currentProject = null;
    this.people = [];
    this.relationships = [];
    this.tree = null;
    this.exporter = null;
    this.editingPersonId = null;
    this.profilePersonId = null;
  }

  async init() {
    try {
      await db.init();
      
      this.tree = new TreeRenderer(document.getElementById('tree-container'));
      this.tree.onPersonClick = (person) => this.openProfile(person);
      
      this.exporter = new Exporter(this);
      
      this._bindEvents();
      await this._loadProjects();
      this._applySettings();
      
      // Hide loading
      document.getElementById('loading-screen').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      
      // If no projects, prompt to create one
      const projects = await db.getAllProjects();
      if (projects.length === 0) {
        this.openModal('modal-new-project');
      } else {
        // Load most recent
        projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        await this.loadProject(projects[0].id);
      }
    } catch (err) {
      console.error('Init error:', err);
      alert('خطا در راه‌اندازی برنامه. لطفاً صفحه را رفرش کنید.');
    }
  }

  // ---------- Projects ----------
  async _loadProjects() {
    const projects = await db.getAllProjects();
    const list = document.getElementById('project-list');
    list.innerHTML = '';
    
    projects
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .forEach(p => {
        const el = document.createElement('div');
        el.className = 'project-item' + (this.currentProject?.id === p.id ? ' active' : '');
        el.textContent = p.name;
        el.onclick = () => this.loadProject(p.id);
        list.appendChild(el);
      });
  }

  async loadProject(id) {
    this.currentProject = await db.getProject(id);
    if (!this.currentProject) return;

    this.people = await db.getPeopleByProject(id);
    this.relationships = await db.getRelationshipsByProject(id);

    document.getElementById('current-project-name').textContent = this.currentProject.name;
    document.getElementById('project-stats').textContent = 
      `${this.people.length} نفر · ${this.relationships.length} رابطه`;

    this._renderPeopleList();
    this.tree.setData(this.people, this.relationships);
    this._updateEmptyState();
    await this._loadProjects();
    
    setTimeout(() => this.tree.fitToView(), 100);
  }

  async createProject() {
    const name = document.getElementById('input-project-name').value.trim();
    const desc = document.getElementById('input-project-desc').value.trim();
    
    if (!name) {
      this.toast('نام پروژه الزامی است');
      return;
    }

    const project = {
      id: generateId(),
      name,
      description: desc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.saveProject(project);
    this.closeModal('modal-new-project');
    document.getElementById('input-project-name').value = '';
    document.getElementById('input-project-desc').value = '';
    
    await this.loadProject(project.id);
    this.toast('پروژه ایجاد شد');
  }

  // ---------- People ----------
  _renderPeopleList(filter = '') {
    const list = document.getElementById('people-list');
    const count = document.getElementById('people-count');
    list.innerHTML = '';
    
    let filtered = this.people;
    if (filter) {
      const q = filter.toLowerCase();
      filtered = this.people.filter(p => {
        const name = [p.firstName, p.lastName, p.nickname].filter(Boolean).join(' ').toLowerCase();
        return name.includes(q);
      });
    }

    count.textContent = this.people.length;

    filtered.forEach(p => {
      const el = document.createElement('div');
      el.className = 'person-item';
      const initials = (p.firstName || '?').charAt(0);
      const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ');
      const dates = [p.birthDate, p.deathDate].filter(Boolean).join(' – ');
      
      el.innerHTML = `
        <div class="avatar">${initials}</div>
        <div class="info">
          <div class="name">${fullName || 'بدون نام'}</div>
          ${dates ? `<div class="meta">${dates}</div>` : ''}
        </div>
      `;
      el.onclick = () => this.openProfile(p);
      list.appendChild(el);
    });
  }

  openPersonForm(person = null) {
    this.editingPersonId = person ? person.id : null;
    document.getElementById('person-modal-title').textContent = 
      person ? 'ویرایش فرد' : 'افزودن فرد جدید';
    
    document.getElementById('person-first-name').value = person?.firstName || '';
    document.getElementById('person-last-name').value = person?.lastName || '';
    document.getElementById('person-nickname').value = person?.nickname || '';
    document.getElementById('person-gender').value = person?.gender || 'male';
    document.getElementById('person-birth-date').value = person?.birthDate || '';
    document.getElementById('person-birth-place').value = person?.birthPlace || '';
    document.getElementById('person-death-date').value = person?.deathDate || '';
    document.getElementById('person-death-place').value = person?.deathPlace || '';
    document.getElementById('person-occupation').value = person?.occupation || '';
    document.getElementById('person-bio').value = person?.bio || '';
    document.getElementById('person-confidence').value = person?.confidence || 'certain';
    
    const deleteBtn = document.getElementById('btn-delete-person');
    if (person) {
      deleteBtn.classList.remove('hidden');
    } else {
      deleteBtn.classList.add('hidden');
    }
    
    this.openModal('modal-person');
  }

  async savePerson() {
    if (!this.currentProject) {
      this.toast('ابتدا یک پروژه انتخاب کنید');
      return;
    }

    const firstName = document.getElementById('person-first-name').value.trim();
    if (!firstName) {
      this.toast('نام الزامی است');
      return;
    }

    const person = {
      id: this.editingPersonId || generateId(),
      projectId: this.currentProject.id,
      firstName,
      lastName: document.getElementById('person-last-name').value.trim(),
      nickname: document.getElementById('person-nickname').value.trim(),
      gender: document.getElementById('person-gender').value,
      birthDate: document.getElementById('person-birth-date').value.trim(),
      birthPlace: document.getElementById('person-birth-place').value.trim(),
      deathDate: document.getElementById('person-death-date').value.trim(),
      deathPlace: document.getElementById('person-death-place').value.trim(),
      occupation: document.getElementById('person-occupation').value.trim(),
      bio: document.getElementById('person-bio').value.trim(),
      confidence: document.getElementById('person-confidence').value
    };

    await db.savePerson(person);
    
    // Update local
    const idx = this.people.findIndex(p => p.id === person.id);
    if (idx >= 0) {
      this.people[idx] = person;
    } else {
      this.people.push(person);
    }

    await db.saveProject(this.currentProject); // touch updatedAt
    this.closeModal('modal-person');
    this._renderPeopleList();
    this.tree.setData(this.people, this.relationships);
    this._updateEmptyState();
    this._updateStats();
    this.toast(this.editingPersonId ? 'فرد ویرایش شد' : 'فرد اضافه شد');
  }

  async deletePerson() {
    if (!this.editingPersonId) return;
    if (!confirm('آیا از حذف این فرد مطمئن هستید؟ روابط مرتبط هم حذف می‌شوند.')) return;

    await db.deletePerson(this.editingPersonId);
    this.people = this.people.filter(p => p.id !== this.editingPersonId);
    this.relationships = this.relationships.filter(
      r => r.fromId !== this.editingPersonId && r.toId !== this.editingPersonId
    );
    
    this.closeModal('modal-person');
    this.closeModal('modal-profile');
    this._renderPeopleList();
    this.tree.setData(this.people, this.relationships);
    this._updateEmptyState();
    this._updateStats();
    this.toast('فرد حذف شد');
  }

  // ---------- Relationships ----------
  openRelationshipForm() {
    if (!this.profilePersonId) return;
    
    const select = document.getElementById('rel-person');
    select.innerHTML = '';
    
    this.people
      .filter(p => p.id !== this.profilePersonId)
      .forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = [p.firstName, p.lastName].filter(Boolean).join(' ');
        select.appendChild(opt);
      });

    if (select.options.length === 0) {
      this.toast('فرد دیگری برای ایجاد رابطه وجود ندارد');
      return;
    }

    this.openModal('modal-relationship');
  }

  async saveRelationship() {
    const type = document.getElementById('rel-type').value;
    const otherId = document.getElementById('rel-person').value;
    const parentType = document.getElementById('rel-parent-type').value;

    if (!otherId || !this.profilePersonId) return;

    let fromId, toId, relType;

    if (type === 'parent') {
      // Current person is child, selected is parent
      fromId = otherId;
      toId = this.profilePersonId;
      relType = 'parent';
    } else if (type === 'child') {
      // Current person is parent, selected is child
      fromId = this.profilePersonId;
      toId = otherId;
      relType = 'parent';
    } else if (type === 'spouse') {
      fromId = this.profilePersonId;
      toId = otherId;
      relType = 'spouse';
    } else if (type === 'sibling') {
      // For simplicity, we create a sibling relation as shared parent later
      // For now store as sibling
      fromId = this.profilePersonId;
      toId = otherId;
      relType = 'sibling';
    }

    const rel = {
      id: generateId(),
      projectId: this.currentProject.id,
      type: relType,
      fromId,
      toId,
      parentRole: type === 'parent' ? parentType : null
    };

    await db.saveRelationship(rel);
    this.relationships.push(rel);
    
    this.closeModal('modal-relationship');
    this.tree.setData(this.people, this.relationships);
    this._updateStats();
    
    // Refresh profile if open
    const person = this.people.find(p => p.id === this.profilePersonId);
    if (person) this.openProfile(person);
    
    this.toast('رابطه اضافه شد');
  }

  // ---------- Profile ----------
  openProfile(person) {
    this.profilePersonId = person.id;
    this.tree.select(person.id);
    
    const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ');
    document.getElementById('profile-name').textContent = fullName || 'بدون نام';
    
    const initials = (person.firstName || '?').charAt(0);
    const dates = [person.birthDate, person.deathDate].filter(Boolean).join(' – ');
    
    // Find relations
    const parents = [];
    const children = [];
    const spouses = [];
    const siblings = [];

    this.relationships.forEach(rel => {
      if (rel.type === 'parent') {
        if (rel.toId === person.id) {
          const p = this.people.find(x => x.id === rel.fromId);
          if (p) parents.push(p);
        }
        if (rel.fromId === person.id) {
          const c = this.people.find(x => x.id === rel.toId);
          if (c) children.push(c);
        }
      }
      if (rel.type === 'spouse') {
        if (rel.fromId === person.id) {
          const s = this.people.find(x => x.id === rel.toId);
          if (s) spouses.push(s);
        }
        if (rel.toId === person.id) {
          const s = this.people.find(x => x.id === rel.fromId);
          if (s) spouses.push(s);
        }
      }
      if (rel.type === 'sibling') {
        if (rel.fromId === person.id || rel.toId === person.id) {
          const otherId = rel.fromId === person.id ? rel.toId : rel.fromId;
          const s = this.people.find(x => x.id === otherId);
          if (s) siblings.push(s);
        }
      }
    });

    const chip = (p) => {
      const name = [p.firstName, p.lastName].filter(Boolean).join(' ');
      return `<span class="rel-chip" data-id="${p.id}">${name}</span>`;
    };

    document.getElementById('profile-content').innerHTML = `
      <div class="profile-header">
        <div class="profile-avatar">${initials}</div>
        <div class="profile-info">
          <h2>${fullName || 'بدون نام'}</h2>
          <div class="dates">${dates || 'تاریخ نامشخص'}</div>
          ${person.gender === 'male' ? 'مرد' : person.gender === 'female' ? 'زن' : 'نامشخص'}
        </div>
      </div>
      
      ${person.birthPlace ? `<div class="profile-section"><h4>محل تولد</h4><p>${person.birthPlace}</p></div>` : ''}
      ${person.occupation ? `<div class="profile-section"><h4>شغل</h4><p>${person.occupation}</p></div>` : ''}
      ${person.bio ? `<div class="profile-section"><h4>زندگینامه</h4><p>${person.bio}</p></div>` : ''}
      
      ${parents.length ? `<div class="profile-section"><h4>والدین</h4><div class="profile-relations">${parents.map(chip).join('')}</div></div>` : ''}
      ${spouses.length ? `<div class="profile-section"><h4>همسر</h4><div class="profile-relations">${spouses.map(chip).join('')}</div></div>` : ''}
      ${children.length ? `<div class="profile-section"><h4>فرزندان</h4><div class="profile-relations">${children.map(chip).join('')}</div></div>` : ''}
      ${siblings.length ? `<div class="profile-section"><h4>خواهر و برادر</h4><div class="profile-relations">${siblings.map(chip).join('')}</div></div>` : ''}
    `;

    // Chip clicks
    document.querySelectorAll('.rel-chip').forEach(el => {
      el.onclick = () => {
        const p = this.people.find(x => x.id === el.dataset.id);
        if (p) this.openProfile(p);
      };
    });

    this.openModal('modal-profile');
  }

  // ---------- UI Helpers ----------
  openModal(id) {
    document.getElementById(id).classList.add('open');
  }

  closeModal(id) {
    if (id) {
      document.getElementById(id).classList.remove('open');
    } else {
      document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    }
  }

  toast(message) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2800);
  }

  _updateEmptyState() {
    const empty = document.getElementById('empty-state');
    if (this.people.length === 0) {
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
    }
  }

  _updateStats() {
    document.getElementById('project-stats').textContent = 
      `${this.people.length} نفر · ${this.relationships.length} رابطه`;
  }

  _applySettings() {
    db.getSetting('theme', 'green').then(theme => {
      document.documentElement.setAttribute('data-theme', theme);
      const sel = document.getElementById('setting-theme');
      if (sel) sel.value = theme;
    });
    db.getSetting('font', 'Vazirmatn').then(font => {
      document.documentElement.style.setProperty('--font', `'${font}', Tahoma, sans-serif`);
      const sel = document.getElementById('setting-font');
      if (sel) sel.value = font;
    });
  }

  // ---------- Events ----------
  _bindEvents() {
    // New project
    document.getElementById('btn-new-project').onclick = () => this.openModal('modal-new-project');
    document.getElementById('btn-create-project').onclick = () => this.createProject();

    // Add person
    document.getElementById('btn-add-person').onclick = () => this.openPersonForm();
    document.getElementById('btn-empty-add').onclick = () => this.openPersonForm();
    document.getElementById('btn-save-person').onclick = () => this.savePerson();
    document.getElementById('btn-delete-person').onclick = () => this.deletePerson();

    // Profile actions
    document.getElementById('btn-edit-person').onclick = () => {
      const person = this.people.find(p => p.id === this.profilePersonId);
      if (person) {
        this.closeModal('modal-profile');
        this.openPersonForm(person);
      }
    };
    document.getElementById('btn-add-rel').onclick = () => {
      this.closeModal('modal-profile');
      this.openRelationshipForm();
    };
    document.getElementById('btn-save-relationship').onclick = () => this.saveRelationship();

    // Search
    document.getElementById('search-people').oninput = (e) => {
      this._renderPeopleList(e.target.value);
    };

    // Tree controls
    document.getElementById('btn-zoom-in').onclick = () => this.tree.zoomIn();
    document.getElementById('btn-zoom-out').onclick = () => this.tree.zoomOut();
    document.getElementById('btn-reset-view').onclick = () => this.tree.resetView();
    document.getElementById('btn-zoom-fit').onclick = () => this.tree.fitToView();

    // View mode
    document.querySelectorAll('.view-mode .btn-icon').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.view-mode .btn-icon').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.tree.setMode(btn.dataset.mode);
      };
    });

    // Export
    document.getElementById('btn-export-menu').onclick = () => this.openModal('modal-export');
    document.querySelectorAll('.export-card').forEach(card => {
      card.onclick = () => {
        const type = card.dataset.type;
        this.closeModal('modal-export');
        if (type === 'pdf') this.exporter.exportPDF();
        else if (type === 'png') this.exporter.exportPNG();
        else if (type === 'html') this.exporter.exportHTML();
        else if (type === 'json') this.exporter.exportJSON();
      };
    });

    // Settings
    document.getElementById('btn-settings').onclick = () => this.openModal('modal-settings');
    document.getElementById('setting-theme').onchange = (e) => {
      document.documentElement.setAttribute('data-theme', e.target.value);
      db.setSetting('theme', e.target.value);
    };
    document.getElementById('setting-font').onchange = (e) => {
      document.documentElement.style.setProperty('--font', `'${e.target.value}', Tahoma, sans-serif`);
      db.setSetting('font', e.target.value);
    };
    document.getElementById('btn-export-json').onclick = () => this.exporter.exportJSON();
    document.getElementById('btn-clear-data').onclick = async () => {
      if (!confirm('تمام داده‌ها برای همیشه پاک می‌شوند. مطمئن هستید؟')) return;
      await db.clearAll();
      this.currentProject = null;
      this.people = [];
      this.relationships = [];
      location.reload();
    };

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.onclick = () => this.closeModal();
    });

    // Close modal on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal(modal.id);
      });
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  }
}

// Start
const app = new ShajarehApp();
document.addEventListener('DOMContentLoaded', () => app.init());

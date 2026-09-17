/**
 * شجره‌نامه — IndexedDB Database Layer
 * Offline-first persistent storage
 */

const DB_NAME = 'ShajarehProDB';
const DB_VERSION = 2;

class Database {
  constructor() {
    this.db = null;
    this.ready = false;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onerror = () => reject(req.error);

      req.onsuccess = () => {
        this.db = req.result;
        this.ready = true;
        resolve(this.db);
      };

      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        if (!db.objectStoreNames.contains('projects')) {
          const s = db.createObjectStore('projects', { keyPath: 'id' });
          s.createIndex('updatedAt', 'updatedAt');
        }

        if (!db.objectStoreNames.contains('people')) {
          const s = db.createObjectStore('people', { keyPath: 'id' });
          s.createIndex('projectId', 'projectId');
          s.createIndex('firstName', 'firstName');
        }

        if (!db.objectStoreNames.contains('relationships')) {
          const s = db.createObjectStore('relationships', { keyPath: 'id' });
          s.createIndex('projectId', 'projectId');
          s.createIndex('fromId', 'fromId');
          s.createIndex('toId', 'toId');
        }

        if (!db.objectStoreNames.contains('events')) {
          const s = db.createObjectStore('events', { keyPath: 'id' });
          s.createIndex('personId', 'personId');
          s.createIndex('projectId', 'projectId');
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('media')) {
          const s = db.createObjectStore('media', { keyPath: 'id' });
          s.createIndex('personId', 'personId');
        }
      };
    });
  }

  // Generic helpers
  _tx(store, mode = 'readonly') {
    return this.db.transaction(store, mode).objectStore(store);
  }

  _req(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(store, key) {
    return this._req(this._tx(store).get(key));
  }

  async getAll(store) {
    return this._req(this._tx(store).getAll()) || [];
  }

  async getByIndex(store, index, value) {
    return this._req(this._tx(store).index(index).getAll(value)) || [];
  }

  async put(store, data) {
    return this._req(this._tx(store, 'readwrite').put(data));
  }

  async delete(store, key) {
    return this._req(this._tx(store, 'readwrite').delete(key));
  }

  async clear(store) {
    return this._req(this._tx(store, 'readwrite').clear());
  }

  // Projects
  async getProjects() {
    const list = await this.getAll('projects');
    return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  async getProject(id) {
    return this.get('projects', id);
  }

  async saveProject(project) {
    project.updatedAt = Utils.now();
    if (!project.createdAt) project.createdAt = project.updatedAt;
    await this.put('projects', project);
    return project;
  }

  async deleteProject(id) {
    const people = await this.getPeople(id);
    const rels = await this.getRelationships(id);
    const events = await this.getByIndex('events', 'projectId', id);

    const tx = this.db.transaction(['projects', 'people', 'relationships', 'events', 'media'], 'readwrite');
    tx.objectStore('projects').delete(id);
    people.forEach(p => tx.objectStore('people').delete(p.id));
    rels.forEach(r => tx.objectStore('relationships').delete(r.id));
    events.forEach(e => tx.objectStore('events').delete(e.id));

    return new Promise((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }

  // People
  async getPeople(projectId) {
    return this.getByIndex('people', 'projectId', projectId);
  }

  async getPerson(id) {
    return this.get('people', id);
  }

  async savePerson(person) {
    person.updatedAt = Utils.now();
    if (!person.createdAt) person.createdAt = person.updatedAt;
    await this.put('people', person);
    return person;
  }

  async deletePerson(id) {
    const allRels = await this.getAll('relationships');
    const toRemove = allRels.filter(r => r.fromId === id || r.toId === id);
    const events = await this.getByIndex('events', 'personId', id);

    const tx = this.db.transaction(['people', 'relationships', 'events', 'media'], 'readwrite');
    tx.objectStore('people').delete(id);
    toRemove.forEach(r => tx.objectStore('relationships').delete(r.id));
    events.forEach(e => tx.objectStore('events').delete(e.id));

    return new Promise((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }

  // Relationships
  async getRelationships(projectId) {
    return this.getByIndex('relationships', 'projectId', projectId);
  }

  async saveRelationship(rel) {
    if (!rel.createdAt) rel.createdAt = Utils.now();
    await this.put('relationships', rel);
    return rel;
  }

  async deleteRelationship(id) {
    return this.delete('relationships', id);
  }

  // Events / Timeline
  async getEvents(personId) {
    return this.getByIndex('events', 'personId', personId);
  }

  async saveEvent(event) {
    if (!event.createdAt) event.createdAt = Utils.now();
    await this.put('events', event);
    return event;
  }

  // Settings
  async getSetting(key, def = null) {
    const row = await this.get('settings', key);
    return row ? row.value : def;
  }

  async setSetting(key, value) {
    return this.put('settings', { key, value });
  }

  // Full export / import
  async exportAll() {
    return {
      version: 2,
      exportedAt: Utils.now(),
      projects: await this.getAll('projects'),
      people: await this.getAll('people'),
      relationships: await this.getAll('relationships'),
      events: await this.getAll('events'),
      settings: await this.getAll('settings')
    };
  }

  async importAll(data) {
    if (!data || !data.projects) throw new Error('Invalid backup');

    const stores = ['projects', 'people', 'relationships', 'events', 'settings'];
    const tx = this.db.transaction(stores, 'readwrite');

    for (const s of stores) {
      tx.objectStore(s).clear();
    }

    (data.projects || []).forEach(p => tx.objectStore('projects').put(p));
    (data.people || []).forEach(p => tx.objectStore('people').put(p));
    (data.relationships || []).forEach(r => tx.objectStore('relationships').put(r));
    (data.events || []).forEach(e => tx.objectStore('events').put(e));
    (data.settings || []).forEach(s => tx.objectStore('settings').put(s));

    return new Promise((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }

  async clearAll() {
    const stores = ['projects', 'people', 'relationships', 'events', 'settings', 'media'];
    const tx = this.db.transaction(stores, 'readwrite');
    stores.forEach(s => {
      if (this.db.objectStoreNames.contains(s)) tx.objectStore(s).clear();
    });
    return new Promise((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }
}

window.db = new Database();

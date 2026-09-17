/**
 * شجره‌نامه - Database Layer
 * Pure IndexedDB implementation for offline-first storage
 */

const DB_NAME = 'ShajarehDB';
const DB_VERSION = 1;

class FamilyDB {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Projects store
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('name', 'name', { unique: false });
          projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // People store
        if (!db.objectStoreNames.contains('people')) {
          const peopleStore = db.createObjectStore('people', { keyPath: 'id' });
          peopleStore.createIndex('projectId', 'projectId', { unique: false });
          peopleStore.createIndex('name', 'firstName', { unique: false });
        }

        // Relationships store
        if (!db.objectStoreNames.contains('relationships')) {
          const relStore = db.createObjectStore('relationships', { keyPath: 'id' });
          relStore.createIndex('projectId', 'projectId', { unique: false });
          relStore.createIndex('fromId', 'fromId', { unique: false });
          relStore.createIndex('toId', 'toId', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // ---------- Projects ----------
  async getAllProjects() {
    return this._getAll('projects');
  }

  async getProject(id) {
    return this._get('projects', id);
  }

  async saveProject(project) {
    project.updatedAt = new Date().toISOString();
    if (!project.createdAt) project.createdAt = project.updatedAt;
    return this._put('projects', project);
  }

  async deleteProject(id) {
    // Also delete related people and relationships
    const people = await this.getPeopleByProject(id);
    const rels = await this.getRelationshipsByProject(id);
    const tx = this.db.transaction(['projects', 'people', 'relationships'], 'readwrite');
    
    tx.objectStore('projects').delete(id);
    people.forEach(p => tx.objectStore('people').delete(p.id));
    rels.forEach(r => tx.objectStore('relationships').delete(r.id));
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ---------- People ----------
  async getPeopleByProject(projectId) {
    return this._getByIndex('people', 'projectId', projectId);
  }

  async getPerson(id) {
    return this._get('people', id);
  }

  async savePerson(person) {
    person.updatedAt = new Date().toISOString();
    if (!person.createdAt) person.createdAt = person.updatedAt;
    return this._put('people', person);
  }

  async deletePerson(id) {
    // Remove relationships involving this person
    const allRels = await this._getAll('relationships');
    const toDelete = allRels.filter(r => r.fromId === id || r.toId === id);
    
    const tx = this.db.transaction(['people', 'relationships'], 'readwrite');
    tx.objectStore('people').delete(id);
    toDelete.forEach(r => tx.objectStore('relationships').delete(r.id));
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ---------- Relationships ----------
  async getRelationshipsByProject(projectId) {
    return this._getByIndex('relationships', 'projectId', projectId);
  }

  async saveRelationship(rel) {
    if (!rel.createdAt) rel.createdAt = new Date().toISOString();
    return this._put('relationships', rel);
  }

  async deleteRelationship(id) {
    return this._delete('relationships', id);
  }

  // ---------- Settings ----------
  async getSetting(key, defaultValue = null) {
    const result = await this._get('settings', key);
    return result ? result.value : defaultValue;
  }

  async setSetting(key, value) {
    return this._put('settings', { key, value });
  }

  // ---------- Export / Import ----------
  async exportAll() {
    const projects = await this.getAllProjects();
    const people = await this._getAll('people');
    const relationships = await this._getAll('relationships');
    const settings = await this._getAll('settings');
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      projects,
      people,
      relationships,
      settings
    };
  }

  async importAll(data) {
    if (!data || !data.projects) throw new Error('Invalid backup data');
    
    const tx = this.db.transaction(['projects', 'people', 'relationships', 'settings'], 'readwrite');
    
    // Clear existing
    tx.objectStore('projects').clear();
    tx.objectStore('people').clear();
    tx.objectStore('relationships').clear();
    
    data.projects.forEach(p => tx.objectStore('projects').put(p));
    (data.people || []).forEach(p => tx.objectStore('people').put(p));
    (data.relationships || []).forEach(r => tx.objectStore('relationships').put(r));
    (data.settings || []).forEach(s => tx.objectStore('settings').put(s));
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAll() {
    const tx = this.db.transaction(['projects', 'people', 'relationships', 'settings'], 'readwrite');
    tx.objectStore('projects').clear();
    tx.objectStore('people').clear();
    tx.objectStore('relationships').clear();
    tx.objectStore('settings').clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ---------- Internal helpers ----------
  _get(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  _getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  _getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const index = tx.objectStore(storeName).index(indexName);
      const req = index.getAll(value);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  _put(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).put(data);
      req.onsuccess = () => resolve(data);
      req.onerror = () => reject(req.error);
    });
  }

  _delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

// UUID generator
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Global instance
const db = new FamilyDB();

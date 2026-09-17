/**
 * شجره‌نامه — Utility Functions
 * Common helpers used across the application
 */

const Utils = {
  /** Generate UUID v4 */
  uid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  /** Debounce */
  debounce(fn, wait = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  },

  /** Deep clone */
  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /** Format full name */
  fullName(person) {
    if (!person) return 'بدون نام';
    return [person.firstName, person.lastName].filter(Boolean).join(' ') || 'بدون نام';
  },

  /** Initials */
  initials(person) {
    if (!person || !person.firstName) return '؟';
    return person.firstName.charAt(0);
  },

  /** Dates string */
  dates(person) {
    if (!person) return '';
    const parts = [];
    if (person.birthDate) parts.push(person.birthDate);
    if (person.deathDate) parts.push(person.deathDate);
    return parts.join(' – ');
  },

  /** Is living */
  isLiving(person) {
    return !person.deathDate || person.deathDate.trim() === '';
  },

  /** Download blob */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  /** Download text */
  downloadText(text, filename, mime = 'text/plain') {
    const blob = new Blob([text], { type: mime + ';charset=utf-8' });
    this.downloadBlob(blob, filename);
  },

  /** Safe JSON parse */
  parseJSON(str, fallback = null) {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  },

  /** Persian number (simple) */
  toPersianDigits(str) {
    if (str == null) return '';
    return String(str).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  },

  /** Escape HTML */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /** Clamp */
  clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  },

  /** Distance */
  dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  },

  /** Now ISO */
  now() {
    return new Date().toISOString();
  }
};

// Make available globally
window.Utils = Utils;

/**
 * شجره‌نامه — Undo / Redo History Manager
 */

class HistoryManager {
  constructor(maxSize = 50) {
    this.stack = [];
    this.index = -1;
    this.maxSize = maxSize;
    this.enabled = true;
  }

  push(state) {
    if (!this.enabled) return;

    // Remove future states if we branched
    if (this.index < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.index + 1);
    }

    this.stack.push(Utils.clone(state));

    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    } else {
      this.index++;
    }
  }

  canUndo() {
    return this.index > 0;
  }

  canRedo() {
    return this.index < this.stack.length - 1;
  }

  undo() {
    if (!this.canUndo()) return null;
    this.index--;
    return Utils.clone(this.stack[this.index]);
  }

  redo() {
    if (!this.canRedo()) return null;
    this.index++;
    return Utils.clone(this.stack[this.index]);
  }

  clear() {
    this.stack = [];
    this.index = -1;
  }

  getCurrent() {
    if (this.index < 0) return null;
    return Utils.clone(this.stack[this.index]);
  }
}

window.HistoryManager = HistoryManager;

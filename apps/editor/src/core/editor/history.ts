/** undo/redo 스냅샷 스택. 연속 타이핑은 그룹으로 합쳐 한 번에 되돌린다. */

import type { DocModel } from "../model/types";
import type { DocRange } from "../model/position";

export type Snapshot = { doc: DocModel; selection: DocRange };

const MAX_DEPTH = 200;
const GROUP_WINDOW_MS = 1000;

export class History {
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  private lastGroup: string | null = null;
  private lastTime = 0;

  push(snapshot: Snapshot, group: string | null): void {
    const now = Date.now();
    if (
      group &&
      group === this.lastGroup &&
      now - this.lastTime < GROUP_WINDOW_MS
    ) {
      // 같은 그룹의 연속 편집 — 그룹 첫 스냅샷만 유지
      this.lastTime = now;
      this.redoStack = [];
      return;
    }
    this.undoStack.push(snapshot);
    if (this.undoStack.length > MAX_DEPTH) this.undoStack.shift();
    this.redoStack = [];
    this.lastGroup = group;
    this.lastTime = now;
  }

  undo(current: Snapshot): Snapshot | null {
    const snap = this.undoStack.pop();
    if (!snap) return null;
    this.redoStack.push(current);
    this.lastGroup = null;
    return snap;
  }

  redo(current: Snapshot): Snapshot | null {
    const snap = this.redoStack.pop();
    if (!snap) return null;
    this.undoStack.push(current);
    this.lastGroup = null;
    return snap;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}

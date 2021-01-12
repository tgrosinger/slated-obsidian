import { ItemView, WorkspaceLeaf } from 'obsidian';
import type { ISettings } from './settings';
import type { VaultIntermediate } from './vault';

export const TaskViewType = 'slated-tasks';

export class TaskView extends ItemView {
  constructor(
    leaf: WorkspaceLeaf,
    vault: VaultIntermediate,
    settings: ISettings,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return TaskViewType;
  }
  getDisplayText(): string {
    return 'This is a test';
  }
}

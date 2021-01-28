import type { ISettings } from './settings';
import type { VaultIntermediate } from './vault';
import { ItemView, WorkspaceLeaf } from 'obsidian';

export const TaskViewType = 'slated-tasks';

export class TaskView extends ItemView {
  constructor(
    leaf: WorkspaceLeaf,
    vault: VaultIntermediate,
    settings: ISettings,
  ) {
    super(leaf);
  }

  public readonly getIcon = (): string => 'slated';
  public readonly getDisplayText = (): string => 'Slated - Task List';

  public getViewType(): string {
    return TaskViewType;
  }
}

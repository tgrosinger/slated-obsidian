import type { ISettings } from './settings';
import type { VaultIntermediate } from './vault';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import type { TaskHandler } from './task-handler';
import TasksUI from './ui/TasksUI.svelte';
import { TaskCache } from './task-cache';

export const TaskViewType = 'slated-tasks';

export class TaskView extends ItemView {
  public taskCache: TaskCache;

  private settings: ISettings;
  private svelteComponent: TasksUI;

  constructor(
    leaf: WorkspaceLeaf,
    taskHandler: TaskHandler,
    vault: VaultIntermediate,
    settings: ISettings,
  ) {
    super(leaf);
    this.settings = settings;
    this.taskCache = new TaskCache(taskHandler, vault);
  }

  public readonly getIcon = (): string => 'slated';
  public readonly getDisplayText = (): string => 'Slated - Task List';

  public getViewType(): string {
    return TaskViewType;
  }

  public load(): void {
    super.load();

    this.svelteComponent = new TasksUI({
      target: this.containerEl.children[1],
      props: {
        taskCache: this.taskCache,
      },
    });
  }
}

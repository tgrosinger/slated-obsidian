import type { ISettings } from './settings';
import type { VaultIntermediate } from './vault';
import { ItemView, TFile, WorkspaceLeaf } from 'obsidian';
import type { TaskHandler } from './task-handler';
import type { TaskLine } from './task-line';
import TasksUI from './ui/TasksUI.svelte';

export const TaskViewType = 'slated-tasks';

export class TaskView extends ItemView {
  private taskHandler: TaskHandler;
  private vault: VaultIntermediate;
  private settings: ISettings;

  private taskCache: TaskLine[];
  private svelteComponent: TasksUI;

  constructor(
    leaf: WorkspaceLeaf,
    taskHandler: TaskHandler,
    vault: VaultIntermediate,
    settings: ISettings,
  ) {
    super(leaf);
    this.taskHandler = taskHandler;
    this.vault = vault;
    this.settings = settings;

    this.svelteComponent = new TasksUI({
      target: this.containerEl,
      props: {
        view: this,
      },
    });
  }

  public readonly getIcon = (): string => 'slated';
  public readonly getDisplayText = (): string => 'Slated - Task List';

  public getViewType(): string {
    return TaskViewType;
  }

  public load(): void {
    super.load();
    this.registerEvent(this.app.vault.on('modify', this.handleFileModified));
  }

  private readonly handleFileModified = (file: TFile): void => {};

  private readonly buildTaskCache = async (): Promise<void> => {
    // TODO: Before calling this, display a nice loading message since this
    // operation could take a while on really large vaults.
    this.taskCache = await this.taskHandler.getAllTasks();
  };
}

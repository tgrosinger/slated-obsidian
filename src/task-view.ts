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

  private hasLoaded: boolean;
  private taskCache: TaskLine[];
  private svelteComponent: TasksUI;

  private subscriptions: { id: number; hook: (val: any) => void }[];

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
    this.hasLoaded = false;
    this.subscriptions = [];

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

    this.svelteComponent = new TasksUI({
      target: this.containerEl.children[1],
      props: {
        view: this,
      },
    });

    this.registerEvent(this.app.vault.on('modify', this.handleFileModified));
    this.buildTaskCache(); // non-blocking, calls notify when finished
  }

  public get loading(): boolean {
    return !this.hasLoaded;
  }
  public get tasks(): TaskLine[] {
    return this.taskCache;
  }

  /**
   * The subscribe function implements the Store interface in Svelte. The
   * subscribers must be called any time there is a change to the task.
   */
  public readonly subscribe = (
    subscription: (value: any) => void,
  ): (() => void) => {
    const maxID = this.subscriptions.reduce(
      (prev, { id }): number => Math.max(prev, id),
      0,
    );
    const newID = maxID + 1;

    this.subscriptions.push({ id: newID, hook: subscription });
    subscription(this);

    // Return an unsubscribe function
    return () => {
      this.subscriptions = this.subscriptions.filter(({ id }) => id !== newID);
      console.log(`Removing subscription ${newID}`);
    };
  };

  /**
   * The set function implements the Store interface in Svelte. We are not
   * actually using it to store new values, but it is needed when binding to
   * properties.
   */
  public readonly set = (_: any): void => {};

  /**
   * Notify subscriptions of a change.
   */
  private readonly notify = (): void =>
    this.subscriptions.forEach(({ hook }) => hook(this));

  private readonly handleFileModified = (file: TFile): void => {};

  private readonly buildTaskCache = async (): Promise<void> => {
    // TODO: Before calling this, display a nice loading message since this
    // operation could take a while on really large vaults.
    this.taskCache = await this.taskHandler.getAllTasks();
    this.hasLoaded = true;
    this.notify();
  };
}

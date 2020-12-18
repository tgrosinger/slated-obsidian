import { ISettings, SettingsInstance } from './settings';
import { TaskHandler } from './task-handler';
import TaskMove from './ui/TaskMove.svelte';
import TaskRepeat from './ui/TaskRepeat.svelte';
import { VaultIntermediate } from './vault';
import { App, MarkdownView, Modal, Plugin, TFile } from 'obsidian';
import { TaskLine } from './task-line';

export default class SlatedPlugin extends Plugin {
  private vault: VaultIntermediate;
  private taskHandler: TaskHandler;
  private settings: ISettings;

  private lastFile: TFile | undefined;

  public async onload(): Promise<void> {
    await this.loadSettings();

    this.vault = new VaultIntermediate(this.app.vault);
    this.taskHandler = new TaskHandler(this.vault, this.settings);

    this.registerEvent(
      this.app.workspace.on('file-open', (file: TFile) => {
        // This callback is fired whenever a file receives focus
        // not just when the file is first opened.
        console.debug('Slated: File opened: ' + file.basename);

        if (this.lastFile) {
          this.taskHandler.processFile(this.lastFile);
        }

        this.lastFile = file;
        this.taskHandler.processFile(file);
      }),
    );

    this.addCommand({
      id: 'task-move-modal',
      name: 'Move Task',
      checkCallback: (checking: boolean) => {
        if (checking) {
          return this.taskModalChecker();
        }

        this.taskModalOpener((task: TaskLine) => {
          new TaskMoveModal(this.app, task).open();
        });
      },
    });

    this.addCommand({
      id: 'task-repeat-modal',
      name: 'Configure Task Repetition',
      checkCallback: (checking: boolean) => {
        if (checking) {
          return this.taskModalChecker();
        }

        this.taskModalOpener((task: TaskLine) => {
          new TaskRepeatModal(this.app, task).open();
        });
      },
    });
  }

  private async loadSettings(): Promise<void> {
    const loadedSettings = await this.loadData();
    this.settings = new SettingsInstance(loadedSettings);
  }

  private taskModalChecker = (): boolean => {
    if (
      this.app.workspace.activeLeaf === undefined ||
      !(this.app.workspace.activeLeaf.view instanceof MarkdownView)
    ) {
      return false;
    }

    const activeLeaf = this.app.workspace.activeLeaf;
    if (!(activeLeaf.view instanceof MarkdownView)) {
      return;
    }

    const editor = activeLeaf.view.sourceMode.cmEditor;
    const cursorPos = editor.getCursor();
    const currentLine = editor.getLine(cursorPos.line);
    const task = new TaskLine(
      currentLine,
      cursorPos.line,
      activeLeaf.view.file,
      this.vault,
    );

    return task.isTask();
  };

  private taskModalOpener = (fn: (task: TaskLine) => void): void => {
    const activeLeaf = this.app.workspace.activeLeaf;
    if (!(activeLeaf.view instanceof MarkdownView)) {
      return;
    }

    const editor = activeLeaf.view.sourceMode.cmEditor;
    const cursorPos = editor.getCursor();
    const currentLine = editor.getLine(cursorPos.line);
    const task = new TaskLine(
      currentLine,
      cursorPos.line,
      activeLeaf.view.file,
      this.vault,
    );
    fn(task);
  };
}

class TaskMoveModal extends Modal {
  private readonly task: TaskLine;

  constructor(app: App, task: TaskLine) {
    super(app);
    this.task = task;
  }

  public onOpen = (): void => {
    const { contentEl } = this;
    const app = new TaskMove({
      target: contentEl,
      props: {
        task: this.task,
      },
    });
  };

  public onClose = (): void => {
    const { contentEl } = this;
    contentEl.empty();
  };
}

class TaskRepeatModal extends Modal {
  private readonly task: TaskLine;

  constructor(app: App, task: TaskLine) {
    super(app);
    this.task = task;
  }

  public onOpen = (): void => {
    const { contentEl } = this;
    const app = new TaskRepeat({
      target: contentEl,
      props: {
        task: this.task,
      },
    });
  };

  public onClose = (): void => {
    const { contentEl } = this;
    contentEl.empty();
  };
}

import { fileIsDailyNote } from './file-helpers';
import type { ISettings } from './settings';
import { TaskLine } from './task-line';
import type { VaultIntermediate } from './vault';
import type { Moment } from 'moment';
import type { TFile } from 'obsidian';

export class TaskHandler {
  private readonly settings: ISettings;
  private readonly vault: VaultIntermediate;
  private taskCache: Record<string, TaskLine[]>;

  constructor(vault: VaultIntermediate, settings: ISettings) {
    this.vault = vault;
    this.settings = settings;
    this.taskCache = {};
  }

  /**
   * Scan the whole file, looking for tasks with repetition configs.
   * For each task found, ensure that subsequent tasks have been created.
   *
   * This function will:
   * - Modify the provided file to add block references to repeating tasks
   * - Create missing daily notes needed by repeating tasks
   * - Insert all occurences of a finite repeating task
   * - Insert a configurable number of infinite repeating tasks
   */
  public readonly processFile = async (file: TFile): Promise<void> => {
    if (!fileIsDailyNote(file, this.vault)) {
      console.debug(
        'Slated: Not in a daily note, not processing contained tasks',
      );
      return;
    }

    const tasks = await this.normalizeFileTasks(file);
    const newlyCompletedTasks = this.filterNewlyCompletedTasks(
      file.basename,
      tasks,
    );
    this.taskCache[file.basename] = tasks;
    return this.propogateCompletedTasks(newlyCompletedTasks);
  };

  /**
   * getAllTasks scans every file in the Vault looking for tasks. Each task
   * found is converted into a TaskLine and returned.
   *
   * This has the potential to be very expensive, so hopefully we only need to
   * do it once.
   */
  public readonly getAllTasks = async (): Promise<
    Record<string, TaskLine[]>
  > => {
    const files = this.vault.getMarkdownFiles();
    const toReturn: Record<string, TaskLine[]> = {};
    for (let i = 0; i < files.length; i++) {
      const tasks = await this.normalizeFileTasks(files[i]);
      if (tasks.length > 0) {
        toReturn[files[i].basename] = tasks;
      }
    }
    return toReturn;
  };

  /**
   * moveIncompleted moves all tasks in a file which are not complete to the
   * daily note for the provided moment.
   */
  public readonly moveIncompleted = async (
    file: TFile,
    to: Moment,
  ): Promise<void> => {
    const tasks = await this.normalizeFileTasks(file);
    const incompleteTasks = tasks.filter((task) => task.incomplete);

    // Moving tasks is not thread safe since they read and write to files
    // Move in reverse order to get around line number changing issue caused by
    // moving tasks with subitems.
    for (let i = incompleteTasks.length - 1; i >= 0; i--) {
      await incompleteTasks[i].move(to);
    }
  };

  public readonly getCachedTasksForFile = (file: TFile): TaskLine[] =>
    this.taskCache[file.basename];

  /**
   * Test if this line is a task. This is called for every line in a file after
   * every save, so performance is essential.
   */
  public readonly isLineTask = (line: string): boolean => {
    const trimmed = line.trimStart();

    // We can rule out anything that is not a list by testing a single char
    if (trimmed[0] !== '-') {
      return false;
    }

    return (
      trimmed.startsWith('- [ ] ') ||
      trimmed.startsWith('- [x] ') ||
      trimmed.startsWith('- [X] ') ||
      trimmed.startsWith('- [-] ') ||
      trimmed.startsWith('- [>] ')
    );
  };

  /**
   * Scan the file looking for tasks. Parse the task, and if it is a repeating
   * task, ensure it has a block ID and validate the repeat config. Normalized
   * file is saved, then returns a list of all the TaskItems.
   */
  private readonly normalizeFileTasks = async (
    file: TFile,
  ): Promise<TaskLine[]> => {
    console.debug('Slated: Normalizing tasks in file: ' + file.basename);

    const fileContents = await this.vault.readFile(file, false);
    if (!fileContents) {
      return [];
    }

    const splitFileContents = fileContents.split('\n');
    const taskLines = splitFileContents
      .map((line, index) => ({ line, lineNum: index }))
      .filter(({ line }) => this.isLineTask(line))
      .map(
        ({ lineNum }) =>
          new TaskLine(
            lineNum,
            file,
            splitFileContents,
            this.vault,
            this.settings,
          ),
      );

    // XXX: This will cause a file write for each task which needs to be modified.
    // Hopefully there aren't so many tasks modified at once that it's problematic,
    // but it may be necessary to change this to batch writes.
    for (let i = 0; i < taskLines.length; i++) {
      await taskLines[i].addBlockIDIfMissing();
    }

    return taskLines;
  };

  private readonly filterNewlyCompletedTasks = (
    filename: string,
    tasks: TaskLine[],
  ): TaskLine[] => {
    const prevTasks = this.taskCache[filename];
    return tasks.filter((task) => {
      if (!task.complete) {
        return false;
      }

      if (!prevTasks) {
        // it's complete and there were no previous tasks, so must be new
        return true;
      }

      for (let i = 0; i < prevTasks.length; i++) {
        const prevTask = prevTasks[i];
        if (task.blockID === prevTask.blockID) {
          // if prevTask complete then not newly completed
          return !prevTask.complete;
        }
      }

      // A newly added task that is also complete.
      return true;
    });
  };

  /**
   * Create the next occurence for each of the provided tasks.
   */
  private readonly propogateCompletedTasks = async (
    tasks: TaskLine[],
  ): Promise<void> => {
    await Promise.all(
      tasks
        .filter((task) => task.repeats)
        .map((task) => task.createNextRepetition()),
    );
  };
}

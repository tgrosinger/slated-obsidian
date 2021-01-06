import { fileIsDailyNote } from './file-helpers';
import type { SettingsInstance } from './settings';
import { TaskLine } from './task-line';
import type { VaultIntermediate } from './vault';
import type { TFile } from 'obsidian';

export class TaskHandler {
  private readonly settings: SettingsInstance;
  private readonly vault: VaultIntermediate;
  private taskCache: Record<string, TaskLine[]>;

  constructor(vault: VaultIntermediate, settings: SettingsInstance) {
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
  public async processFile(file: TFile): Promise<void> {
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
  }

  public getCachedTasksForFile(file: TFile): TaskLine[] {
    return this.taskCache[file.basename];
  }

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
        ({ line, lineNum }) =>
          new TaskLine(line, lineNum, file, this.vault, this.settings),
      );
    const repeatingTaskLines = taskLines.filter((taskLine) => taskLine.repeats);

    const modifiedLines = repeatingTaskLines.filter(
      (taskLine) => taskLine.modfied,
    );

    // NOTE: We must not write the file if no changes were made because we hook
    // on file-modified. If we always write, then it will infinitely update.

    if (modifiedLines.length === 0) {
      return taskLines;
    }

    modifiedLines.map(
      (taskLine) => (splitFileContents[taskLine.lineNum] = taskLine.line),
    );
    this.vault.writeFile(file, splitFileContents.join('\n'));

    // TODO: Notify on invalid repeating configs

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
    await Promise.all(tasks.map((task) => task.createNextRepetition()));
  };

  /**
   * Test if this line is a task. This is called for every line in a file after
   * every save, so performance is essential.
   */
  private readonly isLineTask = (line: string): boolean => {
    // We can rule out anything that is not a list by testing a single char
    if (line.trimStart()[0] !== '-') {
      return false;
    }

    return (
      line.startsWith('- [ ] ') ||
      line.startsWith('- [x] ') ||
      line.startsWith('- [X] ') ||
      line.startsWith('- [>] ')
    );
  };
}

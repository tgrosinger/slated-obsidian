import { fileIsDailyNote } from './file-helpers';
import type { ISettings } from './settings';
import { TaskLine } from './task-line';
import type { VaultIntermediate } from './vault';
import type { Moment } from 'moment';
import type { MetadataCache, TFile } from 'obsidian';

// TODO: Switch taskCache to use the TaskCache class

export class TaskHandler {
  private readonly settings: ISettings;
  private readonly vault: VaultIntermediate;
  private readonly metadataCache: MetadataCache;
  private taskCache: Record<string, TaskLine[]>;

  constructor(
    vault: VaultIntermediate,
    metadataCache: MetadataCache,
    settings: ISettings,
  ) {
    this.vault = vault;
    this.metadataCache = metadataCache;
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

    const tasks = await this.getFileTasks(file);
    const newlyCompletedTasks = this.filterNewlyCompletedTasks(
      file.basename,
      tasks,
    );
    this.taskCache[file.basename] = tasks;
    return this.propogateCompletedTasks(newlyCompletedTasks);
  };

  /**
   * moveIncompleted moves all tasks in a file which are not complete to the
   * daily note for the provided moment.
   *
   * Tasks are moved one at a time so that we do not duplicate sub-tasks, and
   * so that we are not confused by changing line numbers in the source file as
   * we remove tasks. It's not very efficient, but it does seem to work.
   */
  public readonly moveIncompleted = async (
    file: TFile,
    to: Moment,
  ): Promise<void> => {
    while (true) {
      const tasks = await this.getFileTasks(file);
      if (!tasks || !tasks.length) {
        return;
      }
      const firstIncomplete = tasks.find((task) => task.incomplete);
      if (!firstIncomplete) {
        return;
      }

      await firstIncomplete.move(to);
    }
  };

  public readonly getCachedTasksForFile = (file: TFile): TaskLine[] =>
    this.taskCache[file.basename];

  public readonly getFileTasks = async (file: TFile): Promise<TaskLine[]> => {
    const cachedListItems = this.metadataCache.getFileCache(file).listItems;
    if (!cachedListItems || cachedListItems.length === 0) {
      return [];
    }

    const fileContents = await this.vault.readFile(file, false);
    const splitFileContents = fileContents.split('\n');

    // TODO: Pass info about list start and parent

    return cachedListItems
      .filter((li) => li.task)
      .map((li) => {
        return new TaskLine(
          li.position.start.line,
          file,
          splitFileContents,
          this.vault,
          this.settings,
        );
      });
  };

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
      trimmed.startsWith('- [-] ')
    );
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
        if (task.line === prevTask.line) {
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

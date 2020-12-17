import type { Moment } from 'moment';
import moment from 'moment';
import type { TFile } from 'obsidian';
import type { SettingsInstance } from 'src/settings';
import type { VaultIntermediate } from 'src/vault';
import { TaskLine } from './task-line';

export class TaskHandler {
  private readonly settings: SettingsInstance;
  private readonly vault: VaultIntermediate;

  constructor(vault: VaultIntermediate, settings: SettingsInstance) {
    this.vault = vault;
    this.settings = settings;
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
    const date = this.vault.findMomentForDailyNote(file);
    if (date === undefined) {
      console.debug(
        'Slated: Not in a daily note, not processing contained tasks',
      );
      return;
    }

    const allTasks = await this.normalizeFileTasks(file);
    const unresolvedPropogations = allTasks
      .filter((task) => task.repeats && task.repeatValid)
      .map((task) => this.propogateRepetitionsForTask(task, date));

    await Promise.all(unresolvedPropogations);
  }

  /**
   * Ensure that future repetitions of the provided task have been created.
   */
  private async propogateRepetitionsForTask(
    task: TaskLine,
    date: Moment,
  ): Promise<void[]> {
    const nextN = task.repeatConfig.all(
      (_, len) => len < this.settings.futureRepetitionsCount,
    );

    const pendingUpdates = nextN.map((updateDate) =>
      this.vault
        .getDailyNote(moment(updateDate))
        .then((file) => this.ensureTaskRepeatExists(file, task)),
    );
    return Promise.all(pendingUpdates);
  }

  private async ensureTaskRepeatExists(
    file: TFile,
    task: TaskLine,
  ): Promise<void> {
    console.debug(
      'Slated: Ensuring repeating task exists in file: ' + file.basename,
    );
    const fileContents = (await this.vault.readFile(file, false)) || '';
    const splitFileContents = fileContents.split('\n');
    let tasksSectionHeader = -1;
    let endOfTasksSection = -1;
    for (let i = 0; i < splitFileContents.length; i++) {
      const line = splitFileContents[i];
      if (line.indexOf(task.blockID) >= 0) {
        // TODO: Verify that the task line does in fact match

        // modify if not quite right.
        return;
      }

      if (line === this.settings.tasksHeader) {
        tasksSectionHeader = i;
      } else if (line.startsWith('#')) {
        endOfTasksSection = i - 1;
      }
    }

    if (tasksSectionHeader === -1) {
      splitFileContents.splice(
        splitFileContents.length,
        0,
        ...(this.settings.blankLineAfterHeader
          ? [this.settings.tasksHeader, '\n']
          : [this.settings.tasksHeader]),
      );
      endOfTasksSection = splitFileContents.length;
    }

    splitFileContents.splice(endOfTasksSection, 0, task.line);
    return this.vault.writeFile(file, splitFileContents.join('\n'));
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
      .map(({ line, lineNum }) => new TaskLine(line, lineNum));
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
      line.startsWith('- [X] ')
    );
  };
}

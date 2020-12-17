import { TaskLine } from './task-line';
import type { Moment } from 'moment';
import moment from 'moment';
import type { TFile } from 'obsidian';
import type { SettingsInstance } from 'src/settings';
import type { VaultIntermediate } from 'src/vault';

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
    i = 0, // Starting index for searching the file
  ): Promise<void> {
    console.debug(
      'Slated: Ensuring repeating task exists in file: ' + file.basename,
    );
    const fileContents = (await this.vault.readFile(file, false)) || '';
    const lines = fileContents.split('\n');

    const blockIDIndex = this.getBlockIDIndex(lines, task.blockID);

    if (blockIDIndex !== -1) {
      return; // TODO: Verify it is actually the correct format and such
    }

    const taskSectionIndex = this.getIndexTasksSection(lines);
    const taskSectionEndIndex = this.getIndexSectionLastContent(
      lines,
      taskSectionIndex,
    );

    this.insertLine(lines, task.lineAsRepeated(), taskSectionEndIndex + 1);
    return this.vault.writeFile(file, lines.join('\n'));
  }

  private readonly getIndexTasksSection = (lines: string[]): number => {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === this.settings.tasksHeader) {
        return i;
      }
    }

    // Tasks section not found, so add it

    if (lines.length === 1) {
      // Empty file, just replace the first line
      lines[0] = this.settings.tasksHeader;
      return 0;
    }

    lines.push(this.settings.tasksHeader);
    return lines.length - 1;
  };

  /**
   * Returns the index of the last line of content in the provided section.
   * If there is no content in this section, the index of the header is returned.
   */
  private readonly getIndexSectionLastContent = (
    lines: string[],
    sectionHeader: number,
  ): number => {
    let lastContentLine = -1;
    let nextHeaderLine = -1;

    // Start on the line after the header.
    // NOTE: That could be the end of the file!
    for (let i = sectionHeader + 1; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('#')) {
        nextHeaderLine = i;
        break;
      }

      if (line.trim() !== '') {
        lastContentLine = i;
      }
    }

    if (lastContentLine === -1) {
      // There is no content in this section, so return the header index
      return sectionHeader;
    } 
      // There is content in this section, return the last line of it.
      return lastContentLine;
    
  };

  private readonly getBlockIDIndex = (
    lines: string[],
    blockID: string,
  ): number => {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].indexOf(blockID) > -1) {
        return i;
      }
    }
    return -1;
  };

  /**
   * Insert the provided line before the provided index. If the settings call
   * for a blank line around headings, insert blank lines as necessary.
   */
  private readonly insertLine = (
    lines: string[],
    line: string,
    i: number,
  ): void => {
    if (!this.settings.blankLineAfterHeader) {
      lines.splice(i, 0, line);
      return;
    }

    const toInsert: string[] = [];
    if (i > 0 && lines[i - 1].startsWith('#')) {
      // Line before is a heading, leave a space
      toInsert.push('');
    }
    toInsert.push(line);
    if (i < lines.length && lines[i].startsWith('#')) {
      // Next line is a heading, leave a space
      toInsert.push('');
    } else if (i === lines.length) {
      // Last line of the file, leave a space
      toInsert.push('');
    }

    lines.splice(i, 0, ...toInsert);
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
        ({ line, lineNum }) => new TaskLine(line, lineNum, file, this.vault),
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

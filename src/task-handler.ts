import type { Moment } from 'moment';
import moment from 'moment';
import type { TFile } from 'obsidian';
import RRule from 'rrule';
import type { SettingsInstance } from 'src/settings';
import type { VaultIntermediate } from 'src/vault';

const blockHashRe = /\^[\-a-zA-Z0-9]+/;

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
    let taskSectionHeader = -1;
    let endOfTasksSection = -1;
    for (let i = 0; i < splitFileContents.length; i++) {
      const line = splitFileContents[i];
      if (line.indexOf(task.blockID) >= 0) {
        // TODO: Verify that the task line does in fact match

        // modify if not quite right.
        return;
      }

      if (line === this.settings.tasksHeader) {
        taskSectionHeader = i;
      } else if (line.startsWith('#')) {
        endOfTasksSection = i - 1;
      }
    }

    if (taskSectionHeader === -1) {
      // append the task section, then the task
      splitFileContents.push(this.settings.tasksHeader);
      splitFileContents.push(task.line);
    } else if (endOfTasksSection === -1) {
      // task section exists at end of file, just append task to list
      splitFileContents.push(task.line);
    } else {
      // task section exists and has end, append to section
      splitFileContents.splice(endOfTasksSection, 0, task.line);
    }

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

const createTaskBlockHash = (): string => {
  // TODO: Should this be task-<timestamp> instead?
  //       Or make it user configurable?
  let result = 'task-';
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i <= 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export class TaskLine {
  public readonly lineNum: number;

  private readonly originalLine: string;
  private _line: string;
  private _modified: boolean;

  private _blockID: string;

  private hasRepeatConfig: boolean;
  private repeatParseError: boolean;
  private _rrule: RRule | undefined;

  constructor(line: string, lineNum: number) {
    this.originalLine = line;
    this._line = line;
    this.lineNum = lineNum;

    this.parseBlockID();
    this.parseRepeatConfig();
    if (this.hasRepeatConfig && !this._blockID) {
      this.addBlockID();
    }
  }

  /**
   * line returns the current (possibly modified) value of this task line.
   */
  public get line(): string {
    return this._line;
  }

  /**
   * modified indicates if the line has been updated from the original value.
   * Modifications may include:
   * - Adding a block ID
   * - Adding a date that this task was moved to
   * - Checking or unchecking this task
   */
  public get modfied(): boolean {
    return this._modified;
  }

  public get blockID(): string {
    return this._blockID;
  }

  public get repeats(): boolean {
    return this.hasRepeatConfig;
  }

  public get repeatValid(): boolean {
    return !this.repeatParseError;
  }

  public get repeatConfig(): RRule {
    return this._rrule;
  }

  /**
   * Looks for the repeating config portion of a task line.
   * The repeating config occurs after a semicolon or 📅 but excludes the blockID.
   */
  private readonly parseRepeatConfig = (): void => {
    const lineMinusID = this.originalLine.replace('^' + this._blockID, '');
    let parts = lineMinusID.split('📅');
    if (parts.length === 1) {
      parts = lineMinusID.split(';');
      if (parts.length === 1) {
        this.hasRepeatConfig = false;
        return;
      }
    }
    this.hasRepeatConfig = true;

    if (parts.length > 2) {
      this.repeatParseError = true;
      return;
    }

    this._rrule = RRule.fromText(parts[1]);
  };

  private readonly parseBlockID = (): void => {
    const blockID = blockHashRe.exec(this.originalLine);
    this._blockID = blockID && blockID.length === 1 ? blockID[0] : '';
  };

  /**
   * Create a blockID and append to the line.
   */
  private readonly addBlockID = (): void => {
    if (this._blockID !== '') {
      return;
    }

    this._blockID = createTaskBlockHash();
    this._line += ' ^' + this._blockID;
    this._modified = true;
  };
}

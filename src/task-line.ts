import type { VaultIntermediate } from './vault';
import type { TFile } from 'obsidian';
import RRule, { Frequency } from 'rrule';
import { RepeatAdapter } from './repeat';
import type { Moment } from 'moment';
import moment from 'moment';
import type { SettingsInstance } from 'src/settings';

const taskRe = /^- \[[ xX]\] /;
const repeatScheduleRe = /[;📅]\W*([-a-zA-Z0-9 =;:\,]+)/;
const movedFromRe = /<\[\[([^\]]+)#\^[-a-zA-Z0-9]+(|[^\]]+)?\]\]/;
const movedToRe = />\[\[([^\]]+)\]\]/;
const repeatsFromRe = /<<\[\[([^\]]+)#\^[-a-zA-Z0-9]+(|[^\]]+)?\]\]/;
const blockHashRe = /\^([-a-zA-Z0-9]+)/;

export class TaskLine {
  public readonly lineNum: number;
  public readonly repeater: RepeatAdapter | undefined;

  private readonly file: TFile;
  private readonly vault: VaultIntermediate;
  private readonly settings: SettingsInstance;

  private readonly originalLine: string;
  private _line: string;
  private _modified: boolean;

  private _repeats: boolean;
  private readonly _repeatConfig: string;
  private _blockID: string;
  private readonly _movedToNoteName: string;
  private readonly _movedFromNoteName: string;
  private readonly _repeatsFromNoteName: string;

  private subscriptions: { id: number; hook: (val: any) => void }[];

  constructor(
    line: string,
    lineNum: number,
    file: TFile,
    vault: VaultIntermediate,
    settings: SettingsInstance,
  ) {
    this.originalLine = line;
    this._line = line;
    this.lineNum = lineNum;
    this.file = file;
    this.vault = vault;
    this.settings = settings;

    if (!this.isTask()) {
      return;
    }

    const repeatMatches = repeatScheduleRe.exec(line);
    if (repeatMatches && repeatMatches.length === 2) {
      this._repeats = true;
      this._repeatConfig = repeatMatches[1];
      this.repeater = new RepeatAdapter(
        RRule.fromText(this._repeatConfig),
        this.handleRepeaterUpdated,
      );
    } else {
      this._repeats = false;
      this.repeater = new RepeatAdapter(
        new RRule({
          freq: Frequency.WEEKLY,
          interval: 1,
        }),
        this.handleRepeaterUpdated,
      );
    }

    const blockIDMatches = blockHashRe.exec(line);
    if (
      blockIDMatches &&
      blockIDMatches.length === 2 &&
      blockIDMatches[1] !== ''
    ) {
      this._blockID = blockIDMatches[1];
    } else {
      this._blockID = '';
    }

    const movedFromLink = movedFromRe.exec(line);
    if (movedFromLink) {
      if (movedFromLink.length > 1 && movedFromLink[1] !== '') {
        this._movedFromNoteName = movedFromLink[1].split('|')[0];
      }
    }

    const movedToLink = movedToRe.exec(line);
    if (movedToLink) {
      if (movedToLink.length > 1 && movedToLink[1] !== '') {
        this._movedToNoteName = movedToLink[1].split('|')[0];
      }
    }

    const repeatsFromLink = repeatsFromRe.exec(line);
    if (repeatsFromLink) {
      if (repeatsFromLink.length > 1 && repeatsFromLink[1] !== '') {
        this._repeatsFromNoteName = repeatsFromLink[1].split('|')[0];
      }
    }

    if (this.repeats && this.repeater.isValid() && !this._blockID) {
      this.addBlockID();
    }

    this.subscriptions = [];
  }

  /**
   * line returns the current (possibly modified) value of this task line.
   */
  public get line(): string {
    return this._line;
  }

  public get repeats(): boolean {
    return this._repeats;
  }

  // isOriginalInstance indicates if this is the task actually annotated with a
  // block ID, or if instead it is referring to another task by blockID.
  public get isOriginalInstance(): boolean {
    throw new Error('Not implemented');
  }

  // Converts the line to be used in places where it was moved to another note.
  // Something like:
  // - [x] This is the task >[[2020-12-25]] ^task-abc123
  public lineAsMovedTo = (): string => {
    throw new Error('Not implemented');
  };

  // Converts the line to be used in places where it was moved from another note.
  // Something like:
  // - [ ] This is the task <[[2020-12-25^task-abc123]]
  public lineAsMovedFrom = (): string => {
    throw new Error('Not implemented');
  };

  // Converts the line to be used in places where it was copied to another note
  // because it repeats.
  // Something like:
  // - [ ] This is the task ; Every Sunday <<[[2020-12-25^task-abc123]]
  public lineAsRepeated = (): string => {
    const withoutBlockID = this._line.replace('^' + this._blockID, '');
    const rootTaskLink = `${this.file.basename}#^${this._blockID}`;
    return withoutBlockID + `<<[[${rootTaskLink}]]`;
  };

  public get movedTo(): string {
    return this._movedToNoteName || '';
  }

  public get movedFrom(): string {
    return this._movedFromNoteName || '';
  }

  public get repeatsFrom(): string {
    return this._repeatsFromNoteName || '';
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

  /**
   * Return whether the line stored is actually a valid Markdown task. NOTE:
   * This uses regex and is not quite as performant as TaskHandler.isLineTask()
   */
  public isTask = (): boolean => taskRe.test(this.line);

  public save = async (): Promise<void> => {
    if (!this._repeats) {
      // A save with no options changed.
      this.handleRepeaterUpdated();

      if (!this._blockID) {
        this.addBlockID();
      }
    }

    if (!this.modfied) {
      return;
    }

    const fileContents = await this.vault.readFile(this.file, false);
    const lines = fileContents.split('\n');
    lines[this.lineNum] = this._line;
    const newFileContents = lines.join('\n');

    return this.vault.writeFile(this.file, newFileContents).then(() => {
      this._modified = false;
    });
  };

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
   * task properties.
   */
  public readonly set = (_: any): void => {
    this._modified = true;
  };

  /**
   * Ensure that future repetitions of the provided task have been created.
   */
  public async propogateRepetitions(date: Moment): Promise<void[]> {
    const nextN = this.repeater.next(this.settings.futureRepetitionsCount);

    const pendingUpdates = nextN.map((updateDate) =>
      this.vault
        .getDailyNote(moment(updateDate))
        .then((file) => this.ensureRepeatExists(file)),
    );
    return Promise.all(pendingUpdates);
  }

  private async ensureRepeatExists(
    file: TFile,
    i = 0, // Starting index for searching the file
  ): Promise<void> {
    console.debug(
      'Slated: Ensuring repeating task exists in file: ' + file.basename,
    );
    const fileContents = (await this.vault.readFile(file, false)) || '';
    const lines = fileContents.split('\n');

    const blockIDIndex = this.getBlockIDIndex(lines, this.blockID);

    if (blockIDIndex !== -1) {
      return; // TODO: Verify it is actually the correct format and such
    }

    const taskSectionIndex = this.getIndexTasksSection(lines);
    const taskSectionEndIndex = this.getIndexSectionLastContent(
      lines,
      taskSectionIndex,
    );

    this.insertLine(lines, this.lineAsRepeated(), taskSectionEndIndex + 1);
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

  private readonly handleRepeaterUpdated = (): void => {
    this._modified = true;
    this._repeats = this.repeater.isValid();

    // TODO: This should trigger an action to look for future occurences of this
    // task which are no longer correct, remove them, and then recreate future
    // occurences using the new repeat pattern. Ideally only do this if they
    // would change though! Use the old pattern before changing to find the
    // dates to check, and compare against dates generated with the new pattern.

    const oldRepeatMatches = repeatScheduleRe.exec(this._line);
    if (!oldRepeatMatches) {
      // Adding a repeat config to a task that previously did not have one

      // TODO: Make sure the blockID is still at the very end
      // TODO: Add an option for the preferred divider type
      this._line += ' 📅 ' + this.repeater.toText();
    } else {
      const oldRepeatConfig = oldRepeatMatches[1];
      this._line = this._line
        .replace(oldRepeatConfig, this.repeater.toText() + ' ')
        .trim();
    }

    // Notify subscriptions of the change
    this.subscriptions.forEach(({ hook }) => hook(this));
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

const createTaskBlockHash = (): string => {
  // TODO: Should this be task-<timestamp> instead?
  //       Or make it user configurable?
  let result = 'task-';
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

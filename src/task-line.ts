import type { VaultIntermediate } from './vault';
import type { TFile } from 'obsidian';
import RRule, { Frequency } from 'rrule';
import { RepeatAdapter } from './repeat';
import moment from 'moment';
import type { SettingsInstance } from './settings';
import {
  addTaskRepetition,
  fileIsDailyNote,
  getBlockIDIndex,
  getIndexSectionLastContent,
  getIndexTasksHeading,
  insertLine,
  removeTaskRepetition,
  updateTaskRepetition,
} from './file-helpers';
import { intersection, difference, concat } from 'lodash';

const taskRe = /^- \[[ xX>]\] /;
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

  /**
   * Do not use directly, instead use baseTaskContent() which memoizes.
   */
  private _basetask: string;

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
    return this.repeats && !this.repeatsFrom;
  }

  // Converts the line to be used in places where it was moved to another note.
  // Something like:
  // - [>] This is the task >[[2020-12-25]] ^task-abc123
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
    const rootTaskLink = `${this.originalFileName()}#^${this._blockID}`;
    return `${this.baseTaskContent()}<<[[${rootTaskLink}]]`;
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
    if (!this.repeats) {
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

  public readonly createNextRepetition = async (): Promise<void> => {
    const currentNoteDate = this.vault.findMomentForDailyNote(this.file);
    const nextDate = this.repeater
      .asRRule()
      .after(currentNoteDate.endOf('day').toDate());

    const nextOccurenceFile = await this.vault.getDailyNote(moment(nextDate));
    return addTaskRepetition(
      nextOccurenceFile,
      this,
      this.settings,
      this.vault,
    );
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

  private readonly handleRepeaterUpdated = (): void => {
    this._modified = true;
    this._repeats = this.repeater.isValid();

    if (!this._repeatConfig) {
      // Adding a repeat config to a task that previously did not have one

      // TODO: Make sure the blockID is still at the very end
      // TODO: Add an option for the preferred divider type
      this._line = this.originalLine + ' 📅 ' + this.repeater.toText();
    } else {
      this._line = this.originalLine
        .replace(this._repeatConfig, this.repeater.toText() + ' ')
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

  /**
   * Returns the task line with no repetition or move links.
   */
  private readonly baseTaskContent = (): string => {
    if (this._basetask) {
      return this._basetask;
    }

    let line = this._line;
    line = line.replace(movedFromRe, '');
    line = line.replace(movedToRe, '');
    line = line.replace(repeatsFromRe, '');
    line = line.replace(blockHashRe, '');
    this._basetask = line;
    return line;
  };

  /**
   * Attempts to return the name of the file from which this task originated.
   * That could be a file which this task was moved from, or it could be the
   * source of the repetition of this task.
   */
  private readonly originalFileName = (): string => {
    if (this.isOriginalInstance) {
      return this.file.basename;
    }

    if (this._movedFromNoteName !== '') {
      return this._movedFromNoteName;
    }

    if (this._repeatsFromNoteName !== '') {
      return this._repeatsFromNoteName;
    }

    throw new Error(
      `Slated: Unable to find original file name for task: ${this._line}`,
    );
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

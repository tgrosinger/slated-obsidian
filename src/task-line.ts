import {
  addTaskMove,
  addTaskRepetition,
  getHeaderDepth,
  markTaskAsCopied,
  removeLines,
} from './file-helpers';
import { RepeatAdapter } from './repeat';
import type { ISettings } from './settings';
import type { VaultIntermediate } from './vault';
import type { Moment } from 'moment';
import type { TFile } from 'obsidian';
import { Notice } from 'obsidian';
import RRule, { Frequency } from 'rrule';

const taskRe = /^\s*- \[[ xX>\-]\] /;

/**
 * Matches the text following a semicolon or calendar emoji.
 * Does not match links or <>
 */
const repeatScheduleRe = /[;📅]\s*([-a-zA-Z0-9 =;:\,]+)/;

export class TaskLine {
  public readonly lineNum: number;
  public readonly subContent: string[];
  public readonly headings: string[];

  private readonly file: TFile;
  private readonly vault: VaultIntermediate;
  private readonly settings: ISettings;

  private _line: string;

  private _repeats: boolean;
  private _repeatConfig: string;

  constructor(
    lineNum: number,
    file: TFile,
    fileLines: string[], // Can not use async in a constructor
    vault: VaultIntermediate,
    settings: ISettings,
  ) {
    this._line = fileLines[lineNum];
    this.lineNum = lineNum;
    this.file = file;
    this.vault = vault;
    this.settings = settings;

    if (!this.isTask()) {
      return;
    }

    this.subContent = this.getSubContent(fileLines);
    this.headings = this.getHeadings(fileLines);

    const repeatMatches = repeatScheduleRe.exec(this._line);
    if (repeatMatches && repeatMatches.length === 2) {
      this._repeats = true;
      this._repeatConfig = repeatMatches[1];
    } else {
      this._repeats = false;
    }
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

  public get repeater(): RepeatAdapter {
    if (this._repeatConfig) {
      return new RepeatAdapter(RRule.fromText(this._repeatConfig));
    }

    return new RepeatAdapter(
      new RRule({ freq: Frequency.WEEKLY, interval: 1 }),
    );
  }

  public get complete(): boolean {
    const matches = taskRe.exec(this._line);
    if (!matches) {
      return false;
    }

    const innerChar = matches[0].trimStart()[3];
    return innerChar === 'x' || innerChar === 'X';
  }

  public get incomplete(): boolean {
    const matches = taskRe.exec(this._line);
    if (!matches) {
      return false;
    }

    const innerChar = matches[0].trimStart()[3];
    return innerChar === ' ';
  }

  public get skipped(): boolean {
    const matches = taskRe.exec(this._line);
    if (!matches) {
      return false;
    }

    const innerChar = matches[0].trimStart()[3];
    return innerChar === '-';
  }

  // Converts the line to be used in places where it was copied to another note
  // because it repeats.
  // Something like:
  // - [ ] This is the task ; Every Sunday
  // - [ ] This is the task ; Every Sunday
  public lineAsRepeated = (): string => this.line.replace(/\[[xX]\]/, '[ ]');

  /**
   * Return whether the line stored is actually a valid Markdown task. NOTE:
   * This uses regex and is not quite as performant as TaskHandler.isLineTask()
   */
  public readonly isTask = (): boolean => taskRe.test(this.line);

  /**
   * Save the contents of this TaskLine back to the file.
   */
  public readonly save = async (): Promise<void> => {
    const fileContents = await this.vault.readFile(this.file, false);
    const lines = fileContents.split('\n');
    lines[this.lineNum] = this._line;
    const newFileContents = lines.join('\n');

    await this.vault.writeFile(this.file, newFileContents);
  };

  public readonly createNextRepetition = async (): Promise<void> => {
    if (!this._repeats) {
      return;
    }

    const currentNoteDate = this.vault.findMomentForDailyNote(this.file);
    const nextDate = window
      .moment(
        this.repeater.asRRule().after(currentNoteDate.endOf('day').toDate()),
      )
      .startOf('day');

    console.debug({
      msg: 'Creating next task repetition',
      repeater: this.repeater.toString(),
      completed_note_date: currentNoteDate,
      next_note_date: nextDate,
    });

    const nextOccurenceFile = await this.vault.getDailyNote(nextDate);
    return addTaskRepetition(
      nextOccurenceFile,
      this,
      this.settings,
      this.vault,
    );
  };

  public readonly move = async (date: Moment): Promise<void> => {
    const newFile = await this.vault.getDailyNote(date);

    await addTaskMove(newFile, this, this.settings, this.vault);

    if (this.settings.preserveMovedTasks) {
      // MARK WITH [>], and preserve
      return markTaskAsCopied(
        this.file,
        this.lineNum,
        this.subContent.length + 1,
        this.vault,
      );
    }

    // Remove this task and subcontent
    return removeLines(
      this.file,
      this.lineNum,
      this.subContent.length + 1,
      this.vault,
    );
  };

  /**
   * Apply the provided repeater to this task, updating the current value if
   * there is already a repeat config, or creating one if not. A blockID will
   * be generated if one does not already exist.
   */
  public readonly handleRepeaterUpdated = (
    repeater: RepeatAdapter,
  ): Promise<void> => {
    if (!this._repeatConfig) {
      // Adding a repeat config to a task that previously did not have one
      this._line = this._line.trimRight() + ' 📅 ' + repeater.toText();
    } else {
      this._line = this._line
        .replace(this._repeatConfig, repeater.toText() + ' ')
        .trim();
    }

    this._repeatConfig = repeater.toText();
    this._repeats = repeater.isValid();
    return this.save();
  };

  public readonly skipOccurence = async (): Promise<void> => {
    if (!this._repeatConfig) {
      new Notice('Cannot skip an occurence of a non-repeating task');
      return;
    }

    if (!this.incomplete) {
      new Notice(
        'Cannot skip a task which has already been checked, moved, or skipped',
      );
      return;
    }

    await this.createNextRepetition();

    this._line = this._line.replace(/\[ \]/, '[-]');
    return this.save();
  };

  /**
   * getSubContent checks for lines which are nested under this task. They may
   * start with any character, they just must be indented more than this line.
   *
   * No blank lines are allowed between this line and the nested content.
   */
  private readonly getSubContent = (lines: string[]): string[] => {
    const toReturn: string[] = [];
    const taskIndentLevel = getLineIndentLevel(this._line);
    // Starting on the line after task, look for sub lines
    for (let i = this.lineNum + 1; i < lines.length; i++) {
      const currentLine = lines[i];
      if (getLineIndentLevel(currentLine) > taskIndentLevel) {
        toReturn.push(currentLine);
      } else {
        break;
      }
    }
    return toReturn;
  };

  /**
   * getHeadings returns all headings this task is under up to and including
   * the settings.tasksHeader. If the task is not nested under
   * settings.tasksHeader, no headings will be returned.
   */
  private readonly getHeadings = (lines: string[]): string[] => {
    const headings: string[] = [];
    // Search up through the file from this task, looking for the first heading
    let nextHeading = -1;
    for (let i = this.lineNum - 1; i >= 0; i--) {
      if (getHeaderDepth(lines[i]) > 0) {
        nextHeading = i;
        break;
      }
    }

    if (nextHeading === -1) {
      // found no headings above this task line
      return [];
    }

    do {
      headings.push(lines[nextHeading]);
      if (lines[nextHeading] === this.settings.tasksHeader) {
        // This is the top level that we care about, so stop searching
        break;
      }

      nextHeading = getParentHeaderIndex(nextHeading, lines);
    } while (nextHeading > -1);

    return headings.reverse();
  };
}

const getParentHeaderIndex = (
  startingHeaderIdx: number,
  lines: string[],
): number => {
  const startingHeaderDepth = getHeaderDepth(lines[startingHeaderIdx]);

  for (let i = startingHeaderIdx - 1; i >= 0; i--) {
    const currentHeaderDepth = getHeaderDepth(lines[i]);
    if (currentHeaderDepth > 0 && currentHeaderDepth < startingHeaderDepth) {
      return i;
    }
  }
  return -1;
};

const getLineIndentLevel = (line: string): number =>
  line.length - line.trimStart().length;

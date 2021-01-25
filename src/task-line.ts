import {
  addTaskMove,
  addTaskRepetition,
  getHeaderDepth,
  removeLines,
  removeTask,
  updateTask,
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

/**
 * Matches the backlink to the original task when a task is moved.
 *   <[[2020-12-31#^task-abcd]]
 *   [[2020-12-31#^task-abcd|< Origin]]
 */
const movedFromRe = /(?:<\[\[([^\]]+)#\^[-a-zA-Z0-9]+(|[^\]]+)?\]\])|(?:\[\[([^\]]+)#\^[-a-zA-Z0-9]+\|< Origin\]\])/;

/**
 * Matces the link to where a task was moved.
 *   >[[2020-12-31]]
 */
const movedToRe = />\[\[([^\]]+)\]\]/;

/**
 * Matches the backlink to where a task repeated from.
 *   <<[[22020-12-31#^task-abcd]]
 *   [[22020-12-31#^task-abcd|<< Origin]]
 */
const repeatsFromRe = /(?:<<\[\[([^\]]+)#\^[-a-zA-Z0-9]+(|[^\]]+)?\]\])|(?:\[\[([^\]]+)#\^[-a-zA-Z0-9]+\|<< Origin\]\])/;

/**
 * Matches a block hash.
 *   ^task-abcd
 */
const blockHashRe = /\^([-a-zA-Z0-9]+)/;

export class TaskLine {
  public readonly lineNum: number;
  public readonly subContent: string[];
  public readonly headings: string[];

  private readonly file: TFile;
  private readonly vault: VaultIntermediate;
  private readonly settings: ISettings;

  private _line: string;

  /**
   * Do not use directly, instead use baseTaskContent() which memoizes.
   */
  private _basetask: string;

  private _repeats: boolean;
  private _repeatConfig: string;
  private _blockID: string;
  private readonly _movedToNoteName: string;
  private readonly _movedFromNoteName: string;
  private readonly _repeatsFromNoteName: string;

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

    const blockIDMatches = blockHashRe.exec(this._line);
    if (
      blockIDMatches &&
      blockIDMatches.length === 2 &&
      blockIDMatches[1] !== ''
    ) {
      this._blockID = blockIDMatches[1];
    } else {
      this._blockID = '';
    }

    const movedFromLink = movedFromRe.exec(this._line);
    if (movedFromLink && movedFromLink.length >= 4) {
      if (movedFromLink[1]) {
        this._movedFromNoteName = movedFromLink[1].split('|')[0];
      } else if (movedFromLink[3]) {
        this._movedFromNoteName = movedFromLink[3].split('|')[0];
      }
    }

    const movedToLink = movedToRe.exec(this._line);
    if (movedToLink) {
      if (movedToLink.length > 1 && movedToLink[1] !== '') {
        this._movedToNoteName = movedToLink[1].split('|')[0];
      }
    }

    const repeatsFromLink = repeatsFromRe.exec(this._line);
    if (repeatsFromLink && repeatsFromLink.length >= 4) {
      if (repeatsFromLink[1]) {
        this._repeatsFromNoteName = repeatsFromLink[1].split('|')[0];
      } else if (repeatsFromLink[3]) {
        // this is the case for when the link is aliased with Origin
        this._repeatsFromNoteName = repeatsFromLink[3].split('|')[0];
      }
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

    const innerChar = matches[0].trimLeft()[3];
    return innerChar === 'x' || innerChar === 'X';
  }

  public get incomplete(): boolean {
    const matches = taskRe.exec(this._line);
    if (!matches) {
      return false;
    }

    const innerChar = matches[0].trimLeft()[3];
    return innerChar === ' ';
  }

  public get moved(): boolean {
    const matches = taskRe.exec(this._line);
    if (!matches) {
      return false;
    }

    const innerChar = matches[0].trimLeft()[3];
    return innerChar === '>';
  }

  public get skipped(): boolean {
    const matches = taskRe.exec(this._line);
    if (!matches) {
      return false;
    }

    const innerChar = matches[0].trimLeft()[3];
    return innerChar === '-';
  }

  // isOriginalInstance indicates if this is the task actually annotated with a
  // block ID, or if instead it is referring to another task by blockID.
  public get isOriginalInstance(): boolean {
    if (this.repeats) {
      return !this.repeatsFrom;
    }

    if (this._movedFromNoteName) {
      return false;
    }

    return true;
  }

  // Converts the line to be used in places where it was moved from another note.
  // Something like:
  // - [ ] This is the task <[[2020-12-25^task-abc123]]
  // - [ ] This is the task [[2020-12-25^task-abc123|< Origin]]
  public lineAsMovedFrom = (): string => {
    const rootTaskLink = `${this.originalFileName()}#^${this._blockID}`;
    const linkPrefix = this.settings.aliasLinks ? '' : '<';
    const alias = this.settings.aliasLinks ? '|< Origin' : '';
    return `${this.baseTaskContent().trimRight()} ${linkPrefix}[[${rootTaskLink}${alias}]]`;
  };

  // Converts the line to be used in places where it was copied to another note
  // because it repeats.
  // Something like:
  // - [ ] This is the task ; Every Sunday <<[[2020-12-25^task-abc123]]
  // - [ ] This is the task ; Every Sunday [[2020-12-25^task-abc123|<< Origin]]
  public lineAsRepeated = (): string => {
    const rootTaskLink = `${this.originalFileName()}#^${this._blockID}`;
    const uncheckedContent = this.baseTaskContent().replace(/\[[xX]\]/, '[ ]');
    const linkPrefix = this.settings.aliasLinks ? '' : '<<';
    const alias = this.settings.aliasLinks ? '|<< Origin' : '';
    return `${uncheckedContent}${linkPrefix}[[${rootTaskLink}${alias}]]`;
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

  public get blockID(): string {
    return this._blockID;
  }

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
    const currentNoteDate = this.vault.findMomentForDailyNote(this.file);
    const nextDate = this.repeater
      .asRRule()
      .after(currentNoteDate.endOf('day').toDate());

    const nextOccurenceFile = await this.vault.getDailyNote(
      window.moment(nextDate),
    );
    return addTaskRepetition(
      nextOccurenceFile,
      this,
      this.settings,
      this.vault,
    );
  };

  public readonly move = async (
    date: Moment,
    createLinks = true,
  ): Promise<void> => {
    if (!this._blockID && createLinks) {
      this.addBlockID();
    }

    const newFile = await this.vault.getDailyNote(date);

    if (newFile.basename === this.originalFileName()) {
      // We are essentially "un-defering" the task
      // Rather than a normal move, delete the line in this file and
      // reset the original line

      const undeferredLine = `${this.baseTaskContent()}^${this._blockID}`;
      await updateTask(newFile, this, undeferredLine, true, this.vault);
      await removeTask(this.file, this, this.vault);
      return;
    }

    await addTaskMove(newFile, this, this.settings, this.vault, createLinks);

    if (createLinks) {
      if (this.subContent.length > 0) {
        await removeLines(
          this.file,
          this.lineNum + 1, // Leave the main line, remove subcontent
          this.subContent.length,
          this.vault,
        );
      }

      // Update the main task line to indicate moved
      this._line = this.lineAsMovedTo(date);
      return this.save();
    }

    // Else, remove this task and subcontent
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
      this.addBlockID();
    } else {
      this._line = this._line
        .replace(this._repeatConfig, this.repeater.toText() + ' ')
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

    await this.addBlockIDIfMissing();
    await this.createNextRepetition();

    this._line = this._line.replace(/\[ \]/, '[-]');
    return this.save();
  };

  public readonly addBlockIDIfMissing = (): Promise<void> => {
    if (this.repeats && !this.blockID) {
      this.addBlockID();
      return this.save();
    }
  };

  // Converts the line to be used in places where it was moved to another note.
  // Something like:
  // - [>] This is the task >[[2020-12-25]] ^task-abc123
  private readonly lineAsMovedTo = (date: Moment): string => {
    const newFileName = this.vault.fileNameForMoment(date);
    const content = this.baseTaskContent().replace(/\[[ xX]\]/, '[>]');

    // If this task was already moved to this location, then we want to preserve
    // the link to where it was moved from
    const movedFrom = this._movedFromNoteName
      ? (() => {
          const linkPrefix = this.settings.aliasLinks ? '' : '<';
          const alias = this.settings.aliasLinks ? '|< Origin' : '';
          return `${linkPrefix}[[${this._movedFromNoteName}#^${this._blockID}${alias}]] `;
        })()
      : '';

    // If this task was already moved to this location, then we should not put
    // the blockID on this line, instead it is included in the movedFrom
    // reference.
    const blockID = movedFrom ? '' : ` ^${this._blockID}`;

    return `${content}${movedFrom}>[[${newFileName}]]${blockID}`;
  };

  /**
   * Create a blockID and append to the line.
   */
  private readonly addBlockID = (): void => {
    if (this._blockID !== '') {
      return;
    }

    this._blockID = createTaskBlockHash();
    this._line = this._line.trimRight() + ' ^' + this._blockID;
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

    if (this._movedFromNoteName) {
      return this._movedFromNoteName;
    }

    if (this._repeatsFromNoteName) {
      return this._repeatsFromNoteName;
    }

    throw new Error(
      `Slated: Unable to find original file name for task: ${this._line}`,
    );
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

const createTaskBlockHash = (): string => {
  let result = 'task-';
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const getLineIndentLevel = (line: string): number =>
  line.length - line.trimLeft().length;

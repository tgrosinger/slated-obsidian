import { invalid } from 'moment';
import { TFile } from 'obsidian';
import { RRule } from 'rrule';
import { SettingsInstance } from 'src/settings';
import { VaultIntermediate } from 'src/vault';

const blockHashRe = /\^[a-zA-Z0-9]+/;

interface RepeatingTaskLine {
  lineNum: number;
  line: string;
  repeatConfig: RRule | undefined;

  /**
   * Indicate that a repeatConfig was detected, but it is not understood.
   */
  invalidRepeatConfig: boolean;

  blockID: string;

  /**
   * Indicates that this blockID was added during parsing, and is not yet saved
   * in the file.
   */
  blockIDUnsaved: boolean;
}

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
    const repeatingTasks = await this.normalizeFileRepeatingTasks(file);
    repeatingTasks
      .filter(({ invalidRepeatConfig }) => !invalidRepeatConfig)
      .forEach(this.propogateRepetitionsForTask);
  }

  /**
   * Ensure that future repetitions of the provided task have been created.
   */
  private propogateRepetitionsForTask(task: RepeatingTaskLine): void {
    // throw new Error('Not implemented');
    console.log('TODO: Propogate task: ' + task.line);
  }

  /**
   * Scan the file looking for tasks with a repeating config. For each
   * repeating task, ensure it has a block ID on the line, and validate the
   * repeating config. Normalized file is saved, then returns a list of
   * RepeatingLineItems.
   */
  private readonly normalizeFileRepeatingTasks = async (
    file: TFile,
  ): Promise<RepeatingTaskLine[]> => {
    const fileContents = await this.vault.readFile(file, false);
    if (!fileContents) {
      return [];
    }

    const splitFileContents = fileContents.split('\n');
    const repeatingTaskLines = splitFileContents
      .map((line, index) => ({ line, lineNum: index }))
      .filter(({ line }) => this.isLineTask(line))
      .map((val) => this.parseTaskLine(val))
      .filter(
        ({ repeatConfig, invalidRepeatConfig }) =>
          repeatConfig || invalidRepeatConfig,
      )
      .map((taskLine) => this.ensureBlockID(taskLine));

    repeatingTaskLines
      .filter((taskLine) => taskLine.blockIDUnsaved)
      .map((taskLine) => (splitFileContents[taskLine.lineNum] = taskLine.line));
    this.vault.writeFile(file, splitFileContents.join('\n'));

    // Notify on invalid repeating configs

    return repeatingTaskLines.map(this.parseTaskLine);
  };

  private parseTaskLine = ({
    line,
    lineNum,
  }: {
    line: string;
    lineNum: number;
  }): RepeatingTaskLine => {
    const blockID = blockHashRe.exec(line);
    const taskLine: RepeatingTaskLine = {
      line,
      lineNum,
      repeatConfig: undefined,
      invalidRepeatConfig: false,
      blockID: blockID && blockID.length === 1 ? blockID[0] : undefined,
      blockIDUnsaved: false,
    };
    this.fillRepeatConfig(taskLine);
    return taskLine;
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

  /**
   * Looks for the repeating config portion of a task line.
   * The repeating config occurs after a semicolon or 📅 but excludes the blockID.
   */
  private readonly fillRepeatConfig = (taskLine: RepeatingTaskLine): void => {
    const lineMinusID = taskLine.line.replace('^' + taskLine.blockID, '');
    let parts = lineMinusID.split('📅');
    if (parts.length === 1) {
      parts = lineMinusID.split(';');
      if (parts.length === 1) {
        // No repeat config defined
        return;
      }
    }
    if (parts.length > 2) {
      taskLine.invalidRepeatConfig = true;
      return;
    }

    taskLine.repeatConfig = RRule.fromText(parts[1]);
  };

  /**
   * If the provided taskLine does not have a blockID, one is created and the
   * blockIDUnsaved flag is set to true. The same taskLine is returned.
   */
  private readonly ensureBlockID = (
    taskLine: RepeatingTaskLine,
  ): RepeatingTaskLine => {
    if (!taskLine.blockID) {
      taskLine.blockID = createTaskBlockHash();
      taskLine.line += ` ^${taskLine.blockID}`;
      taskLine.blockIDUnsaved = true;
    }
    return taskLine;
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

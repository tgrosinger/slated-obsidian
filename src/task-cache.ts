import type { TaskHandler } from './task-handler';
import type { TaskLine } from './task-line';
import type { PeriodicNoteID, VaultIntermediate } from './vault';
import type { TAbstractFile, TFile } from 'obsidian';

export enum NoteType {
  Day = 1,
  Week,
  Month,
}
export interface FileTasks {
  file: TFile;
  type: NoteType;
  tasks: TaskLine[];
}
export class TaskCache {
  private dailyNotes: Record<PeriodicNoteID, TFile>;
  private weeklyNotes: Record<PeriodicNoteID, TFile>;
  private monthlyNotes: Record<PeriodicNoteID, TFile>;
  private hasLoaded: boolean;
  private subscriptions: { id: number; hook: (val: any) => void }[];

  private readonly vault: VaultIntermediate;
  private readonly taskHandler: TaskHandler;

  /**
   * List of Daily, Weekly, and Monthly notes ordered chronologically.
   */
  private periodicNoteList: PeriodicNoteID[];
  private taskLineCache: FileTasks[];

  constructor(taskHandler: TaskHandler, vault: VaultIntermediate) {
    this.vault = vault;
    this.taskHandler = taskHandler;
    this.subscriptions = [];
    this.taskLineCache = [];
    this.hasLoaded = false;

    // this.initialize(); // non-blocking, calls notify when complete
  }

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

  public get loading(): boolean {
    return !this.hasLoaded;
  }

  /**
   * The set function implements the Store interface in Svelte. We are not
   * actually using it to store new values, but it is needed when binding to
   * properties.
   */
  public readonly set = (_: any): void => {};

  public get files(): FileTasks[] {
    return this.taskLineCache;
  }

  public readonly fileOpenHook = async (file: TFile): Promise<void> => {
    const cache = this.taskLineCache.find((ft) => ft.file === file);
    if (cache) {
      cache.tasks = await this.taskHandler.getFileTasks(file);
      this.notify();
    }
  };

  public readonly fileCreateHook = (file: TAbstractFile): void => {
    // TODO: A more granular addition of the new file would be more efficient
    // Cannot call initialize on every file-create event because Obsidian fires
    // that event for ever single file when first starting.
    // this.initialize(); // non-blocking
  };

  public readonly fileDeleteHook = (file: TAbstractFile): void => {
    // TODO: A more granular removal of the file would be more efficient
    this.initialize(); // non-blocking
  };

  public readonly fileRenameHook = (
    file: TAbstractFile,
    oldPath: string,
  ): void => {
    // TODO: A more granular update of the file would be more efficient
    this.initialize(); // non-blocking
  };

  /**
   * Notify subscriptions of a change.
   */
  public readonly notify = (): void => {
    this.subscriptions.forEach(({ hook }) => hook(this));
  };

  /**
   * Load any necessary state asynchronously
   */
  public readonly initialize = async (): Promise<void> => {
    console.log('initializing');
    this.dailyNotes = this.vault.getDailyNotes();
    this.weeklyNotes = this.vault.getWeeklyNotes();
    this.monthlyNotes = this.vault.getMonthlyNotes();
    this.periodicNoteList = this.listFiles();
    await this.populateTaskLineCache();

    this.hasLoaded = true;
    this.notify();
  };

  private readonly getFileForPeriodicNote = (id: PeriodicNoteID): TFile => {
    switch (id.split('-', 1)[0]) {
      case 'day':
        return this.dailyNotes[id];
      case 'week':
        return this.weeklyNotes[id];
      case 'month':
        return this.monthlyNotes[id];
    }
    return undefined;
  };

  private readonly noteTypeForPeriodicNote = (id: PeriodicNoteID): NoteType => {
    switch (id.split('-', 1)[0]) {
      case 'day':
        return NoteType.Day;
      case 'week':
        return NoteType.Week;
      case 'month':
        return NoteType.Month;
    }
    return undefined;
  };

  private readonly populateTaskLineCache = async (): Promise<void> => {
    const files = await Promise.all(
      this.periodicNoteList.map(
        async (periodicNoteID): Promise<FileTasks> => {
          const file = this.getFileForPeriodicNote(periodicNoteID);
          return {
            file,
            type: this.noteTypeForPeriodicNote(periodicNoteID),
            tasks: file ? await this.taskHandler.getFileTasks(file) : [],
          };
        },
      ),
    );

    this.taskLineCache = files.filter((f) => f.tasks.length > 0);
    this.hasLoaded = true;
  };

  /**
   * Returns a list of daily/weekly/monthly note files.
   * NOTE: The values returned are not actually file names, but values similar to:
   *   - day-2021-02-12T00:00:00-08:00
   *   - week-2021-02-21T00:00:00-08:00
   *   - month-2021-02-01T00:00:00-08:00
   */
  private readonly listFiles = (): PeriodicNoteID[] => {
    const dailyNoteKeys = Object.keys(this.dailyNotes).reverse();
    const weeklyNoteKeys = Object.keys(this.weeklyNotes).reverse();
    const monthlyNoteKeys = Object.keys(this.monthlyNotes).reverse();

    let weeklyI = 0;
    let monthlyI = 0;

    const orderedNoteNames: PeriodicNoteID[] = [];

    for (const currentDailyNote of dailyNoteKeys) {
      if (
        monthlyNoteKeys.length > monthlyI &&
        this.after(currentDailyNote, monthlyNoteKeys[monthlyI])
      ) {
        orderedNoteNames.push(monthlyNoteKeys[monthlyI]);
        monthlyI++;
      }
      if (
        weeklyNoteKeys.length > weeklyI &&
        this.after(currentDailyNote, weeklyNoteKeys[weeklyI])
      ) {
        orderedNoteNames.push(weeklyNoteKeys[weeklyI]);
        weeklyI++;
      }
      orderedNoteNames.push(currentDailyNote);
    }

    for (; weeklyI < weeklyNoteKeys.length; weeklyI++) {
      const currentWeeklyNote = weeklyNoteKeys[weeklyI];
      if (
        monthlyNoteKeys.length > monthlyI &&
        this.after(currentWeeklyNote, monthlyNoteKeys[monthlyI])
      ) {
        orderedNoteNames.push(monthlyNoteKeys[monthlyI]);
        monthlyI++;
      }
      orderedNoteNames.push(currentWeeklyNote);
    }

    for (; monthlyI < monthlyNoteKeys.length; monthlyI++) {
      orderedNoteNames.push(monthlyNoteKeys[monthlyI]);
    }

    return orderedNoteNames;
  };

  /**
   * Returns true if the first note name is later chronologically than the first.
   * Expects note names to be similar to:
   *   - day-2021-02-12T00:00:00-08:00
   *   - week-2021-02-21T00:00:00-08:00
   *   - month-2021-02-01T00:00:00-08:00
   */
  private readonly after = (name1: string, name2: string): boolean => {
    const d1 = window.moment(name1.substring(name1.indexOf('-') + 1));
    const d2 = window.moment(name2.substring(name2.indexOf('-') + 1));
    return d1.isAfter(d2);
  };
}

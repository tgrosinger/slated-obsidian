import type { TFile } from 'obsidian';
import type { TaskHandler } from './task-handler';
import type { TaskLine } from './task-line';
import type { VaultIntermediate } from './vault';

export type periodicNoteID = string;

export enum noteType {
  Day = 1,
  Week,
  Month,
}
export interface fileTasks {
  file: TFile;
  type: noteType;
  tasks: TaskLine[];
}
export class TaskCache {
  private dailyNotes: Record<periodicNoteID, TFile>;
  private weeklyNotes: Record<periodicNoteID, TFile>;
  private monthlyNotes: Record<periodicNoteID, TFile>;
  private hasLoaded: boolean;
  private subscriptions: { id: number; hook: (val: any) => void }[];

  private vault: VaultIntermediate;
  private taskHandler: TaskHandler;

  /**
   * List of Daily, Weekly, and Monthly notes ordered chronologically.
   */
  private periodicNoteList: periodicNoteID[];
  private taskLineCache: fileTasks[];

  constructor(taskHandler: TaskHandler, vault: VaultIntermediate) {
    this.dailyNotes = vault.getDailyNotes();
    this.weeklyNotes = vault.getWeeklyNotes();
    this.monthlyNotes = vault.getMonthlyNotes();
    this.vault = vault;
    this.taskHandler = taskHandler;
    this.subscriptions = [];
    this.taskLineCache = [];
    this.hasLoaded = false;

    this.initialize(); // non-blocking, calls notify when complete
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

    console.log('adding sub');

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

  public get files(): fileTasks[] {
    return this.taskLineCache;
  }

  /**
   * Notify subscriptions of a change.
   */
  public readonly notify = (): void => {
    console.log('notifying');
    this.subscriptions.forEach(({ hook }) => hook(this));
  };

  /**
   * Load any necessary state asynchronously
   */
  private readonly initialize = async (): Promise<void> => {
    this.periodicNoteList = this.listFiles();
    await this.populateTaskLineCache();

    this.hasLoaded = true;
    this.notify();
  };

  private readonly getFileForPeriodicNote = (id: periodicNoteID): TFile => {
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

  private readonly noteTypeForPeriodicNote = (id: periodicNoteID): noteType => {
    switch (id.split('-', 1)[0]) {
      case 'day':
        return noteType.Day;
      case 'week':
        return noteType.Week;
      case 'month':
        return noteType.Month;
    }
    return undefined;
  };

  private readonly populateTaskLineCache = async (): Promise<void> => {
    const files = await Promise.all(
      this.periodicNoteList.map(
        async (periodicNoteID): Promise<fileTasks> => {
          const file = this.getFileForPeriodicNote(periodicNoteID);
          return {
            file: file,
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
  private readonly listFiles = (): periodicNoteID[] => {
    const dailyNoteKeys = Object.keys(this.dailyNotes).reverse();
    const weeklyNoteKeys = Object.keys(this.weeklyNotes).reverse();
    const monthlyNoteKeys = Object.keys(this.monthlyNotes).reverse();

    let weeklyI = 0;
    let monthlyI = 0;

    const orderedNoteNames: periodicNoteID[] = [];

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

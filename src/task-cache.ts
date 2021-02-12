import type { TFile } from 'obsidian';
import type { TaskHandler } from './task-handler';
import type { TaskLine } from './task-line';
import type { VaultIntermediate } from './vault';

export type periodicNoteID = string;
export class TaskCache {
  private dailyNotes: Record<periodicNoteID, TFile>;
  private weeklyNotes: Record<periodicNoteID, TFile>;
  private monthlyNotes: Record<periodicNoteID, TFile>;

  private vault: VaultIntermediate;
  private taskHandler: TaskHandler;

  constructor(taskHandler: TaskHandler, vault: VaultIntermediate) {
    this.dailyNotes = vault.getDailyNotes();
    this.weeklyNotes = vault.getWeeklyNotes();
    this.monthlyNotes = vault.getMonthlyNotes();
    this.vault = vault;
    this.taskHandler = taskHandler;
  }

  public readonly getTasksForPeriodicNote = async (
    id: periodicNoteID,
  ): Promise<TaskLine[]> => {
    let file: TFile;
    switch (id.split('-', 1)[0]) {
      case 'day':
        file = this.dailyNotes[id];
      case 'week':
        file = this.weeklyNotes[id];
      case 'month':
        file = this.monthlyNotes[id];
    }

    if (!file) {
      return [];
    }

    return this.taskHandler.getFileTasks(file);
  };

  /**
   * Returns a list of daily/weekly/monthly note files.
   * NOTE: The values returned are not actually file names, but values similar to:
   *   - day-2021-02-12T00:00:00-08:00
   *   - week-2021-02-21T00:00:00-08:00
   *   - month-2021-02-01T00:00:00-08:00
   */
  public readonly listFiles = (
    incWeekly = true,
    incMonthly = true,
  ): periodicNoteID[] => {
    const dailyNoteKeys = Object.keys(this.dailyNotes);
    const weeklyNoteKeys = incWeekly ? Object.keys(this.weeklyNotes) : [];
    const monthlyNoteKeys = incMonthly ? Object.keys(this.monthlyNotes) : [];

    let weeklyI = 0;
    let monthlyI = 0;

    const orderedNoteNames: periodicNoteID[] = [];

    for (let dailyI = 0; dailyI < dailyNoteKeys.length; dailyI++) {
      const currentDailyNote = dailyNoteKeys[dailyI];

      if (monthlyNoteKeys.length > 0) {
        if (this.after(currentDailyNote, monthlyNoteKeys[monthlyI])) {
          orderedNoteNames.push(monthlyNoteKeys[monthlyI]);
          monthlyI++;
        }
      }

      if (weeklyNoteKeys.length > 0) {
        if (this.after(currentDailyNote, weeklyNoteKeys[weeklyI])) {
          orderedNoteNames.push(weeklyNoteKeys[weeklyI]);
          weeklyI++;
        }
      }

      orderedNoteNames.push(currentDailyNote);
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
    const d1 = window.moment(name1.substring(name1.indexOf('-')));
    const d2 = window.moment(name2.substring(name2.indexOf('-')));
    return d1.isAfter(d2);
  };
}

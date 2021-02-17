import type { Moment } from 'moment';
import type { TFile, Vault } from 'obsidian';
import {
  createDailyNote,
  getAllDailyNotes,
  getAllMonthlyNotes,
  getAllWeeklyNotes,
  getDailyNote,
  getDailyNoteSettings,
  getMonthlyNoteSettings,
  getWeeklyNoteSettings,
  IPeriodicNoteSettings,
} from 'obsidian-daily-notes-interface';

export type PeriodicNoteID = string;

type IGranularity = 'day' | 'week' | 'month';

export class VaultIntermediate {
  private readonly vault: Vault;

  constructor(vault: Vault) {
    this.vault = vault;
  }

  public getDailyNotes = (): Record<string, TFile> => getAllDailyNotes();
  public getWeeklyNotes = (): Record<string, TFile> => getAllWeeklyNotes();
  public getMonthlyNotes = (): Record<string, TFile> => getAllMonthlyNotes();

  public getDailyNote = (date: Moment): Promise<TFile> => {
    const desiredNote = getDailyNote(date, getAllDailyNotes());
    if (desiredNote) {
      return Promise.resolve(desiredNote);
    }
    return this.createDailyNote(date);
  };

  public createDailyNote = (date: Moment): Promise<TFile> =>
    createDailyNote(date);

  public findMomentForDailyNote = (file: TFile): Moment | undefined => {
    const { format } = getDailyNoteSettings();
    const date = window.moment(file.basename, format, true);
    return date.isValid() ? date : null;
  };

  public fileNameForMoment = (date: Moment): string =>
    date.format(getDailyNoteSettings().format);

  public readFile = (file: TFile, useCache: boolean): Promise<string> =>
    useCache ? this.vault.cachedRead(file) : this.vault.read(file);

  public writeFile = (file: TFile, data: string): Promise<void> =>
    this.vault.modify(file, data);

  /**
   * NOTE: Untested, ended up needing after writing this,
   * but it seemed useful so I kept it just in case.
   *
   * Returns a periodic note ID for the file.
   * NOTE: The values returned are not actually file names, but values similar to:
   *   - day-2021-02-12T00:00:00-08:00
   *   - week-2021-02-21T00:00:00-08:00
   *   - month-2021-02-01T00:00:00-08:00
   */
  public getPeriodicNoteIDForFile = (file: TFile): PeriodicNoteID => {
    const dSettings = getDailyNoteSettings();
    let uid = this.getDateUID(file, dSettings, 'day');
    if (uid) {
      return uid;
    }

    const wSettings = getWeeklyNoteSettings();
    uid = this.getDateUID(file, wSettings, 'week');
    if (uid) {
      return uid;
    }

    const mSettings = getMonthlyNoteSettings();
    uid = this.getDateUID(file, mSettings, 'month');
    if (uid) {
      return uid;
    }
  };

  /**
   * NOTE: Untested, ended up needing after writing this,
   * but it seemed useful so I kept it just in case.
   */
  private readonly getDateUID = (
    file: TFile,
    settings: IPeriodicNoteSettings,
    granularity: IGranularity,
  ): PeriodicNoteID | undefined => {
    if (settings.folder && !file.path.startsWith(settings.folder)) {
      return undefined; // Not in the right folder
    }

    const date = window.moment(file.basename, settings.format, true);
    if (date.isValid()) {
      return `${granularity}-${date.startOf(granularity).format()}`;
    }
  };
}

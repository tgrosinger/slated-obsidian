import type { Moment } from 'moment';
import type { TFile, Vault } from 'obsidian';
import {
  createDailyNote,
  getAllDailyNotes,
  getDailyNote,
  getDailyNoteSettings,
} from 'obsidian-daily-notes-interface';

const moment = window.moment;

export class VaultIntermediate {
  private readonly vault: Vault;

  constructor(vault: Vault) {
    this.vault = vault;
  }

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
    const date = moment(file.basename, format, true);
    return date.isValid() ? date : null;
  };

  public fileNameForMoment = (date: Moment): string =>
    date.format(getDailyNoteSettings().format);

  public readFile = (file: TFile, useCache: boolean): Promise<string> =>
    useCache ? this.vault.cachedRead(file) : this.vault.read(file);

  public writeFile = (file: TFile, data: string): Promise<void> =>
    this.vault.modify(file, data);
}

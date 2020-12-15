import type { Moment } from 'moment';
import moment from 'moment';
import type { Result } from 'neverthrow';
import type { TFile, Vault } from 'obsidian';
import {
  createDailyNote,
  getAllDailyNotes,
  getDailyNote,
  getDailyNoteSettings,
  IDailyNote,
} from 'obsidian-daily-notes-interface';

export class VaultIntermediate {
  private readonly vault: Vault;

  constructor(vault: Vault) {
    this.vault = vault;
  }

  public getDailyNote = (
    date: Moment,
    dailyNotes?: IDailyNote[],
  ): Promise<TFile> => {
    const _dailyNotes = dailyNotes || this.getAllDailyNotes();
    const desiredNote = getDailyNote(date, _dailyNotes);
    if (desiredNote) {
      return Promise.resolve(desiredNote);
    }
    return this.createDailyNote(date);
  };

  public createDailyNote = (date: Moment): Promise<TFile> =>
    createDailyNote(date);

  public getAllDailyNotes = (): IDailyNote[] => getAllDailyNotes();

  public setDailyNoteContents = (
    date: Moment,
    contents: string,
  ): Result<void, Error> => {
    throw new Error('Method not implemented.');
  };

  public findMomentForDailyNote = (file: TFile): Moment | undefined => {
    const { format } = getDailyNoteSettings();
    const date = moment(file.basename, format, true);
    return date.isValid() ? date : null;
  };

  public readFile = (file: TFile, useCache: boolean): Promise<string> =>
    useCache ? this.vault.cachedRead(file) : this.vault.read(file);

  public writeFile = (file: TFile, data: string): Promise<void> =>
    this.vault.modify(file, data);
}

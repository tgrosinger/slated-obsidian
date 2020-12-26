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
  private dailyNoteCache: IDailyNote[] | undefined;

  constructor(vault: Vault) {
    this.vault = vault;
  }

  public getDailyNote = (date: Moment): Promise<TFile> => {
    const desiredNote = getDailyNote(date, this.getAllDailyNotes());
    if (desiredNote) {
      return Promise.resolve(desiredNote);
    }
    return this.createDailyNote(date);
  };

  public createDailyNote = (date: Moment): Promise<TFile> =>
    createDailyNote(date);

  public getAllDailyNotes = (): IDailyNote[] => {
    if (this.dailyNoteCache === undefined) {
      this.dailyNoteCache = getAllDailyNotes();
    }
    return this.dailyNoteCache;
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

  public getFileByName = (fileName: string) => {
    return this.vault
      .getMarkdownFiles()
      .filter(({ basename }) => basename === fileName);
  };
}

import moment from 'moment';
import { Moment } from 'moment';
import { Result } from 'neverthrow';
import { TFile, Vault } from 'obsidian';
import {
  createDailyNote,
  getDailyNoteSettings,
} from 'obsidian-daily-notes-interface';

export class VaultIntermediate {
  private readonly vault: Vault;

  constructor(vault: Vault) {
    this.vault = vault;
  }

  public getDailyNote = (date: Moment): Promise<TFile> => createDailyNote(date);

  public setDailyNoteContents = (
    date: Moment,
    contents: string,
  ): Result<void, Error> => {
    throw new Error('Method not implemented.');
  };

  public findMomentForDailyNote = (file: TFile): Moment | undefined => {
    let { format } = getDailyNoteSettings();
    const date = moment(file.basename, format, true);
    return date.isValid() ? date : null;
  };

  public readFile = (file: TFile, useCache: boolean): Promise<string> =>
    useCache ? this.vault.cachedRead(file) : this.vault.read(file);

  public writeFile = (file: TFile, data: string): Promise<void> =>
    this.vault.modify(file, data);
}

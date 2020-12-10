import { Moment } from 'moment';
import { Result } from 'neverthrow';
import { TFile, Vault } from 'obsidian';
import { createDailyNote } from 'obsidian-daily-notes-interface';

export class VaultIntermediate {
  private readonly vault: Vault;

  constructor(vault: Vault) {
    this.vault = vault;
  }

  public getDailyNoteContents = (date: Moment): string => {
    const file = createDailyNote(date);
    throw new Error('Method not implemented.');
  };

  public setDailyNoteContents = (
    date: Moment,
    contents: string,
  ): Result<void, Error> => {
    throw new Error('Method not implemented.');
  };

  public readFile = (file: TFile, useCache: boolean): Promise<string> =>
    useCache ? this.vault.cachedRead(file) : this.vault.read(file);

  public writeFile = (file: TFile, data: string): Promise<void> =>
    this.vault.modify(file, data);
}

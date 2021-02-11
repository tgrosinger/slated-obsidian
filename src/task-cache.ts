import type { TFile } from 'obsidian';
import type { VaultIntermediate } from './vault';

class NoteCache {}

export class TaskCache {
  private dailyNotes: Record<string, NoteCache>;
  private weeklyNotes: Record<string, NoteCache>;
  private monthlyNotes: Record<string, NoteCache>;

  constructor(vault: VaultIntermediate) {
    this.dailyNotes = this.populateNoteCache(vault.getDailyNotes());
    this.weeklyNotes = this.populateNoteCache(vault.getWeeklyNotes());
    this.monthlyNotes = this.populateNoteCache(vault.getMonthlyNotes());
  }

  public readonly iteratefiles = (
    incDaily: boolean,
    incWeekly: boolean,
    incMonthly: boolean,
  ): NoteCache[] => {
    return [];
  };

  private readonly populateNoteCache = (
    notes: Record<string, TFile>,
  ): Record<string, NoteCache> => {
    const toReturn: Record<string, TFile> = {};
    return toReturn;
  };
}

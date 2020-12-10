import { ISettings, SettingsInstance } from './settings';
import { TaskHandler } from './task-handler';
import { VaultIntermediate } from './vault';
import { Plugin, TFile } from 'obsidian';

export default class SlatedPlugin extends Plugin {
  private taskHandler: TaskHandler;
  private settings: ISettings;

  public async onload(): Promise<void> {
    await this.loadSettings();

    const vault = new VaultIntermediate(this.app.vault);
    this.taskHandler = new TaskHandler(vault, this.settings);

    this.registerEvent(
      this.app.workspace.on('file-open', (file: TFile) => {
        // This callback is fired whenever a file receives focus
        // not just when the file is first opened.
        this.taskHandler.processFile(file);
      }),
    );
    this.registerEvent(
      this.app.vault.on('modify', (file: TFile) => {
        // This callback is fired whenever a file is saved
        this.taskHandler.processFile(file);
      }),
    );
  }

  private async loadSettings(): Promise<void> {
    const loadedSettings = await this.loadData();
    this.settings = new SettingsInstance(loadedSettings);
  }
}

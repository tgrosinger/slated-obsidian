export const defaultSettings: Partial<ISettings> = {
  tasksHeader: '## Tasks',
  blankLineAfterHeader: true,
};
export interface ISettings {
  tasksHeader: string;
  blankLineAfterHeader: boolean;
}

export class SettingsInstance implements ISettings {
  public readonly tasksHeader: string;
  public readonly blankLineAfterHeader: boolean;
  constructor(loadedData: Partial<ISettings>) {
    const allFields = { ...defaultSettings, ...loadedData };
    this.tasksHeader = allFields.tasksHeader;
    this.blankLineAfterHeader = allFields.blankLineAfterHeader;
  }
}

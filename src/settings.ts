export const defaultSettings: Partial<ISettings> = {
  tasksHeader: '## Tasks',
  blankLineAfterHeader: true,
  aliasLinks: true,
};
export interface ISettings {
  tasksHeader: string;
  blankLineAfterHeader: boolean;
  aliasLinks: boolean;
}

export class SettingsInstance implements ISettings {
  public tasksHeader: string;
  public blankLineAfterHeader: boolean;
  public aliasLinks;
  constructor(loadedData: Partial<ISettings>) {
    const allFields = { ...defaultSettings, ...loadedData };
    this.tasksHeader = allFields.tasksHeader;
    this.blankLineAfterHeader = allFields.blankLineAfterHeader;
    this.aliasLinks = allFields.aliasLinks;
  }
}

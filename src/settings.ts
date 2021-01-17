const defaultSettings: Partial<ISettings> = {
  tasksHeader: '## Tasks',
  blankLineAfterHeader: true,
  aliasLinks: true,
};
export interface ISettings {
  tasksHeader: string;
  blankLineAfterHeader: boolean;
  aliasLinks: boolean;
}

export const settingsWithDefaults = (settings: Partial<ISettings>): ISettings =>
  ({ ...defaultSettings, ...settings});

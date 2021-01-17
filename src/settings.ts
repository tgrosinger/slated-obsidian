export interface ISettings {
  tasksHeader: string;
  blankLineAfterHeader: boolean;
  aliasLinks: boolean;
}

const defaultSettings: ISettings = {
  tasksHeader: '## Tasks',
  blankLineAfterHeader: true,
  aliasLinks: true,
};

export const settingsWithDefaults = (
  settings: Partial<ISettings>,
): ISettings => ({ ...defaultSettings, ...settings });

export interface ISettings {
  tasksHeader: string;
  blankLineAfterHeader: boolean;
  aliasLinks: boolean;
  enableTaskView: boolean;
}

const defaultSettings: ISettings = {
  tasksHeader: '## Tasks',
  blankLineAfterHeader: true,
  aliasLinks: true,
  enableTaskView: false,
};

export const settingsWithDefaults = (
  settings: Partial<ISettings>,
): ISettings => ({ ...defaultSettings, ...settings });

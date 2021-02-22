import type { ILocaleOverride, IWeekStartOption } from 'obsidian-calendar-ui';

export interface ISettings {
  tasksHeader: string;
  blankLineAfterHeader: boolean;
  aliasLinks: boolean;
  moveSubItems: boolean;
  enableTaskView: boolean;

  // Calendar view
  localeOverride: ILocaleOverride;
  weekStart: IWeekStartOption;
}

const defaultSettings: ISettings = {
  tasksHeader: '## Tasks',
  blankLineAfterHeader: true,
  aliasLinks: true,
  moveSubItems: true,
  enableTaskView: false,

  localeOverride: 'system-default',
  weekStart: 'locale',
};

export const settingsWithDefaults = (
  settings: Partial<ISettings>,
): ISettings => ({ ...defaultSettings, ...settings });

import type { ILocaleOverride, IWeekStartOption } from 'obsidian-calendar-ui';

export interface ISettings {
  tasksHeader: string;
  blankLineAfterHeader: boolean;

  // Notifications
  displayedRemoveLinksNotice: boolean;

  // Calendar view
  localeOverride: ILocaleOverride;
  weekStart: IWeekStartOption;
}

const defaultSettings: ISettings = {
  tasksHeader: '## Tasks',
  blankLineAfterHeader: true,

  displayedRemoveLinksNotice: false,

  localeOverride: 'system-default',
  weekStart: 'locale',
};

export const settingsWithDefaults = (
  settings: Partial<ISettings>,
): ISettings => ({ ...defaultSettings, ...settings });

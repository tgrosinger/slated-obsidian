import type { App } from 'obsidian';
import { configureGlobalMomentLocale } from 'obsidian-calendar-ui';
import type { ISettings } from 'src/settings';

export const shouldConfigureGlobalMoment = (app: App): boolean =>
  // XXX: If the calendar plugin is installed, just use those settings.
  // Otherwise, we are responsible for configuring weekStart and localeOverride.
  !(app as any).plugins.getPlugin('calendar')?._loaded;

export const tryToConfigureGlobalMoment = (
  app: App,
  settings: ISettings,
): void => {
  // XXX: If the calendar plugin is installed, just use those settings.
  // Otherwise, we are responsible for configuring weekStart and localeOverride.
  if (shouldConfigureGlobalMoment(app)) {
    configureGlobalMomentLocale(settings.localeOverride, settings.weekStart);
  }
};

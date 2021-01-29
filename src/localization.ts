import type { App } from 'obsidian';
import { configureGlobalMomentLocale } from 'obsidian-calendar-ui';

import type { ISettings } from 'src/settings';

export function shouldConfigureGlobalMoment(app: App) {
  // XXX: If the calendar plugin is installed, just use those settings.
  // Otherwise, we are responsible for configuring weekStart and localeOverride.
  return !(<any>app).plugins.getPlugin('calendar')?._loaded;
}

export function tryToConfigureGlobalMoment(app: App, settings: ISettings) {
  // XXX: If the calendar plugin is installed, just use those settings.
  // Otherwise, we are responsible for configuring weekStart and localeOverride.
  if (shouldConfigureGlobalMoment) {
    configureGlobalMomentLocale(settings.localeOverride, settings.weekStart);
  }
}

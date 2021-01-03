import type { Moment } from 'moment';
import type { CalendarSource, IDayMetadata } from 'obsidian-calendar-ui';

// This is the minimal code necessary to satisfy the interface without actually
// adding any functionality. The MetadataCache class will likely be altered in
// the future and this might be worth revisiting.
export class DummyMetadataSource implements CalendarSource {
  public getDailyMetadata(date: Moment, ...args: any[]): IDayMetadata {
    return { dots: Promise.resolve([]), classes: [], dataAttributes: [] };
  }
  public getWeeklyMetadata(date: Moment, ...args: any[]): IDayMetadata {
    return { dots: Promise.resolve([]), classes: [], dataAttributes: [] };
  }
}

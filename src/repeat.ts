import type RRule from 'rrule';
import { Frequency as RFrequency } from 'rrule';

export enum Frequency {
  None = 'NONE',
  Daily = 'DAILY',
  Weekly = 'WEEKLY',
  Monthly = 'MONTHLY',
  Yearly = 'YEARLY',
}

export class RepeatAdapter {
  private readonly rrule: RRule;

  constructor(rrule: RRule) {
    this.rrule = rrule;
  }

  public isValid = (): boolean => this.rrule.toString() !== '';

  public next = (count: number): Date[] =>
    this.rrule.all((_, len) => len < count);

  public toText = (): string =>
    this.rrule.isFullyConvertibleToText()
      ? this.rrule.toText()
      : this.rrule.toString();

  public frequency = (): Frequency => {
    switch (this.rrule.options.freq) {
      case RFrequency.YEARLY:
        return Frequency.Yearly;
      case RFrequency.MONTHLY:
        return Frequency.Monthly;
      case RFrequency.WEEKLY:
        return Frequency.Weekly;
      case RFrequency.DAILY:
        return Frequency.Daily;
      default:
        // TODO: Display a notification instead?
        throw new Error(
          `Invalid frequency ${this.rrule.options.freq} in repetition`,
        );
    }
  };
}

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
  private readonly modifiedHook: () => void;

  constructor(rrule: RRule, modifiedHook: () => void) {
    this.rrule = rrule;
    this.modifiedHook = modifiedHook;
  }

  public isValid = (): boolean => this.rrule.toString() !== '';

  public next = (count: number): Date[] =>
    this.rrule.all((_, len) => len < count);

  public toText = (): string =>
    this.rrule.isFullyConvertibleToText()
      ? this.rrule.toText()
      : this.rrule.toString();

  public get frequency(): Frequency {
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
  }

  public set frequency(frequency: Frequency) {
    switch (frequency) {
      case Frequency.Yearly:
        this.rrule.options.freq = RFrequency.YEARLY;
        break;
      case Frequency.Monthly:
        this.rrule.options.freq = RFrequency.MONTHLY;
        break;
      case Frequency.Weekly:
        this.rrule.options.freq = RFrequency.WEEKLY;
        break;
      case Frequency.Daily:
        this.rrule.options.freq = RFrequency.DAILY;
        break;
      default:
        // TODO: Display a notification instead?
        throw new Error(`Invalid frequency ${frequency} requested`);
    }

    this.modifiedHook();
  }
}

import type RRule from 'rrule';
import { Frequency as RFrequency } from 'rrule';
import { ALL_WEEKDAYS, WeekdayStr, Weekday } from 'rrule/dist/esm/src/weekday';

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
        this.rrule.origOptions.freq = RFrequency.YEARLY;
        break;
      case Frequency.Monthly:
        this.rrule.options.freq = RFrequency.MONTHLY;
        this.rrule.origOptions.freq = RFrequency.MONTHLY;
        break;
      case Frequency.Weekly:
        this.rrule.options.freq = RFrequency.WEEKLY;
        this.rrule.origOptions.freq = RFrequency.WEEKLY;
        break;
      case Frequency.Daily:
        this.rrule.options.freq = RFrequency.DAILY;
        this.rrule.origOptions.freq = RFrequency.DAILY;
        break;
      default:
        // TODO: Display a notification instead?
        throw new Error(`Invalid frequency ${frequency} requested`);
    }

    // reset other config options
    this.rrule.options.bymonth = undefined;
    this.rrule.origOptions.bymonth = undefined;
    this.rrule.options.bymonthday = undefined;
    this.rrule.origOptions.bymonthday = undefined;
    this.rrule.options.byweekday = undefined;
    this.rrule.origOptions.byweekday = undefined;

    this.modifiedHook();
  }

  public get interval(): number {
    return this.rrule.options.interval;
  }

  public set interval(n: number) {
    // do not set to null or 0
    const newVal = n ? n : 1;

    if (newVal !== this.rrule.options.interval) {
      this.rrule.options.interval = n ? n : 1;
      this.modifiedHook();
    }
  }

  public setDaysOfWeek = (ids: string[]): void => {
    const weekdayList: Weekday[] = new Array(ids.length);
    const numberList: number[] = new Array(ids.length);

    for (let i = 0; i < ids.length; i++) {
      // TODO: Can this be done without the type assertion?
      const n = ALL_WEEKDAYS.indexOf(ids[i] as WeekdayStr);
      weekdayList[i] = new Weekday(n);
      numberList[i] = n;
    }

    this.rrule.origOptions.byweekday = weekdayList;
    this.rrule.options.byweekday = numberList;

    this.modifiedHook();
  };

  public get daysOfWeek(): string[] {
    const weekdays = this.rrule.origOptions.byweekday;
    if (!weekdays) {
      return [];
    } else if (Array.isArray(weekdays)) {
      return weekdays.map((day) => day.toString());
    } else {
      return [weekdays.toString()];
    }
  }

  public get dayOfMonth(): number | null {
    const day = this.rrule.origOptions.bymonthday;
    if (Array.isArray(day)) {
      if (day.length > 0) {
        return day[0];
      }
      return null;
    }

    return day;
  }

  public set dayOfMonth(n: number) {
    this.rrule.origOptions.bymonthday = n;
    this.rrule.options.bymonthday = [n];

    // Incompatible with day of month
    this.rrule.origOptions.byweekday = [];

    this.modifiedHook();
  }

  public set lastDayOfMonth(val: boolean) {
    if (val) {
      this.rrule.origOptions.bymonthday = -1;
      this.rrule.options.bymonthday = [-1];
    } else {
      this.rrule.origOptions.bymonthday = [];
      this.rrule.options.bymonthday = [];
    }

    this.modifiedHook();
  }

  public get lastDayOfMonth(): boolean {
    const day = this.rrule.origOptions.bymonthday;
    if (Array.isArray(day)) {
      return day.length > 0 ? day[0] === -1 : false;
    }
    return day === -1;
  }

  public setWeekDaysOfMonth = (
    selected: { week: string; weekDay: string }[],
  ): void => {
    this.rrule.origOptions.byweekday = selected.map(
      ({ week, weekDay }): Weekday => {
        return new Weekday(parseInt(weekDay), parseInt(week));
      },
    );

    // Incompatible with week days of month
    this.rrule.origOptions.bymonthday = undefined;
    this.rrule.options.bymonthday = [];

    this.modifiedHook();
  };

  public getWeekDaysOfMonth = (): { week: string; weekDay: string }[] => {
    const weekdays = this.rrule.origOptions.byweekday;
    if (Array.isArray(weekdays)) {
      return weekdays
        .filter((day): day is Weekday => {
          return typeof day !== 'string' && typeof day !== 'number';
        })
        .filter((day) => {
          return day.n !== undefined;
        })
        .map((day) => {
          return { week: day.n.toString(), weekDay: day.weekday.toString() };
        });
    }

    // TODO: This might be overly restrictive, if people write custom RRule syntax.
    return [];
  };

  public get monthsOfYear(): string[] {
    const months = this.rrule.origOptions.bymonth;
    if (months === undefined) {
      return [];
    }
    if (typeof months === 'number') {
      return [months.toString()];
    }
    return months.map((n) => n.toString());
  }

  public setMonthsOfYear = (ids: string[]): void => {
    this.rrule.origOptions.bymonth = ids.map((n) => parseInt(n));
    this.rrule.options.bymonth = this.rrule.origOptions.bymonth;

    this.modifiedHook();
  };
}

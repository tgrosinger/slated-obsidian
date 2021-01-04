import RRule, { ByWeekday, Frequency as RFrequency, Weekday } from 'rrule';

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

  public toString = (): string => this.rrule.toString();

  public asRRule = (): RRule => RRule.fromText(this.toText());

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

  public setDaysOfWeek = (ids: number[]): void => {
    const weekdayList: Weekday[] = new Array(ids.length);
    const numberList: number[] = new Array(ids.length);

    for (let i = 0; i < ids.length; i++) {
      weekdayList[i] = new Weekday(ids[i]);
      numberList[i] = ids[i];
    }

    this.rrule.origOptions.byweekday = weekdayList;
    this.rrule.options.byweekday = numberList;

    this.modifiedHook();
  };

  public get daysOfWeek(): number[] {
    const weekdays = this.rrule.origOptions.byweekday;
    if (!weekdays) {
      return [];
    } else if (Array.isArray(weekdays)) {
      return weekdays.map(this.ByWeekdayToNumber);
    }
    return [this.ByWeekdayToNumber(weekdays)];
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
      ({ week, weekDay }): Weekday =>
        new Weekday(parseInt(weekDay, 10), parseInt(week, 10)),
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
        .filter(
          (day): day is Weekday =>
            typeof day !== 'string' && typeof day !== 'number',
        )
        .filter((day) => day.n !== undefined)
        .map((day) => ({
          week: day.n.toString(),
          weekDay: day.weekday.toString(),
        }));
    }

    // TODO: This might be overly restrictive, if people write custom RRule syntax.
    return [];
  };

  public get monthsOfYear(): number[] {
    const months = this.rrule.origOptions.bymonth;
    if (months === undefined) {
      return [];
    }
    if (typeof months === 'number') {
      return [months];
    }
    return months;
  }

  public setMonthsOfYear = (ids: number[]): void => {
    this.rrule.origOptions.bymonth = ids;
    this.rrule.options.bymonth = this.rrule.origOptions.bymonth;

    this.modifiedHook();
  };

  private ByWeekdayToNumber(wd: ByWeekday): number {
    if (typeof wd === 'number') {
      return wd;
    } else if (typeof wd === 'string') {
      return 0; // TODO
    }
    return wd.weekday;
  }
}

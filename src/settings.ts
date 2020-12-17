const defaults: Partial<ISettings> = {
  futureRepetitionsCount: 5,
  tasksHeader: '## Tasks',
  blankLineAfterHeader: true,
};
export interface ISettings {
  futureRepetitionsCount: number;
  tasksHeader: string;
  blankLineAfterHeader: boolean;
}

export class SettingsInstance implements ISettings {
  public readonly futureRepetitionsCount: number;
  public readonly tasksHeader: string;
  public readonly blankLineAfterHeader: boolean;
  constructor(loadedData: Partial<ISettings>) {
    const allFields = { ...defaults, ...loadedData };
    this.futureRepetitionsCount = allFields.futureRepetitionsCount;
    this.tasksHeader = allFields.tasksHeader;
    this.blankLineAfterHeader = allFields.blankLineAfterHeader;
  }
}

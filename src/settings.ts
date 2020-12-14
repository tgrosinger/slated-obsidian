const defaults: Partial<ISettings> = {
  futureRepetitionsCount: 5,
  tasksHeader: '## Tasks',
};
export interface ISettings {
  futureRepetitionsCount: number;
  tasksHeader: string;
}

export class SettingsInstance implements ISettings {
  public readonly futureRepetitionsCount: number;
  public readonly tasksHeader: string;
  constructor(loadedData: Partial<ISettings>) {
    const allFields = { ...defaults, ...loadedData };
    this.futureRepetitionsCount = allFields.futureRepetitionsCount;
    this.tasksHeader = allFields.tasksHeader;
  }
}

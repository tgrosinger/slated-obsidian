import { ISettings, settingsWithDefaults } from '../src/settings';
import { TaskHandler } from '../src/task-handler';
import { TaskLine } from '../src/task-line';
import type { VaultIntermediate } from '../src/vault';
import { mock, MockProxy } from 'jest-mock-extended';
import moment from 'moment';
import type { TFile } from 'obsidian';

jest.mock('obsidian');

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveLines(
        expected: string[],
        regexLines: number[],
      ): CustomMatcherResult;
    }
  }
}

expect.extend({
  toHaveLines: (
    received: string,
    expected: string[],
    regexLines: number[],
  ): jest.CustomMatcherResult => {
    const receivedLines = received.split('\n');

    if (receivedLines.length !== expected.length) {
      return {
        message: () =>
          `Received array of length ${receivedLines.length} but expected array of length ${expected.length}`,
        pass: false,
      };
    }

    for (let i = 0; i < receivedLines.length; i++) {
      if (regexLines.indexOf(i) !== -1) {
        if (!new RegExp(expected[i]).test(receivedLines[i])) {
          return {
            message: () =>
              `Index ${i} in received (${receivedLines[i]}) does not Regex-match expected (${expected[i]})`,
            pass: false,
          };
        }
      } else if (receivedLines[i] !== expected[i]) {
        return {
          message: () =>
            `Index ${i} in received (${receivedLines[i]}) does not match expected (${expected[i]})`,
          pass: false,
        };
      }
    }

    return { pass: true, message: () => '' };
  },
});

const format = 'YYYY-MM-DD';
const startDateStr = '2020-12-31';
const startDate = moment(startDateStr);

const escapeRegExp = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string

const getMockFileWithBasename = (basename: string): MockProxy<TFile> => {
  const mockFile = mock<TFile>();
  mockFile.basename = basename;
  return mockFile;
};

const getMockFileForMoment = (date: moment.Moment): MockProxy<TFile> =>
  getMockFileWithBasename(date.format(format));

const p = (str: string): Promise<string> => Promise.resolve(str);

let file: MockProxy<TFile>;
let vault: jest.Mocked<VaultIntermediate>;
let settings: ISettings;
let fileContents: Record<string, string>;

const simpleTestSetup = (line: string): TaskLine => {
  fileContents[file.basename] = line;
  return new TaskLine(0, file, [line], vault, settings);
};

beforeEach(() => {
  window.moment = moment;
  vault = mock<VaultIntermediate>();

  fileContents = {};
  vault.readFile.mockImplementation((f, useCache) =>
    Promise.resolve(fileContents[f.basename]),
  );

  vault.writeFile.mockImplementation((f, data) => {
    fileContents[f.basename] = data;
    return Promise.resolve();
  });

  vault.findMomentForDailyNote.mockImplementation((dailyNote) => {
    const date = moment(dailyNote.basename, format, true);
    return date.isValid() ? date : undefined;
  });

  vault.fileNameForMoment.mockImplementation((date) =>
    date.format('YYYY-MM-DD'),
  );
});

describe('Tasks are parsed correctly', () => {
  beforeAll(() => {
    file = getMockFileForMoment(startDate);
    settings = settingsWithDefaults({});
  });

  test('When line is not a ul', () => {
    const line = '1. This is not a task';
    const tl = simpleTestSetup(line);
  });
  test('When the line is indented', () => {
    const line = '  - [ ] This is a simple task';
    const tl = simpleTestSetup(line);
    expect(tl.line).toEqual(line);
    expect(tl.isTask()).toBeTruthy();
    expect(tl.complete).toBeFalsy();
  });
  test('When the checkbox is invalid', () => {
    const line = '- [y] This is not a task';
    const tl = simpleTestSetup(line);
    expect(tl.isTask()).toBeFalsy();
    expect(tl.complete).toBeFalsy();
  });
  test('When the checkbox is the moved symbol', () => {
    const line = '- [>] This is not a task';
    const tl = simpleTestSetup(line);
    expect(tl.isTask()).toBeTruthy();
    expect(tl.complete).toBeFalsy();
  });
  test('When the checkbox is checked', () => {
    const line = '- [x] This task is done';
    const tl = simpleTestSetup(line);
    expect(tl.line).toEqual(line);
    expect(tl.isTask()).toBeTruthy();
    expect(tl.complete).toBeTruthy();
    expect(tl.repeats).toBeFalsy();
  });
  test('When the checkbox is checked', () => {
    const line = '- [X] This task is done';
    const tl = simpleTestSetup(line);
    expect(tl.line).toEqual(line);
    expect(tl.isTask()).toBeTruthy();
    expect(tl.complete).toBeTruthy();
    expect(tl.repeats).toBeFalsy();
  });

  describe('When there is a repeat config', () => {
    test('When there are no spaces', async () => {
      const line = '- [ ] The task;Every Sunday';
      const tl = simpleTestSetup(line);
      expect(tl.repeater.isValid()).toBeTruthy();
      expect(tl.repeats).toBeTruthy();
      expect(tl.repeater.toText()).toEqual('every week on Sunday');
      expect(tl.repeater.toString()).toEqual('RRULE:FREQ=WEEKLY;BYDAY=SU');
    });
    test('When there are spaces', async () => {
      const line = '- [ ] The task  ;  Every Sunday';
      const tl = simpleTestSetup(line);
      expect(tl.repeater.isValid()).toBeTruthy();
      expect(tl.repeats).toBeTruthy();
      expect(tl.repeater.toText()).toEqual('every week on Sunday');
      expect(tl.repeater.toString()).toEqual('RRULE:FREQ=WEEKLY;BYDAY=SU');
    });
    test('When the calendar emoji is used', async () => {
      const line = '- [ ] The task  📅  Every Sunday';
      const tl = simpleTestSetup(line);
      expect(tl.repeater.isValid()).toBeTruthy();
      expect(tl.repeats).toBeTruthy();
      expect(tl.repeater.toText()).toEqual('every week on Sunday');
      expect(tl.repeater.toString()).toEqual('RRULE:FREQ=WEEKLY;BYDAY=SU');
    });
    test('When there are trailing spaces', async () => {
      const line = '- [ ] The task  📅  Every Sunday  ';
      const tl = simpleTestSetup(line);
      expect(tl.repeater.isValid()).toBeTruthy();
      expect(tl.repeats).toBeTruthy();
      expect(tl.repeater.toText()).toEqual('every week on Sunday');
      expect(tl.repeater.toString()).toEqual('RRULE:FREQ=WEEKLY;BYDAY=SU');
    });
    test('When there are trailing spaces on a subtask', async () => {
      const line = '  - [ ] The task  📅  Every Sunday  ';
      const tl = simpleTestSetup(line);
      expect(tl.repeater.isValid()).toBeTruthy();
      expect(tl.repeats).toBeTruthy();
      expect(tl.repeater.toText()).toEqual('every week on Sunday');
      expect(tl.repeater.toString()).toEqual('RRULE:FREQ=WEEKLY;BYDAY=SU');
    });
  });
});

describe('taskLine.move', () => {
  let futureFiles: TFile[];

  beforeAll(() => {
    file = getMockFileForMoment(startDate);
  });

  beforeEach(() => {
    futureFiles = [];
    vault.getDailyNote.mockImplementation((date) => {
      const mockFile = getMockFileForMoment(date);
      futureFiles.push(mockFile);
      return Promise.resolve(mockFile);
    });
  });

  test('when the task has sub-items', async () => {
    fileContents[file.basename] = `# Original File

## Tasks

- [ ] a test task
  - this is a nested item
    - so is this
- [ ] another task
`;

    const tl = new TaskLine(
      4,
      file,
      fileContents[file.basename].split('\n'),
      vault,
      settings,
    );
    await tl.move(moment('2021-01-01'));

    expect(futureFiles.length).toEqual(1);
    expect(fileContents[futureFiles[0].basename]).toHaveLines(
      [
        '## Tasks',
        '',
        '- [ ] a test task',
        '  - this is a nested item',
        '    - so is this',
        '',
      ],
      [0],
    );
    expect(fileContents[file.basename]).toHaveLines(
      ['# Original File', '', '## Tasks', '', '- [ ] another task', ''],
      [],
    );
  });

  test('when the task has repeating', async () => {
    fileContents[file.basename] = `# Original File

## Tasks

- [ ] a test task ; Every Sunday
`;

    const tl = new TaskLine(
      4,
      file,
      fileContents[file.basename].split('\n'),
      vault,
      settings,
    );
    await tl.move(moment('2021-01-01'));

    expect(futureFiles.length).toEqual(1);
    expect(fileContents[futureFiles[0].basename]).toEqual(
      '## Tasks\n\n- [ ] a test task ; Every Sunday\n',
    );
    expect(fileContents[file.basename]).toEqual(
      '# Original File\n\n## Tasks\n\n',
    );
  });
});

describe('taskLine.createNextRepetition', () => {
  let futureFiles: TFile[];

  beforeAll(() => {
    file = getMockFileForMoment(startDate);
    settings = settingsWithDefaults({});
  });

  beforeEach(() => {
    futureFiles = [];
    vault.getDailyNote.mockImplementation((date) => {
      const mockFile = getMockFileForMoment(date);
      futureFiles.push(mockFile);
      return Promise.resolve(mockFile);
    });
  });

  describe('when a newline should be inserted after headings', () => {
    beforeAll(() => {
      settings = settingsWithDefaults({});
    });

    test('if it has a tasks section, the task is appended to existing', async () => {
      fileContents[file.basename] = '- [ ] a test task ; Every Sunday';

      vault.readFile.mockReturnValueOnce(
        p(
          '# Hello\n\n## Tasks\n\n- [ ] Something\n  - A sub item\n\n## Another Header\n',
        ),
      );

      const tl = new TaskLine(
        0,
        file,
        fileContents[file.basename].split('\n'),
        vault,
        settings,
      );
      await tl.createNextRepetition();

      expect(futureFiles.length).toEqual(1);
      expect(fileContents[futureFiles[0].basename]).toHaveLines(
        [
          '# Hello',
          '',
          '## Tasks',
          '',
          '- [ ] Something',
          '  - A sub item',
          '- [ ] a test task ; Every Sunday',
          '',
          '## Another Header',
          '',
        ],
        [],
      );
    });

    test('if it has a tasks section, the task is appended', async () => {
      fileContents[file.basename] = '- [ ] a test task ; Every Sunday';
      vault.readFile.mockReturnValueOnce(p('# Hello\n\n## Tasks\n'));

      const tl = new TaskLine(
        0,
        file,
        fileContents[file.basename].split('\n'),
        vault,
        settings,
      );
      await tl.createNextRepetition();

      expect(futureFiles.length).toEqual(1);
      expect(fileContents[futureFiles[0].basename]).toHaveLines(
        ['# Hello', '', '## Tasks', '', '- [ ] a test task ; Every Sunday', ''],
        [],
      );
    });

    test('if it does not have a tasks section, one is created', async () => {
      fileContents[file.basename] = '- [ ] a test task ; Every Sunday';
      vault.readFile.mockReturnValueOnce(p('# Hello\n\n## Another Section\n'));

      const tl = new TaskLine(
        0,
        file,
        fileContents[file.basename].split('\n'),
        vault,
        settings,
      );
      await tl.createNextRepetition();

      expect(futureFiles.length).toEqual(1);
      expect(fileContents[futureFiles[0].basename]).toHaveLines(
        [
          '# Hello',
          '',
          '## Another Section',
          '',
          '## Tasks',
          '',
          '- [ ] a test task ; Every Sunday',
          '',
        ],
        [],
      );
    });

    test('when the task has nested content', async () => {
      fileContents[file.basename] = `# Original File

## Tasks

- [ ] a test task ; Every Sunday
  this is embeded content
  so is this
- [ ] another task
`;

      const tl = new TaskLine(
        4,
        file,
        fileContents[file.basename].split('\n'),
        vault,
        settings,
      );
      await tl.createNextRepetition();

      expect(futureFiles.length).toEqual(1);
      expect(fileContents[futureFiles[0].basename]).toHaveLines(
        [
          '## Tasks',
          '',
          '- [ ] a test task ; Every Sunday',
          '  this is embeded content',
          '  so is this',
          '',
        ],
        [],
      );
    });

    test('when the task has nested sub-items', async () => {
      fileContents[file.basename] = `# Original File

## Tasks

- [ ] a test task ; Every Sunday
  - this is a nested item
    - so is this
- [ ] another task
`;

      const tl = new TaskLine(
        4,
        file,
        fileContents[file.basename].split('\n'),
        vault,
        settings,
      );
      await tl.createNextRepetition();

      expect(futureFiles.length).toEqual(1);
      expect(fileContents[futureFiles[0].basename]).toHaveLines(
        [
          '## Tasks',
          '',
          '- [ ] a test task ; Every Sunday',
          '  - this is a nested item',
          '    - so is this',
          '',
        ],
        [],
      );
    });

    test('when the task has additional headers', async () => {
      fileContents[file.basename] = `# Original File

## Tasks

### Work Tasks

- [x] The task to move ; Every Sunday

### Personal Tasks

- [ ] Mow the lawn
`;

      vault.readFile.mockReturnValueOnce(
        p(`# Another File

## Tasks

### Personal Tasks

- [ ] Buy milk
`),
      );

      const tl = new TaskLine(
        6,
        file,
        fileContents[file.basename].split('\n'),
        vault,
        settings,
      );
      await tl.createNextRepetition();

      expect(futureFiles.length).toEqual(1);
      expect(fileContents[futureFiles[0].basename]).toHaveLines(
        [
          '# Another File',
          '',
          '## Tasks',
          '',
          '### Personal Tasks',
          '',
          '- [ ] Buy milk',
          '',
          '### Work Tasks',
          '',
          '- [ ] The task to move ; Every Sunday',
          '',
        ],
        [],
      );
    });
  });
});

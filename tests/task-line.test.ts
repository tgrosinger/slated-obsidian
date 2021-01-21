import { ISettings, settingsWithDefaults } from '../src/settings';
import { TaskHandler } from '../src/task-handler';
import { TaskLine } from '../src/task-line';
import type { VaultIntermediate } from '../src/vault';
import { mock, MockProxy } from 'jest-mock-extended';
import moment from 'moment';
import type { TFile } from 'obsidian';

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
    expect(tl.blockID).toEqual('');
    expect(tl.isOriginalInstance).toBeTruthy();
  });
  test('When the checkbox is checked', () => {
    const line = '- [X] This task is done';
    const tl = simpleTestSetup(line);
    expect(tl.line).toEqual(line);
    expect(tl.isTask()).toBeTruthy();
    expect(tl.complete).toBeTruthy();
    expect(tl.repeats).toBeFalsy();
    expect(tl.blockID).toEqual('');
  });

  describe('When there is a repeat config', () => {
    test('When there are no spaces', async () => {
      const line = '- [ ] The task;Every Sunday';
      const tl = simpleTestSetup(line);
      await tl.addBlockIDIfMissing();
      expect(tl.line).toMatch(
        new RegExp(`^${escapeRegExp(line)} \\^task-[-a-zA-Z0-9]+$`),
      );
      expect(tl.repeater.isValid()).toBeTruthy();
      expect(tl.repeats).toBeTruthy();
      expect(tl.repeater.toText()).toEqual('every week on Sunday');
      expect(tl.repeater.toString()).toEqual('RRULE:FREQ=WEEKLY;BYDAY=SU');
      expect(tl.blockID).toMatch(/task-[a-z0-9]{4}/);
      expect(tl.isOriginalInstance).toBeTruthy();
    });
    test('When there are spaces', async () => {
      const line = '- [ ] The task  ;  Every Sunday';
      const tl = simpleTestSetup(line);
      await tl.addBlockIDIfMissing();
      expect(tl.line).toMatch(
        new RegExp(`^${escapeRegExp(line)} \\^task-[-a-zA-Z0-9]+$`),
      );
      expect(tl.repeater.isValid()).toBeTruthy();
      expect(tl.repeats).toBeTruthy();
      expect(tl.repeater.toText()).toEqual('every week on Sunday');
      expect(tl.repeater.toString()).toEqual('RRULE:FREQ=WEEKLY;BYDAY=SU');
      expect(tl.blockID).toMatch(/task-[a-z0-9]{4}/);
      expect(tl.isOriginalInstance).toBeTruthy();
    });
    test('When the calendar emoji is used', async () => {
      const line = '- [ ] The task  📅  Every Sunday';
      const tl = simpleTestSetup(line);
      await tl.addBlockIDIfMissing();
      expect(tl.line).toMatch(
        new RegExp(`^${escapeRegExp(line)} \\^task-[-a-zA-Z0-9]+$`),
      );
      expect(tl.repeater.isValid()).toBeTruthy();
      expect(tl.repeats).toBeTruthy();
      expect(tl.repeater.toText()).toEqual('every week on Sunday');
      expect(tl.repeater.toString()).toEqual('RRULE:FREQ=WEEKLY;BYDAY=SU');
      expect(tl.blockID).toMatch(/task-[a-z0-9]{4}/);
      expect(tl.isOriginalInstance).toBeTruthy();
    });
    test('When there are trailing spaces', async () => {
      const line = '- [ ] The task  📅  Every Sunday  ';
      const tl = simpleTestSetup(line);
      await tl.addBlockIDIfMissing();
      expect(tl.line).toMatch(
        new RegExp(`^${escapeRegExp(line.trimRight())} \\^task-[-a-zA-Z0-9]+$`),
      );
      expect(tl.repeater.isValid()).toBeTruthy();
      expect(tl.repeats).toBeTruthy();
      expect(tl.repeater.toText()).toEqual('every week on Sunday');
      expect(tl.repeater.toString()).toEqual('RRULE:FREQ=WEEKLY;BYDAY=SU');
      expect(tl.blockID).toMatch(/task-[a-z0-9]{4}/);
      expect(tl.isOriginalInstance).toBeTruthy();
    });
    test('When there are trailing spaces on a subtask', async () => {
      const line = '  - [ ] The task  📅  Every Sunday  ';
      const tl = simpleTestSetup(line);
      await tl.addBlockIDIfMissing();
      expect(tl.line).toMatch(
        new RegExp(`^${escapeRegExp(line.trimRight())} \\^task-[-a-zA-Z0-9]+$`),
      );
      expect(tl.repeater.isValid()).toBeTruthy();
      expect(tl.repeats).toBeTruthy();
      expect(tl.repeater.toText()).toEqual('every week on Sunday');
      expect(tl.repeater.toString()).toEqual('RRULE:FREQ=WEEKLY;BYDAY=SU');
      expect(tl.blockID).toMatch(/task-[a-z0-9]{4}/);
      expect(tl.isOriginalInstance).toBeTruthy();
    });
  });

  describe('When there is a block ID', () => {
    test('When there are no spaces', () => {
      const line = '- [ ] The task^task-abc123';
      const tl = simpleTestSetup(line);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.isOriginalInstance).toBeTruthy();
    });
    test('When there are spaces', () => {
      const line = '- [ ] The task ^task-abc123';
      const tl = simpleTestSetup(line);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.isOriginalInstance).toBeTruthy();
    });
  });

  describe('When the task has been moved to another location', () => {
    test('When there are no spaces', () => {
      const line = '- [x] The task>[[2020-12-25]]^task-abc123';
      const tl = simpleTestSetup(line);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedTo).toEqual('2020-12-25');
      expect(tl.isOriginalInstance).toBeTruthy();
    });
    test('When there are spaces', () => {
      const line = '- [x] The task >[[2020-12-25]] ^task-abc123';
      const tl = simpleTestSetup(line);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedTo).toEqual('2020-12-25');
      expect(tl.isOriginalInstance).toBeTruthy();
    });
    test('When the note name is not a date', () => {
      const line = '- [x] The task >[[some other note]] ^task-abc123';
      const tl = simpleTestSetup(line);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedTo).toEqual('some other note');
      expect(tl.isOriginalInstance).toBeTruthy();
    });
    test('When the note has been renamed', () => {
      const line =
        '- [x] The task >[[2020-12-25|some other note]] ^task-abc123';
      const tl = simpleTestSetup(line);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedTo).toEqual('2020-12-25');
      expect(tl.isOriginalInstance).toBeTruthy();
    });
  });

  describe('When the task has been moved from another location', () => {
    test('When there are no spaces', () => {
      const line = '- [x] The task<[[2020-12-25#^task-abc123]]';
      const tl = simpleTestSetup(line);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedFrom).toEqual('2020-12-25');
      expect(tl.isOriginalInstance).toBeFalsy();
    });
    test('When there are spaces', () => {
      const line = '- [ ] The task <[[2020-12-25#^task-abc123]]';
      const tl = simpleTestSetup(line);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedFrom).toEqual('2020-12-25');
      expect(tl.isOriginalInstance).toBeFalsy();
    });
    test('When the note name is not a date', () => {
      const line = '- [x] The task <[[some other note#^task-abc123]]';
      const tl = simpleTestSetup(line);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedFrom).toEqual('some other note');
      expect(tl.isOriginalInstance).toBeFalsy();
    });
    test('When the note has been aliased', () => {
      const line =
        '- [ ] The task <[[2020-12-25#^task-abc123|some other note]]';
      const tl = simpleTestSetup(line);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedFrom).toEqual('2020-12-25');
      expect(tl.isOriginalInstance).toBeFalsy();
    });
    test('When the moved from link has been aliased', () => {
      const line = '- [ ] The task [[2020-12-25#^task-abc123|< Origin]]';
      const tl = simpleTestSetup(line);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedFrom).toEqual('2020-12-25');
      expect(tl.isOriginalInstance).toBeFalsy();
    });
  });

  describe('When the task is a repetition of a task', () => {
    test('When there are no spaces', () => {
      const line = '- [ ] The task;Every Sunday <<[[2020-12-25#^task-abc123]]';
      const tl = simpleTestSetup(line);
      expect(tl.line).toEqual(line);
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.repeats).toBeTruthy();
      expect(tl.repeater.toText()).toEqual('every week on Sunday');
      expect(tl.repeatsFrom).toEqual('2020-12-25');
      expect(tl.isOriginalInstance).toBeFalsy();
    });
    test('When the note has been aliased', () => {
      const line =
        '- [ ] The task;Every Sunday <<[[2020-12-25#^task-abc123|something else]]';
      const tl = simpleTestSetup(line);
      expect(tl.line).toEqual(line);
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.repeats).toBeTruthy();
      expect(tl.repeater.toText()).toEqual('every week on Sunday');
      expect(tl.repeatsFrom).toEqual('2020-12-25');
      expect(tl.isOriginalInstance).toBeFalsy();
    });
    test('When the note name is not a date', () => {
      const line =
        '- [ ] The task 📅 Every Sunday <<[[some other note#^task-abc123]]';
      const tl = simpleTestSetup(line);
      expect(tl.line).toEqual(line);
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.repeats).toBeTruthy();
      expect(tl.repeater.toText()).toEqual('every week on Sunday');
      expect(tl.repeatsFrom).toEqual('some other note');
      expect(tl.isOriginalInstance).toBeFalsy();
    });
    test('When the repeater link is aliased', () => {
      const line =
        '- [ ] The task 📅 Every Sunday [[some other note#^task-abc123|<< Origin]]';
      const tl = simpleTestSetup(line);
      expect(tl.line).toEqual(line);
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.repeats).toBeTruthy();
      expect(tl.repeater.toText()).toEqual('every week on Sunday');
      expect(tl.repeatsFrom).toEqual('some other note');
      expect(tl.isOriginalInstance).toBeFalsy();
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

  describe('when link aliasing is enabled', () => {
    beforeAll(() => {
      settings = settingsWithDefaults({ aliasLinks: true });
    });

    test('when the task has repeating', async () => {
      fileContents[file.basename] = `# Original File

## Tasks

- [ ] a test task ; Every Sunday ^task-abc123
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
        `## Tasks\n\n- [ ] a test task ; Every Sunday [[${startDateStr}#^task-abc123|< Origin]]\n`,
      );
      expect(fileContents[file.basename]).toEqual(
        '# Original File\n\n## Tasks\n\n- [>] a test task ; Every Sunday >[[2021-01-01]] ^task-abc123\n',
      );
    });

    test('when the task does not repeat', async () => {
      fileContents[file.basename] = `# Original File

## Tasks

- [ ] a test task
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
          '^' +
            escapeRegExp(`- [ ] a test task [[${startDateStr}#^task-`) +
            '[-a-zA-Z0-9]{4}' +
            escapeRegExp('|< Origin]]') +
            '$',
          '',
        ],
        [2],
      );
      expect(fileContents[file.basename]).toHaveLines(
        [
          '# Original File',
          '',
          '## Tasks',
          '',
          '^' +
            escapeRegExp('- [>] a test task >[[2021-01-01]] ^task-') +
            '[-a-zA-Z0-9]{4}$',
          '',
        ],
        [4],
      );
    });

    test('when the task has nested content', async () => {
      fileContents[file.basename] = `# Original File

## Tasks

- [ ] a test task
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
      await tl.move(moment('2021-01-01'));

      expect(futureFiles.length).toEqual(1);
      expect(fileContents[futureFiles[0].basename]).toHaveLines(
        [
          '## Tasks',
          '',
          '^' +
            escapeRegExp(`- [ ] a test task [[${startDateStr}#^task-`) +
            '[-a-zA-Z0-9]{4}' +
            escapeRegExp('|< Origin]]') +
            '$',
          '  this is embeded content',
          '  so is this',
          '',
        ],
        [2],
      );
      expect(fileContents[file.basename]).toHaveLines(
        [
          '# Original File',
          '',
          '## Tasks',
          '',
          '^' +
            escapeRegExp('- [>] a test task >[[2021-01-01]] ^task-') +
            '[-a-zA-Z0-9]{4}$',
          '- [ ] another task',
          '',
        ],
        [4],
      );
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
          '^' +
            escapeRegExp(`- [ ] a test task [[${startDateStr}#^task-`) +
            '[-a-zA-Z0-9]{4}' +
            escapeRegExp('|< Origin]]') +
            '$',
          '  - this is a nested item',
          '    - so is this',
          '',
        ],
        [2],
      );
      expect(fileContents[file.basename]).toHaveLines(
        [
          '# Original File',
          '',
          '## Tasks',
          '',
          '^' +
            escapeRegExp('- [>] a test task >[[2021-01-01]] ^task-') +
            '[-a-zA-Z0-9]{4}$',
          '- [ ] another task',
          '',
        ],
        [4],
      );
    });

    test('when the task is moved multiple times', async () => {
      fileContents[file.basename] = `# Original File

## Tasks

- [ ] a test task ^task-abcd
`;

      const th = new TaskHandler(vault, settings);

      await th.processFile(file);
      let tasks = th.getCachedTasksForFile(file);
      expect(tasks).toHaveLength(1);

      const originalTask = tasks[0];
      const nextDateStr = '2021-01-01';
      await originalTask.move(moment(nextDateStr));

      expect(fileContents[startDateStr]).toEqual(
        '# Original File\n\n## Tasks\n\n- [>] a test task >[[2021-01-01]] ^task-abcd\n',
      );
      expect(fileContents[nextDateStr]).toEqual(
        '## Tasks\n\n- [ ] a test task [[2020-12-31#^task-abcd|< Origin]]\n',
      );
      expect(futureFiles).toHaveLength(1);
      const file01 = futureFiles[0];
      expect(file01.basename).toEqual(nextDateStr);

      await th.processFile(file01);
      tasks = th.getCachedTasksForFile(file01);
      expect(tasks).toHaveLength(1);

      const movedOnceTask = tasks[0];
      await movedOnceTask.move(moment('2021-01-02'));

      expect(fileContents[startDateStr]).toEqual(
        '# Original File\n\n## Tasks\n\n- [>] a test task >[[2021-01-01]] ^task-abcd\n',
      );
      expect(fileContents[nextDateStr]).toEqual(
        '## Tasks\n\n- [>] a test task [[2020-12-31#^task-abcd|< Origin]] >[[2021-01-02]]\n',
      );
      expect(fileContents['2021-01-02']).toEqual(
        '## Tasks\n\n- [ ] a test task [[2020-12-31#^task-abcd|< Origin]]\n',
      );
    });

    test('when the task is moved back to the original location', async () => {
      const nextDateStr = '2021-01-01';

      fileContents[file.basename] = `# Original File

## Tasks

- [>] a test task >[[2021-01-01]] ^task-abcd
`;
      fileContents[nextDateStr] = `## Tasks

- [ ] a test task [[2020-12-31#^task-abcd|< Origin]]
`;

      const th = new TaskHandler(vault, settings);

      const file01 = getMockFileWithBasename(nextDateStr);
      await th.processFile(file01);
      const tasks = th.getCachedTasksForFile(file01);
      expect(tasks).toHaveLength(1);

      const movedOnceTask = tasks[0];
      await movedOnceTask.move(startDate);

      expect(fileContents[startDateStr]).toEqual(
        '# Original File\n\n## Tasks\n\n- [ ] a test task ^task-abcd\n',
      );
      expect(fileContents[nextDateStr]).toEqual('## Tasks\n\n');
    });

    test('when the task is moved back to the original location and has sub-items', async () => {
      const nextDateStr = '2021-01-01';

      fileContents[file.basename] = `# Original File

## Tasks

- [>] a test task >[[2021-01-01]] ^task-abcd
`;
      fileContents[nextDateStr] = `## Tasks

- [ ] a test task [[2020-12-31#^task-abcd|< Origin]]
  - This is a sub item
`;

      const th = new TaskHandler(vault, settings);

      const file01 = getMockFileWithBasename(nextDateStr);
      await th.processFile(file01);
      const tasks = th.getCachedTasksForFile(file01);
      expect(tasks).toHaveLength(1);

      const movedOnceTask = tasks[0];
      await movedOnceTask.move(startDate);

      expect(fileContents[startDateStr]).toEqual(
        '# Original File\n\n## Tasks\n\n- [ ] a test task ^task-abcd\n  - This is a sub item\n',
      );
      expect(fileContents[nextDateStr]).toEqual('## Tasks\n\n');
    });
  });

  describe('when link aliasing is disabled', () => {
    beforeAll(() => {
      settings = settingsWithDefaults({ aliasLinks: false });
    });

    test('when the task has repeating', async () => {
      fileContents[file.basename] = `# Original File

## Tasks

- [ ] a test task ; Every Sunday ^task-abc123
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
        `## Tasks\n\n- [ ] a test task ; Every Sunday <[[${startDateStr}#^task-abc123]]\n`,
      );
      expect(fileContents[file.basename]).toEqual(
        '# Original File\n\n## Tasks\n\n- [>] a test task ; Every Sunday >[[2021-01-01]] ^task-abc123\n',
      );
    });

    test('when the task does not repeat', async () => {
      fileContents[file.basename] = `# Original File

## Tasks

- [ ] a test task
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
          '^' +
            escapeRegExp(`- [ ] a test task <[[${startDateStr}#^task-`) +
            '[-a-zA-Z0-9]{4}\\]\\]$',
          '',
        ],
        [2],
      );
      expect(fileContents[file.basename]).toHaveLines(
        [
          '# Original File',
          '',
          '## Tasks',
          '',
          '^' +
            escapeRegExp('- [>] a test task >[[2021-01-01]] ^task-') +
            '[-a-zA-Z0-9]{4}$',
          '',
        ],
        [4],
      );
    });

    test('when the task is moved multiple times', async () => {
      fileContents[file.basename] = `# Original File

## Tasks

- [ ] a test task ^task-abcd
`;

      const th = new TaskHandler(vault, settings);

      await th.processFile(file);
      let tasks = th.getCachedTasksForFile(file);
      expect(tasks).toHaveLength(1);

      const originalTask = tasks[0];
      await originalTask.move(moment('2021-01-01'));

      expect(fileContents[startDateStr]).toEqual(
        '# Original File\n\n## Tasks\n\n- [>] a test task >[[2021-01-01]] ^task-abcd\n',
      );
      expect(fileContents['2021-01-01']).toEqual(
        '## Tasks\n\n- [ ] a test task <[[2020-12-31#^task-abcd]]\n',
      );
      expect(futureFiles).toHaveLength(1);
      const file01 = futureFiles[0];
      expect(file01.basename).toEqual('2021-01-01');

      await th.processFile(file01);
      tasks = th.getCachedTasksForFile(file01);
      expect(tasks).toHaveLength(1);

      const movedOnceTask = tasks[0];
      await movedOnceTask.move(moment('2021-01-02'));

      expect(fileContents[startDateStr]).toEqual(
        '# Original File\n\n## Tasks\n\n- [>] a test task >[[2021-01-01]] ^task-abcd\n',
      );
      expect(fileContents['2021-01-01']).toEqual(
        '## Tasks\n\n- [>] a test task <[[2020-12-31#^task-abcd]] >[[2021-01-02]]\n',
      );
      expect(fileContents['2021-01-02']).toEqual(
        '## Tasks\n\n- [ ] a test task <[[2020-12-31#^task-abcd]]\n',
      );
    });

    test('when the task is moved back to the original location', async () => {
      fileContents[file.basename] = `# Original File

## Tasks

- [>] a test task >[[2021-01-01]] ^task-abcd
`;
      fileContents['2021-01-01'] = `## Tasks

- [ ] a test task <[[2020-12-31#^task-abcd]]
`;

      const th = new TaskHandler(vault, settings);

      const file01 = getMockFileWithBasename('2021-01-01');
      await th.processFile(file01);
      const tasks = th.getCachedTasksForFile(file01);
      expect(tasks).toHaveLength(1);

      const movedOnceTask = tasks[0];
      await movedOnceTask.move(startDate);

      expect(fileContents[startDateStr]).toEqual(
        '# Original File\n\n## Tasks\n\n- [ ] a test task ^task-abcd\n',
      );
      expect(fileContents['2021-01-01']).toEqual('## Tasks\n\n');
    });

    test('when the task has additional headers', async () => {
      fileContents[file.basename] = `# Original File

## Tasks

### Work Tasks

- [ ] The task to move

### Personal Tasks

- [ ] Mow the lawn
`;

      fileContents['2021-01-01'] = `# Another File

## Tasks

### Personal Tasks

- [ ] Buy milk
`;

      const tl = new TaskLine(
        6,
        file,
        fileContents[file.basename].split('\n'),
        vault,
        settings,
      );
      await tl.move(moment('2021-01-01'));

      expect(fileContents[file.basename]).toHaveLines(
        [
          '# Original File',
          '',
          '## Tasks',
          '',
          '### Work Tasks',
          '',
          '^' +
            escapeRegExp('- [>] The task to move >[[2021-01-01]] ^task-') +
            '[-a-zA-Z0-9]{4}$',
          '',
          '### Personal Tasks',
          '',
          '- [ ] Mow the lawn',
          '',
        ],
        [6],
      );
      expect(fileContents['2021-01-01']).toHaveLines(
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
          '^' +
            escapeRegExp(`- [ ] The task to move <[[${startDateStr}#^task-`) +
            '[-a-zA-Z0-9]{4}\\]\\]$',
          '',
        ],
        [10],
      );
    });

    test('when the task has multiple additional headers', async () => {
      fileContents[file.basename] = `# Original File

## Tasks

### Work Tasks

#### Section 1

- [ ] A task

#### Section 2

- [ ] The task to move

### Personal Tasks

- [ ] Mow the lawn
`;

      fileContents['2021-01-01'] = `# Another File

## Tasks

### Personal Tasks

- [ ] Buy milk
`;

      const tl = new TaskLine(
        12,
        file,
        fileContents[file.basename].split('\n'),
        vault,
        settings,
      );
      await tl.move(moment('2021-01-01'));

      expect(fileContents[file.basename]).toHaveLines(
        [
          '# Original File',
          '',
          '## Tasks',
          '',
          '### Work Tasks',
          '',
          '#### Section 1',
          '',
          '- [ ] A task',
          '',
          '#### Section 2',
          '',
          '^' +
            escapeRegExp('- [>] The task to move >[[2021-01-01]] ^task-') +
            '[-a-zA-Z0-9]{4}$',
          '',
          '### Personal Tasks',
          '',
          '- [ ] Mow the lawn',
          '',
        ],
        [12],
      );
      expect(fileContents['2021-01-01']).toHaveLines(
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
          '#### Section 2',
          '',
          '^' +
            escapeRegExp(`- [ ] The task to move <[[${startDateStr}#^task-`) +
            '[-a-zA-Z0-9]{4}\\]\\]$',
          '',
        ],
        [12],
      );
    });
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

  describe('when link aliasing is enabled', () => {
    beforeAll(() => {
      settings = settingsWithDefaults({ aliasLinks: true });
    });

    test('if it has a tasks section, the task is appended to existing', async () => {
      fileContents[file.basename] =
        '- [ ] a test task ; Every Sunday ^task-abc123';

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
          `- [ ] a test task ; Every Sunday [[${startDateStr}#^task-abc123|<< Origin]]`,
          '',
          '## Another Header',
          '',
        ],
        [],
      );
    });
  });

  describe('when a newline should be inserted after headings', () => {
    beforeAll(() => {
      settings = settingsWithDefaults({ aliasLinks: false });
    });

    test('if it has a tasks section, the task is appended to existing', async () => {
      fileContents[file.basename] =
        '- [ ] a test task ; Every Sunday ^task-abc123';

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
          `- [ ] a test task ; Every Sunday <<[[${startDateStr}#^task-abc123]]`,
          '',
          '## Another Header',
          '',
        ],
        [],
      );
    });

    test('if it has a tasks section, the task is appended', async () => {
      fileContents[file.basename] =
        '- [ ] a test task ; Every Sunday ^task-abc123';
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
        [
          '# Hello',
          '',
          '## Tasks',
          '',
          `- [ ] a test task ; Every Sunday <<[[${startDateStr}#^task-abc123]]`,
          '',
        ],
        [],
      );
    });

    test('if it does not have a tasks section, one is created', async () => {
      fileContents[file.basename] =
        '- [ ] a test task ; Every Sunday ^task-abc123';
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
          `- [ ] a test task ; Every Sunday <<[[${startDateStr}#^task-abc123]]`,
          '',
        ],
        [],
      );
    });

    test('when the task has nested content', async () => {
      fileContents[file.basename] = `# Original File

## Tasks

- [ ] a test task ; Every Sunday ^task-abc123
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
          `- [ ] a test task ; Every Sunday <<[[${startDateStr}#^task-abc123]]`,
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

- [ ] a test task ; Every Sunday ^task-abc123
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
          `- [ ] a test task ; Every Sunday <<[[${startDateStr}#^task-abc123]]`,
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

- [x] The task to move ; Every Sunday ^task-abc123

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
          `- [ ] The task to move ; Every Sunday <<[[${startDateStr}#^task-abc123]]`,
          '',
        ],
        [],
      );
    });
  });
});

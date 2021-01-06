import { SettingsInstance } from './settings';
import { TaskLine } from './task-line';
import type { VaultIntermediate } from './vault';
import { mock, MockProxy } from 'jest-mock-extended';
import moment from 'moment';
import type { TFile } from 'obsidian';
import { TaskHandler } from './task-handler';

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
let settings: SettingsInstance;

describe('Tasks are parsed correctly', () => {
  beforeAll(() => {
    file = getMockFileForMoment(startDate);
    vault = mock<VaultIntermediate>();
    settings = new SettingsInstance({});
  });

  test('When line is not a ul', () => {
    const line = '1. This is not a task';
    const tl = new TaskLine(line, 1, file, vault, settings);
  });
  test('When the line is indented', () => {
    const line = '  - [ ] This is a simple task';
    const tl = new TaskLine(line, 1, file, vault, settings);
    expect(tl.line).toEqual(line);
    expect(tl.isTask()).toBeTruthy();
    expect(tl.complete).toBeFalsy();
  });
  test('When the checkbox is invalid', () => {
    const line = '- [y] This is not a task';
    const tl = new TaskLine(line, 1, file, vault, settings);
    expect(tl.isTask()).toBeFalsy();
    expect(tl.complete).toBeFalsy();
  });
  test('When the checkbox is the moved symbol', () => {
    const line = '- [>] This is not a task';
    const tl = new TaskLine(line, 1, file, vault, settings);
    expect(tl.isTask()).toBeTruthy();
    expect(tl.complete).toBeFalsy();
  });
  test('When the checkbox is checked', () => {
    const line = '- [x] This task is done';
    const tl = new TaskLine(line, 1, file, vault, settings);
    expect(tl.line).toEqual(line);
    expect(tl.isTask()).toBeTruthy();
    expect(tl.complete).toBeTruthy();
    expect(tl.repeats).toBeFalsy();
    expect(tl.blockID).toEqual('');
    expect(tl.isOriginalInstance).toBeTruthy();
  });
  test('When the checkbox is checked', () => {
    const line = '- [X] This task is done';
    const tl = new TaskLine(line, 1, file, vault, settings);
    expect(tl.line).toEqual(line);
    expect(tl.isTask()).toBeTruthy();
    expect(tl.complete).toBeTruthy();
    expect(tl.repeats).toBeFalsy();
    expect(tl.blockID).toEqual('');
  });

  describe('When there is a repeat config', () => {
    test('When there are no spaces', () => {
      const line = '- [ ] The task;Every Sunday';
      const tl = new TaskLine(line, 1, file, vault, settings);
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
    test('When there are spaces', () => {
      const line = '- [ ] The task  ;  Every Sunday';
      const tl = new TaskLine(line, 1, file, vault, settings);
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
    test('When the calendar emoji is used', () => {
      const line = '- [ ] The task  📅  Every Sunday';
      const tl = new TaskLine(line, 1, file, vault, settings);
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
    test('When there are trailing spaces', () => {
      const line = '- [ ] The task  📅  Every Sunday  ';
      const tl = new TaskLine(line, 1, file, vault, settings);
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
    test('When there are trailing spaces on a subtask', () => {
      const line = '  - [ ] The task  📅  Every Sunday  ';
      const tl = new TaskLine(line, 1, file, vault, settings);
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
      const tl = new TaskLine(line, 1, file, vault, settings);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.isOriginalInstance).toBeTruthy();
    });
    test('When there are spaces', () => {
      const line = '- [ ] The task ^task-abc123';
      const tl = new TaskLine(line, 1, file, vault, settings);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.isOriginalInstance).toBeTruthy();
    });
  });

  describe('When the task has been moved to another location', () => {
    test('When there are no spaces', () => {
      const line = '- [x] The task>[[2020-12-25]]^task-abc123';
      const tl = new TaskLine(line, 1, file, vault, settings);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedTo).toEqual('2020-12-25');
      expect(tl.isOriginalInstance).toBeTruthy();
    });
    test('When there are spaces', () => {
      const line = '- [x] The task >[[2020-12-25]] ^task-abc123';
      const tl = new TaskLine(line, 1, file, vault, settings);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedTo).toEqual('2020-12-25');
      expect(tl.isOriginalInstance).toBeTruthy();
    });
    test('When the note name is not a date', () => {
      const line = '- [x] The task >[[some other note]] ^task-abc123';
      const tl = new TaskLine(line, 1, file, vault, settings);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedTo).toEqual('some other note');
      expect(tl.isOriginalInstance).toBeTruthy();
    });
    test('When the note has been renamed', () => {
      const line =
        '- [x] The task >[[2020-12-25|some other note]] ^task-abc123';
      const tl = new TaskLine(line, 1, file, vault, settings);
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
      const tl = new TaskLine(line, 1, file, vault, settings);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedFrom).toEqual('2020-12-25');
      expect(tl.isOriginalInstance).toBeFalsy();
    });
    test('When there are spaces', () => {
      const line = '- [ ] The task <[[2020-12-25#^task-abc123]]';
      const tl = new TaskLine(line, 1, file, vault, settings);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedFrom).toEqual('2020-12-25');
      expect(tl.isOriginalInstance).toBeFalsy();
    });
    test('When the note name is not a date', () => {
      const line = '- [x] The task <[[some other note#^task-abc123]]';
      const tl = new TaskLine(line, 1, file, vault, settings);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedFrom).toEqual('some other note');
      expect(tl.isOriginalInstance).toBeFalsy();
    });
    test('When the note has been aliased', () => {
      const line =
        '- [ ] The task <[[2020-12-25#^task-abc123|some other note]]';
      const tl = new TaskLine(line, 1, file, vault, settings);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedFrom).toEqual('2020-12-25');
      expect(tl.isOriginalInstance).toBeFalsy();
    });
    test('When the moved from link has been aliased', () => {
      const line = '- [ ] The task [[2020-12-25#^task-abc123|< Origin]]';
      const tl = new TaskLine(line, 1, file, vault, settings);
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
      const tl = new TaskLine(line, 1, file, vault, settings);
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
      const tl = new TaskLine(line, 1, file, vault, settings);
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
      const tl = new TaskLine(line, 1, file, vault, settings);
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
      const tl = new TaskLine(line, 1, file, vault, settings);
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
    vault = mock<VaultIntermediate>();
    vault.findMomentForDailyNote.mockImplementation((dailyNote) => {
      const date = moment(dailyNote.basename, format, true);
      return date.isValid() ? date : undefined;
    });

    futureFiles = [];
    vault.getDailyNote.mockImplementation((date) => {
      const mockFile = getMockFileForMoment(date);
      futureFiles.push(mockFile);
      return Promise.resolve(mockFile);
    });
  });

  describe('when link aliasing is enabled', () => {
    beforeAll(() => {
      settings = new SettingsInstance({ aliasLinks: true });
    });

    test('when the task has repeating', async () => {
      vault.readFile.mockImplementation((f, useCache) => {
        if (f === file) {
          return p(
            '# Original File\n\n## Tasks\n\n- [ ] a test task ; Every Sunday ^task-abc123\n',
          );
        }
        return p('');
      });
      vault.fileNameForMoment.mockReturnValueOnce('2021-01-01');

      const line = '- [ ] a test task ; Every Sunday ^task-abc123';
      const tl = new TaskLine(line, 4, file, vault, settings);
      await tl.move(moment('2021-01-01'));

      expect(futureFiles.length).toEqual(1);
      expect(vault.readFile).toHaveBeenCalledWith(futureFiles[0], false);
      expect(vault.writeFile).toHaveBeenCalledTimes(2);
      expect(vault.writeFile).toHaveBeenNthCalledWith(
        1,
        futureFiles[0],
        `## Tasks\n\n- [ ] a test task ; Every Sunday [[${startDateStr}#^task-abc123|< Origin]]\n`,
      );
      expect(vault.writeFile).toHaveBeenNthCalledWith(
        2,
        file,
        '# Original File\n\n## Tasks\n\n- [>] a test task ; Every Sunday >[[2021-01-01]] ^task-abc123\n',
      );
    });

    test('when the task does not repeat', async () => {
      vault.readFile.mockImplementation((f, useCache) => {
        if (f === file) {
          return p('# Original File\n\n## Tasks\n\n- [ ] a test task\n');
        }
        return p('');
      });
      vault.fileNameForMoment.mockReturnValueOnce('2021-01-01');

      const line = '- [ ] a test task';
      const tl = new TaskLine(line, 4, file, vault, settings);
      await tl.move(moment('2021-01-01'));

      expect(futureFiles.length).toEqual(1);
      expect(vault.readFile).toHaveBeenCalledWith(futureFiles[0], false);
      expect(vault.writeFile).toHaveBeenCalledTimes(2);

      expect(vault.writeFile.mock.calls[0][0]).toEqual(futureFiles[0]);
      expect(vault.writeFile.mock.calls[0][1]).toHaveLines(
        [
          '## Tasks',
          '',
          '^' +
            escapeRegExp(`${line} [[${startDateStr}#^task-`) +
            '[-a-zA-Z0-9]{4}' +
            escapeRegExp('|< Origin]]') +
            '$',
          '',
        ],
        [2],
      );

      expect(vault.writeFile.mock.calls[1][0]).toEqual(file);
      expect(vault.writeFile.mock.calls[1][1]).toHaveLines(
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
      const fileContents: Record<string, string> = {};
      fileContents[file.basename] =
        '# Original File\n\n## Tasks\n\n- [ ] a test task ^task-abcd\n';

      vault.readFile.mockImplementation((f, useCache) => {
        return Promise.resolve(fileContents[f.basename]);
      });

      vault.writeFile.mockImplementation((f, data) => {
        fileContents[f.basename] = data;
        return Promise.resolve();
      });

      vault.fileNameForMoment.mockImplementation((date) => {
        return date.format('YYYY-MM-DD');
      });

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
        '## Tasks\n\n- [ ] a test task [[2020-12-31#^task-abcd|< Origin]]\n',
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
        '## Tasks\n\n- [>] a test task [[2020-12-31#^task-abcd|< Origin]] >[[2021-01-02]]\n',
      );
      expect(fileContents['2021-01-02']).toEqual(
        '## Tasks\n\n- [ ] a test task [[2020-12-31#^task-abcd|< Origin]]\n',
      );
    });
  });

  describe('when link aliasing is disabled', () => {
    beforeAll(() => {
      settings = new SettingsInstance({ aliasLinks: false });
    });

    test('when the task has repeating', async () => {
      vault.readFile.mockImplementation((f, useCache) => {
        if (f === file) {
          return p(
            '# Original File\n\n## Tasks\n\n- [ ] a test task ; Every Sunday ^task-abc123\n',
          );
        }
        return p('');
      });
      vault.fileNameForMoment.mockReturnValueOnce('2021-01-01');

      const line = '- [ ] a test task ; Every Sunday ^task-abc123';
      const tl = new TaskLine(line, 4, file, vault, settings);
      await tl.move(moment('2021-01-01'));

      expect(futureFiles.length).toEqual(1);
      expect(vault.readFile).toHaveBeenCalledWith(futureFiles[0], false);
      expect(vault.writeFile).toHaveBeenCalledTimes(2);
      expect(vault.writeFile).toHaveBeenNthCalledWith(
        1,
        futureFiles[0],
        `## Tasks\n\n- [ ] a test task ; Every Sunday <[[${startDateStr}#^task-abc123]]\n`,
      );
      expect(vault.writeFile).toHaveBeenNthCalledWith(
        2,
        file,
        '# Original File\n\n## Tasks\n\n- [>] a test task ; Every Sunday >[[2021-01-01]] ^task-abc123\n',
      );
    });

    test('when the task does not repeat', async () => {
      vault.readFile.mockImplementation((f, useCache) => {
        if (f === file) {
          return p('# Original File\n\n## Tasks\n\n- [ ] a test task\n');
        }
        return p('');
      });
      vault.fileNameForMoment.mockReturnValueOnce('2021-01-01');

      const line = '- [ ] a test task';
      const tl = new TaskLine(line, 4, file, vault, settings);
      await tl.move(moment('2021-01-01'));

      expect(futureFiles.length).toEqual(1);
      expect(vault.readFile).toHaveBeenCalledWith(futureFiles[0], false);
      expect(vault.writeFile).toHaveBeenCalledTimes(2);

      expect(vault.writeFile.mock.calls[0][0]).toEqual(futureFiles[0]);
      expect(vault.writeFile.mock.calls[0][1]).toHaveLines(
        [
          '## Tasks',
          '',
          '^' +
            escapeRegExp(`${line} <[[${startDateStr}#^task-`) +
            '[-a-zA-Z0-9]{4}\\]\\]$',
          '',
        ],
        [2],
      );

      expect(vault.writeFile.mock.calls[1][0]).toEqual(file);
      expect(vault.writeFile.mock.calls[1][1]).toHaveLines(
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
      const fileContents: Record<string, string> = {};
      fileContents[file.basename] =
        '# Original File\n\n## Tasks\n\n- [ ] a test task ^task-abcd\n';

      vault.readFile.mockImplementation((f, useCache) => {
        return Promise.resolve(fileContents[f.basename]);
      });

      vault.writeFile.mockImplementation((f, data) => {
        fileContents[f.basename] = data;
        return Promise.resolve();
      });

      vault.fileNameForMoment.mockImplementation((date) => {
        return date.format('YYYY-MM-DD');
      });

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
  });
});

describe('taskLine.createNextRepetition', () => {
  let futureFiles: TFile[];

  beforeAll(() => {
    file = getMockFileForMoment(startDate);
    settings = new SettingsInstance({});
  });

  beforeEach(() => {
    vault = mock<VaultIntermediate>();
    vault.findMomentForDailyNote.mockImplementation((dailyNote) => {
      const date = moment(dailyNote.basename, format, true);
      return date.isValid() ? date : undefined;
    });

    futureFiles = [];
    vault.getDailyNote.mockImplementation((date) => {
      const mockFile = getMockFileForMoment(date);
      futureFiles.push(mockFile);
      return Promise.resolve(mockFile);
    });
  });

  describe('when link aliasing is enabled', () => {
    beforeAll(() => {
      settings = new SettingsInstance({ aliasLinks: true });
    });

    test('if it has a tasks section, the task is appended to existing', async () => {
      vault.readFile.mockReturnValueOnce(
        p(
          '# Hello\n\n## Tasks\n\n- [ ] Something\n  - A sub item\n\n## Another Header\n',
        ),
      );

      const futureFiles: TFile[] = [];
      vault.getDailyNote.mockImplementation((date) => {
        const mockFile = getMockFileForMoment(date);
        futureFiles.push(mockFile);
        return Promise.resolve(mockFile);
      });

      const line = '- [ ] a test task ; Every Sunday ^task-abc123';
      const tl = new TaskLine(line, 0, file, vault, settings);
      await tl.createNextRepetition();

      expect(futureFiles.length).toEqual(1);
      expect(vault.readFile).toHaveBeenCalledWith(futureFiles[0], false);
      expect(vault.writeFile).toHaveBeenCalledTimes(1);
      expect(vault.writeFile.mock.calls[0][0]).toEqual(futureFiles[0]);
      expect(vault.writeFile.mock.calls[0][1]).toHaveLines(
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
      settings = new SettingsInstance({ aliasLinks: false });
    });

    test('if it has a tasks section, the task is appended to existing', async () => {
      vault.readFile.mockReturnValueOnce(
        p(
          '# Hello\n\n## Tasks\n\n- [ ] Something\n  - A sub item\n\n## Another Header\n',
        ),
      );

      const futureFiles: TFile[] = [];
      vault.getDailyNote.mockImplementation((date) => {
        const mockFile = getMockFileForMoment(date);
        futureFiles.push(mockFile);
        return Promise.resolve(mockFile);
      });

      const line = '- [ ] a test task ; Every Sunday ^task-abc123';
      const tl = new TaskLine(line, 0, file, vault, settings);
      await tl.createNextRepetition();

      expect(futureFiles.length).toEqual(1);
      expect(vault.readFile).toHaveBeenCalledWith(futureFiles[0], false);
      expect(vault.writeFile).toHaveBeenCalledTimes(1);
      expect(vault.writeFile.mock.calls[0][0]).toEqual(futureFiles[0]);
      expect(vault.writeFile.mock.calls[0][1]).toHaveLines(
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
      vault.readFile.mockReturnValueOnce(p('# Hello\n\n## Tasks\n'));

      const futureFiles: TFile[] = [];
      vault.getDailyNote.mockImplementation((date) => {
        const mockFile = getMockFileForMoment(date);
        futureFiles.push(mockFile);
        return Promise.resolve(mockFile);
      });

      const line = '- [ ] a test task ; Every Sunday ^task-abc123';
      const tl = new TaskLine(line, 0, file, vault, settings);
      await tl.createNextRepetition();

      expect(futureFiles.length).toEqual(1);
      expect(vault.readFile).toHaveBeenCalledWith(futureFiles[0], false);
      expect(vault.writeFile).toHaveBeenCalledTimes(1);
      expect(vault.writeFile.mock.calls[0][0]).toEqual(futureFiles[0]);
      expect(vault.writeFile.mock.calls[0][1]).toHaveLines(
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
      vault.readFile.mockReturnValueOnce(p('# Hello\n\n## Another Section\n'));

      const futureFiles: TFile[] = [];
      vault.getDailyNote.mockImplementation((date) => {
        const mockFile = getMockFileForMoment(date);
        futureFiles.push(mockFile);
        return Promise.resolve(mockFile);
      });

      const line = '- [ ] a test task ; Every Sunday ^task-abc123';
      const tl = new TaskLine(line, 0, file, vault, settings);
      await tl.createNextRepetition();

      expect(futureFiles.length).toEqual(1);
      expect(vault.readFile).toHaveBeenCalledWith(futureFiles[0], false);
      expect(vault.writeFile).toHaveBeenCalledTimes(1);
      expect(vault.writeFile.mock.calls[0][0]).toEqual(futureFiles[0]);
      expect(vault.writeFile.mock.calls[0][1]).toHaveLines(
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
  });
});

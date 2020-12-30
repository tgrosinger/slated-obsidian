import { TaskLine } from './task-line';
import type { VaultIntermediate } from './vault';
import { mock, MockProxy } from 'jest-mock-extended';
import type { TFile } from 'obsidian';
import moment from 'moment';
import { SettingsInstance } from './settings';

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
    settings = new SettingsInstance({ futureRepetitionsCount: 1 });
  });

  test('When line is not a ul', () => {
    const line = '1. This is not a task';
    const tl = new TaskLine(line, 1, file, vault, settings);
  });
  test('When the line is indented', () => {
    const line = '  - [ ] This is a simple task';
    const tl = new TaskLine(line, 1, file, vault, settings);
    expect(tl.line).toEqual(line);
  });
  test('When the checkbox is invalid', () => {
    const line = '- [>] This is not a task';
    const tl = new TaskLine(line, 1, file, vault, settings);
  });
  test('When the checkbox is checked', () => {
    const line = '- [x] This task is done';
    const tl = new TaskLine(line, 1, file, vault, settings);
    expect(tl.line).toEqual(line);
    expect(tl.repeats).toBeFalsy();
    expect(tl.blockID).toEqual('');
    expect(tl.isOriginalInstance).toBeFalsy();
  });
  test('When the checkbox is checked', () => {
    const line = '- [X] This task is done';
    const tl = new TaskLine(line, 1, file, vault, settings);
    expect(tl.line).toEqual(line);
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
  });

  describe('When there is a block ID', () => {
    test('When there are no spaces', () => {
      const line = '- [ ] The task^task-abc123';
      const tl = new TaskLine(line, 1, file, vault, settings);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.isOriginalInstance).toBeFalsy();
    });
    test('When there are spaces', () => {
      const line = '- [ ] The task ^task-abc123';
      const tl = new TaskLine(line, 1, file, vault, settings);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.isOriginalInstance).toBeFalsy();
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
      expect(tl.isOriginalInstance).toBeFalsy();
    });
    test('When there are spaces', () => {
      const line = '- [x] The task >[[2020-12-25]] ^task-abc123';
      const tl = new TaskLine(line, 1, file, vault, settings);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedTo).toEqual('2020-12-25');
      expect(tl.isOriginalInstance).toBeFalsy();
    });
    test('When the note name is not a date', () => {
      const line = '- [x] The task >[[some other note]] ^task-abc123';
      const tl = new TaskLine(line, 1, file, vault, settings);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedTo).toEqual('some other note');
      expect(tl.isOriginalInstance).toBeFalsy();
    });
    test('When the note has been renamed', () => {
      const line =
        '- [x] The task >[[2020-12-25|some other note]] ^task-abc123';
      const tl = new TaskLine(line, 1, file, vault, settings);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeFalsy();
      expect(tl.blockID).toEqual('task-abc123');
      expect(tl.movedTo).toEqual('2020-12-25');
      expect(tl.isOriginalInstance).toBeFalsy();
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
    test('When the note has been renamed', () => {
      const line =
        '- [ ] The task <[[2020-12-25#^task-abc123|some other note]]';
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
  });
});

describe('taskLine.createNextRepetition', () => {
  beforeAll(() => {
    file = getMockFileForMoment(startDate);
    settings = new SettingsInstance({ futureRepetitionsCount: 1 });
  });

  beforeEach(() => {
    vault = mock<VaultIntermediate>();
    vault.findMomentForDailyNote.mockImplementation((dailyNote) => {
      const date = moment(dailyNote.basename, format, true);
      return date.isValid() ? date : undefined;
    });
  });

  describe('when the future file exists', () => {
    describe('when a newline should be inserted after headings', () => {
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
        vault.readFile.mockReturnValueOnce(
          p('# Hello\n\n## Another Section\n'),
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
});

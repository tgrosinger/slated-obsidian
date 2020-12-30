import { SettingsInstance } from './settings';
import { TaskHandler } from './task-handler';
import type { VaultIntermediate } from './vault';
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

describe('scanAndPropogateRepetitions reads file contents', () => {
  let file: MockProxy<TFile>;
  let vault: jest.Mocked<VaultIntermediate>;
  let settings: jest.Mocked<SettingsInstance>;
  let taskHandler: TaskHandler;

  beforeAll(() => {
    file = getMockFileForMoment(startDate);
    settings = new SettingsInstance({ futureRepetitionsCount: 1 });
  });

  beforeEach(() => {
    vault = mock<VaultIntermediate>();
    taskHandler = new TaskHandler(vault, settings);

    vault.findMomentForDailyNote.mockImplementation((dailyNote) => {
      const date = moment(dailyNote.basename, format, true);
      return date.isValid() ? date : undefined;
    });
  });

  describe('taskHandler.processFile', () => {
    test('When the file contains only a single task', async () => {
      vault.readFile.mockReturnValueOnce(p('- [ ] a test task ; Every Sunday'));

      await taskHandler.processFile(file);

      expect(vault.readFile).toHaveBeenCalledWith(file, false);
      expect(vault.writeFile).toHaveBeenCalledTimes(1);
      expect(vault.writeFile.mock.calls[0][0]).toEqual(file);
      expect(vault.writeFile.mock.calls[0][1]).toMatch(
        new RegExp(
          escapeRegExp('- [ ] a test task ; Every Sunday ^task-') +
            '[a-z0-9]{4}',
        ),
      );
    });

    test('When the file contains multiple tasks', async () => {
      vault.readFile.mockReturnValueOnce(
        p(
          '- [ ] a test task ; Every Sunday\n- [ ] another task; Every Thursday',
        ),
      );

      await taskHandler.processFile(file);

      expect(vault.readFile).toHaveBeenCalledWith(file, false);
      expect(vault.writeFile).toHaveBeenCalledTimes(1);
      expect(vault.writeFile.mock.calls[0][0]).toEqual(file);
      expect(vault.writeFile.mock.calls[0][1]).toHaveLines(
        [
          escapeRegExp(`- [ ] a test task ; Every Sunday ^task-`) +
            '[a-zA-Z0-9]{4}',
          escapeRegExp(`- [ ] another task; Every Thursday ^task-`) +
            '[a-zA-Z0-9]{4}',
        ],
        [0, 1],
      );
    });

    test('When there is other content in the file too', async () => {
      vault.readFile.mockReturnValueOnce(
        p(
          [
            '# 2020-12-31',
            '',
            '## Tasks',
            '',
            '- [ ] a test task; Every Monday',
            '  - a subtask',
            '',
            '## Notes',
            '',
            '- These are my notes',
            '',
          ].join('\n'),
        ),
      );

      await taskHandler.processFile(file);

      expect(vault.readFile).toHaveBeenCalledWith(file, false);
      expect(vault.writeFile).toHaveBeenCalledTimes(1);
      expect(vault.writeFile.mock.calls[0][0]).toEqual(file);
      expect(vault.writeFile.mock.calls[0][1]).toHaveLines(
        [
          '# 2020-12-31',
          '',
          '## Tasks',
          '',
          escapeRegExp(`- [ ] a test task; Every Monday ^task-`) +
            '[a-zA-Z0-9]{4}',
          '  - a subtask',
          '',
          '## Notes',
          '',
          '- These are my notes',
          '',
        ],
        [4],
      );
    });
  });
});

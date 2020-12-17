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

  beforeEach(() => {
    file = getMockFileForMoment(startDate);
    vault = mock<VaultIntermediate>();
    settings = new SettingsInstance({ futureRepetitionsCount: 1 });
    taskHandler = new TaskHandler(vault, settings);

    vault.findMomentForDailyNote.mockImplementation((dailyNote) => {
      const date = moment(dailyNote.basename, format, true);
      return date.isValid() ? date : null;
    });
  });

  describe('taskHandler.processFile', () => {
    describe('when the future file exists', () => {
      describe('when a newline should be inserted after headings', () => {
        test('if it has a tasks section, the task is appended to existing', async () => {
          vault.readFile
            .mockReturnValueOnce(p('- [ ] a test task ; Every Sunday'))
            .mockReturnValueOnce(
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

          await taskHandler.processFile(file);

          expect(vault.readFile).toHaveBeenCalledWith(file, false);
          expect(vault.writeFile.mock.calls[0][0]).toEqual(file);
          expect(vault.writeFile.mock.calls[0][1]).toMatch(
            new RegExp(
              escapeRegExp('- [ ] a test task ; Every Sunday ^task-') +
                '[a-z0-9]{4}',
            ),
          );

          expect(futureFiles.length).toEqual(1);
          expect(vault.writeFile.mock.calls[1][0]).toEqual(futureFiles[0]);
          expect(vault.writeFile.mock.calls[1][1]).toHaveLines(
            [
              '# Hello',
              '',
              '## Tasks',
              '',
              '- [ ] Something',
              '  - A sub item',
              escapeRegExp(
                `- [ ] a test task ; Every Sunday <<[[${startDateStr}#^task-`,
              ) + '[a-zA-Z0-9]{4}\\]\\]',
              '',
              '## Another Header',
              '',
            ],
            [6],
          );
        });

        test('if it has a tasks section, the task is appended', async () => {
          vault.readFile
            .mockReturnValueOnce(p('- [ ] a test task ; Every Sunday'))
            .mockReturnValueOnce(p('# Hello\n\n## Tasks\n'));

          const futureFiles: TFile[] = [];
          vault.getDailyNote.mockImplementation((date) => {
            const mockFile = getMockFileForMoment(date);
            futureFiles.push(mockFile);
            return Promise.resolve(mockFile);
          });

          await taskHandler.processFile(file);

          expect(vault.readFile).toHaveBeenCalledWith(file, false);
          expect(vault.writeFile.mock.calls[0][0]).toEqual(file);
          expect(vault.writeFile.mock.calls[0][1]).toMatch(
            new RegExp(
              escapeRegExp('- [ ] a test task ; Every Sunday ^task-') +
                '[-a-zA-Z0-9]{4}',
            ),
          );

          expect(futureFiles.length).toEqual(1);
          expect(vault.writeFile.mock.calls[1][0]).toEqual(futureFiles[0]);
          expect(vault.writeFile.mock.calls[1][1]).toHaveLines(
            [
              '# Hello',
              '',
              '## Tasks',
              '',
              escapeRegExp(
                `- [ ] a test task ; Every Sunday <<[[${startDateStr}#^task-`,
              ) + '[a-zA-Z0-9]{4}\\]\\]',
              '',
            ],
            [4],
          );
        });

        test('if it does not have a tasks section, one is created', async () => {
          vault.readFile
            .mockReturnValueOnce(p('- [ ] a test task ; Every Sunday'))
            .mockReturnValueOnce(p('# Hello\n\n## Another Section\n'));

          const futureFiles: TFile[] = [];
          vault.getDailyNote.mockImplementation((date) => {
            const mockFile = getMockFileForMoment(date);
            futureFiles.push(mockFile);
            return Promise.resolve(mockFile);
          });

          await taskHandler.processFile(file);

          expect(vault.readFile).toHaveBeenCalledWith(file, false);
          expect(vault.writeFile.mock.calls[0][0]).toEqual(file);
          expect(vault.writeFile.mock.calls[0][1]).toMatch(
            new RegExp(
              escapeRegExp('- [ ] a test task ; Every Sunday ^task-') +
                '[-a-zA-Z0-9]{4}',
            ),
          );

          expect(futureFiles.length).toEqual(1);
          expect(vault.writeFile.mock.calls[1][0]).toEqual(futureFiles[0]);
          expect(vault.writeFile.mock.calls[1][1]).toHaveLines(
            [
              '# Hello',
              '',
              '## Another Section',
              '',
              '## Tasks',
              '',
              escapeRegExp(
                `- [ ] a test task ; Every Sunday <<[[${startDateStr}#^task-`,
              ) + '[a-zA-Z0-9]{4}\\]\\]',
              '',
            ],
            [6],
          );
        });
      });
    });
  });
});

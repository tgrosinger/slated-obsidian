import { SettingsInstance } from './settings';
import { TaskHandler } from './task-handler';
import type { VaultIntermediate } from './vault';
import { mock, MockProxy } from 'jest-mock-extended';
import moment from 'moment';
import type { TFile } from 'obsidian';

const format = 'YYYY-MM-DD';
const startDate = moment('2020-12-31');

const getMockFileWithBasename = (basename: string): MockProxy<TFile> => {
  const mockFile = mock<TFile>();
  mockFile.basename = basename;
  return mockFile;
};

const getMockFileForMoment = (date: moment.Moment): MockProxy<TFile> =>
  getMockFileWithBasename(date.format(format));

describe('scanAndPropogateRepetitions reads file contents', () => {
  let file: MockProxy<TFile>;
  let vault: jest.Mocked<VaultIntermediate>;
  let settings: jest.Mocked<SettingsInstance>;
  let taskHandler: TaskHandler;

  beforeEach(() => {
    file = getMockFileForMoment(startDate);
    vault = mock<VaultIntermediate>();
    settings = new SettingsInstance({ futureRepetitionsCount: 2 });
    taskHandler = new TaskHandler(vault, settings);
  });

  /**
   * TODO: Add tasks specifically of TaskLine class
   *
   * Tests to add:
   * - Multiple instances of repeat config denoters is marked invalid
   * - Invalid repeat config does not call propogateRepetitionsForTask
   * - Invalid repeat config creates a Notify
   * - Invalid repeat config gets a blockID appended
   */

  describe('valid task lines', () => {
    test('single line with repeat', async () => {
      vault.readFile
        .mockReturnValueOnce(
          Promise.resolve('- [ ] a test task ; Every Sunday'),
        )
        .mockReturnValue(Promise.resolve(''));
      vault.findMomentForDailyNote.mockImplementation((dailyNote) => {
        const date = moment(dailyNote.basename, format, true);
        return date.isValid() ? date : null;
      });

      const futureFiles: TFile[] = [];
      vault.getDailyNote.mockImplementation((date) => {
        const mockFile = getMockFileForMoment(date);
        futureFiles.push(mockFile);
        return Promise.resolve(mockFile);
      });

      await taskHandler.processFile(file);

      expect(vault.readFile).toHaveBeenCalledWith(file, false);
      expect(vault.writeFile.mock.calls[0][0]).toEqual(file);
      expect(
        vault.writeFile.mock.calls[0][1].startsWith(
          '- [ ] a test task ; Every Sunday ^task-',
        ),
      ).toBeTruthy();

      expect(futureFiles.length).toEqual(2);
      expect(vault.writeFile.mock.calls[1][0]).toEqual(futureFiles[0]);
      expect(vault.writeFile.mock.calls[2][0]).toEqual(futureFiles[1]);

      // TODO: This should not actually be the same. It should have a link
      expect(vault.writeFile.mock.calls[1][1]).toEqual(
        '\n## Tasks\n' + vault.writeFile.mock.calls[0][1],
      );
      expect(vault.writeFile.mock.calls[2][1]).toEqual(
        '\n## Tasks\n' + vault.writeFile.mock.calls[0][1],
      );
    });

    /*
    test('multi-line including non-tasks', async () => {
      const inputLines = [
        '# My Header',
        '',
        '- [ ] a test task ; Every Sunday',
        '- [ ] another task with no repeat',
        '  - a subtask',
      ];

      vault.readFile.mockReturnValue(Promise.resolve(inputLines.join('\n')));
      vault.findMomentForDailyNote.mockReturnValue(moment.utc());
      const futureFiles: TFile[] = [];
      vault.getDailyNote.mockImplementation((date) => {
        const mockFile = mock<TFile>();
        futureFiles.push(mockFile);
        return Promise.resolve(mockFile);
      });

      await taskHandler.processFile(file);

      expect(vault.readFile).toHaveBeenCalledWith(file, false);
      expect(vault.writeFile.mock.calls[0][0]).toEqual(file);

      const outputLines = vault.writeFile.mock.calls[0][1].split('\n');
      expect(outputLines.length).toEqual(inputLines.length);
      for (let i = 0; i < inputLines.length; i++) {
        if (i === 2) {
          expect(
            outputLines[i].startsWith(inputLines[i] + ' ^task-'),
          ).toBeTruthy();
        } else {
          expect(outputLines[i]).toEqual(inputLines[i]);
        }
      }
    });
    */
  });
});

import { SettingsInstance } from './settings';
import { TaskHandler, TaskLine } from './task-handler';
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

describe('When a taskLine is created', () => {
  test('should properly parse an existing block hash', () => {
    const blockID = '^a1b2c3';
    const input = '- [ ] this is the task ' + blockID;
    const taskLine = new TaskLine(input, 1);
    expect(taskLine.line).toEqual(input);
    expect(taskLine.blockID).toEqual(blockID);
  });

  test('should leave the block hash empty when there is not one', () => {
    const input = '- [ ] this is the task';
    const taskLine = new TaskLine(input, 1);
    expect(taskLine.line).toEqual(input);
    expect(taskLine.blockID).toEqual('');
  });

  test('should create a block hash for repeating tasks', () => {
    const input = '- [ ] this is the task ; Every Sunday';
    const regexInput = '- \\[ \\] this is the task ; Every Sunday';
    const taskLine = new TaskLine(input, 1);
    expect(taskLine.blockID).not.toEqual('');
    expect(taskLine.line).toMatch(
      new RegExp(`^${regexInput} \\^task-[\\-a-zA-Z0-9]+$`),
    );
  });

  test('should properly parse the repeating config', () => {
    const input = '- [ ] this is the task ; Every Sunday ^a1b2c3';
    const taskLine = new TaskLine(input, 1);
    expect(taskLine.line).toEqual(input);
    expect(taskLine.repeatConfig.toString()).toEqual(
      'RRULE:FREQ=WEEKLY;BYDAY=SU',
    );
  });

  test('should properly assess when there is not a repeating config', () => {
    const input = '- [ ] this is the task';
    const taskLine = new TaskLine(input, 1);
    expect(taskLine.line).toEqual(input);
    expect(taskLine.repeats).toBeFalsy();
    expect(taskLine.repeatValid).toBeFalsy();
  });
});

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

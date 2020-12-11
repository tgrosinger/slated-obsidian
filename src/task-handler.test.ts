import { SettingsInstance } from './settings';
import { TaskHandler, TaskLine } from './task-handler';
import { VaultIntermediate } from './vault';
import { mock, MockProxy } from 'jest-mock-extended';
import { TFile } from 'obsidian';

// TODO: Convert from `it` to another layer of `describe` with tests?

describe('When a taskLine is created', () => {
  it('should properly parse an existing block hash', () => {
    const blockID = '^a1b2c3';
    const input = '- [ ] this is the task ' + blockID;
    const taskLine = new TaskLine(input, 1);
    expect(taskLine.line).toEqual(input);
    expect(taskLine.blockID).toEqual(blockID);
  });

  it('should leave the block hash empty when there is not one', () => {
    const input = '- [ ] this is the task';
    const taskLine = new TaskLine(input, 1);
    expect(taskLine.line).toEqual(input);
    expect(taskLine.blockID).toEqual('');
  });

  it('should create a block hash for repeating tasks', () => {
    const input = '- [ ] this is the task ; Every Sunday';
    const regexInput = '- \\[ \\] this is the task ; Every Sunday';
    const taskLine = new TaskLine(input, 1);
    expect(taskLine.blockID).not.toEqual('');
    expect(taskLine.line).toMatch(
      new RegExp(`^${regexInput} \\^task-[\\-a-zA-Z0-9]+$`),
    );
  });

  it('should properly parse the repeating config', () => {
    const input = '- [ ] this is the task ; Every Sunday ^a1b2c3';
    const taskLine = new TaskLine(input, 1);
    expect(taskLine.line).toEqual(input);
    expect(taskLine.repeatConfig.toString()).toEqual(
      'RRULE:FREQ=WEEKLY;BYDAY=SU',
    );
  });

  it('should properly assess when there is not a repeating config', () => {
    const input = '- [ ] this is the task';
    const taskLine = new TaskLine(input, 1);
    expect(taskLine.line).toEqual(input);
    expect(taskLine.repeats).toBeFalsy;
    expect(taskLine.repeatValid).toBeFalsy;
  });
});

describe('scanAndPropogateRepetitions reads file contents', () => {
  let file: MockProxy<TFile>;
  let vault: jest.Mocked<VaultIntermediate>;
  let settings: jest.Mocked<SettingsInstance>;
  let taskHandler: TaskHandler;

  beforeEach(() => {
    file = mock<TFile>();
    vault = mock<VaultIntermediate>();
    settings = mock<SettingsInstance>();
    taskHandler = new TaskHandler(vault, settings);
  });

  /**
   * TODO: Add tasks specifically of TaskLine class
   *
   * Tests to add:
   * - 📅 is recognized to denote the repeat config
   * - ; is recognized to denote the repeat config
   * - Multiple instances of repeat config denoters is marked invalid
   * - Invalid repeat config does not call propogateRepetitionsForTask
   * - Invalid repeat config creates a Notify
   * - Invalid repeat config gets a blockID appended
   */

  describe('valid task lines', () => {
    test('single line with repeat', async () => {
      vault.readFile.mockReturnValue(
        Promise.resolve('- [ ] a test task ; Every Sunday'),
      );

      await taskHandler.processFile(file);

      expect(vault.readFile).toHaveBeenCalledWith(file, false);
      expect(vault.writeFile.mock.calls[0][0]).toEqual(file);
      expect(
        vault.writeFile.mock.calls[0][1].startsWith(
          '- [ ] a test task ; Every Sunday ^task-',
        ),
      ).toBeTruthy();
    });

    test('multi-line including non-tasks', async () => {
      const inputLines = [
        '# My Header',
        '',
        '- [ ] a test task ; Every Sunday',
        '- [ ] another task with no repeat',
        '  - a subtask',
      ];

      vault.readFile.mockReturnValue(Promise.resolve(inputLines.join('\n')));

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
  });
});

import { SettingsInstance } from './settings';
import { TaskHandler } from './task-handler';
import { VaultIntermediate } from './vault';
import { mock, MockProxy } from 'jest-mock-extended';
import { TFile } from 'obsidian';

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

  test('first test', () => {
    taskHandler.processFile(file);
    expect(vault.readFile).toHaveBeenCalledWith(file, false);
  });

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

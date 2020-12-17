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
              Promise.resolve(
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
          expect(
            vault.writeFile.mock.calls[0][1].startsWith(
              '- [ ] a test task ; Every Sunday ^task-',
            ),
          ).toBeTruthy();

          expect(futureFiles.length).toEqual(1);
          expect(vault.writeFile.mock.calls[1][0]).toEqual(futureFiles[0]);

          // TODO: This should not actually be the same. It should have a link
          expect(vault.writeFile.mock.calls[1][1]).toEqual(
            '# Hello\n\n## Tasks\n\n- [ ] Something\n  - A sub item\n' +
              vault.writeFile.mock.calls[0][1] +
              '\n\n## Another Header\n',
          );
        });

        test('if it has a tasks section, the task is appended', async () => {
          vault.readFile
            .mockReturnValueOnce(p('- [ ] a test task ; Every Sunday'))
            .mockReturnValueOnce(Promise.resolve('# Hello\n\n## Tasks\n'));

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

          expect(futureFiles.length).toEqual(1);
          expect(vault.writeFile.mock.calls[1][0]).toEqual(futureFiles[0]);

          // TODO: This should not actually be the same. It should have a link
          expect(vault.writeFile.mock.calls[1][1]).toEqual(
            '# Hello\n\n## Tasks\n\n' + vault.writeFile.mock.calls[0][1] + '\n',
          );
        });

        test('if it does not have a tasks section, one is created', async () => {
          vault.readFile
            .mockReturnValueOnce(p('- [ ] a test task ; Every Sunday'))
            .mockReturnValueOnce(
              Promise.resolve('# Hello\n\n## Another Section\n'),
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
          expect(
            vault.writeFile.mock.calls[0][1].startsWith(
              '- [ ] a test task ; Every Sunday ^task-',
            ),
          ).toBeTruthy();

          expect(futureFiles.length).toEqual(1);
          expect(vault.writeFile.mock.calls[1][0]).toEqual(futureFiles[0]);

          // TODO: This should not actually be the same. It should have a link
          expect(vault.writeFile.mock.calls[1][1]).toEqual(
            '# Hello\n\n## Another Section\n\n## Tasks\n\n' +
              vault.writeFile.mock.calls[0][1] +
              '\n',
          );
        });
      });
    });
  });
});

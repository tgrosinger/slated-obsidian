import { ISettings, settingsWithDefaults } from '../src/settings';
import { TaskHandler } from '../src/task-handler';
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
let settings: jest.Mocked<ISettings>;
let taskHandler: TaskHandler;
let fileContents: Record<string, string>;

beforeAll(() => {
  file = getMockFileForMoment(startDate);
  settings = settingsWithDefaults({
    blankLineAfterHeader: true,
  });
});

beforeEach(() => {
  window.moment = moment;
  vault = mock<VaultIntermediate>();
  taskHandler = new TaskHandler(vault, settings);

  vault.findMomentForDailyNote.mockImplementation((dailyNote) => {
    const date = moment(dailyNote.basename, format, true);
    return date.isValid() ? date : undefined;
  });

  fileContents = {};
  vault.readFile.mockImplementation((f, useCache) =>
    Promise.resolve(fileContents[f.basename]),
  );

  vault.writeFile.mockImplementation((f, data) => {
    fileContents[f.basename] = data;
    return Promise.resolve();
  });
});

describe('taskHandler.processFile', () => {
  test('When the file contains only a single task', async () => {
    fileContents[file.basename] = '- [ ] a test task ; Every Sunday';

    await taskHandler.processFile(file);

    expect(fileContents[file.basename]).toEqual(
      '- [ ] a test task ; Every Sunday',
    );
  });

  test('When the file contains multiple tasks', async () => {
    fileContents[file.basename] =
      '- [ ] a test task ; Every Sunday\n- [ ] another task; Every Thursday';

    await taskHandler.processFile(file);

    expect(fileContents[file.basename]).toHaveLines(
      [
        '- [ ] a test task ; Every Sunday',
        '- [ ] another task; Every Thursday',
      ],
      [],
    );
  });

  test('When there is other content in the file too', async () => {
    fileContents[file.basename] = [
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
    ].join('\n');

    await taskHandler.processFile(file);

    expect(fileContents[file.basename]).toHaveLines(
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
      ],
      [],
    );
  });

  test('Newly completed tasks are propogated', async () => {
    fileContents[file.basename] = '- [ ] a test task ; Every Sunday';

    const futureFiles: TFile[] = [];
    vault.getDailyNote.mockImplementation((date) => {
      const mockFile = getMockFileForMoment(date);
      futureFiles.push(mockFile);
      return Promise.resolve(mockFile);
    });

    await taskHandler.processFile(file);

    fileContents[file.basename] = '- [x] a test task ; Every Sunday';

    await taskHandler.processFile(file);

    expect(futureFiles).toHaveLength(1);
    expect(fileContents[futureFiles[0].basename]).toEqual(
      '## Tasks\n\n- [ ] a test task ; Every Sunday\n',
    );
  });
});

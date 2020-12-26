import { TaskLine } from './task-line';
import type { VaultIntermediate } from './vault';
import { mock, MockProxy } from 'jest-mock-extended';
import type { TFile } from 'obsidian';
import { SettingsInstance } from './settings';

const escapeRegExp = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string

let file: MockProxy<TFile>;
let vault: jest.Mocked<VaultIntermediate>;
let settings: SettingsInstance;

beforeAll(() => {
  file = mock<TFile>();
  vault = mock<VaultIntermediate>();
  settings = new SettingsInstance({ futureRepetitionsCount: 1 });
});

describe('Tasks are parsed correctly', () => {
  test('When line is not a ul', () => {
    const line = '1. This is not a task';
    const tl = new TaskLine(line, 1, file, vault, settings);
    // TODO: Expect to throw error?
  });
  test('When the line is indented', () => {
    const line = '  - [ ] This is a simple task';
    const tl = new TaskLine(line, 1, file, vault, settings);
    expect(tl.line).toEqual(line);
  });
  test('When the checkbox is invalid', () => {
    const line = '- [>] This is not a task';
    const tl = new TaskLine(line, 1, file, vault, settings);
    // TODO: Expect to throw error?
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
      expect(tl.isOriginalInstance).toBeTruthy();
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

  describe('When the task repetition is invalid', () => {
    test('When the user is still typing', () => {
      const line = '- [ ] The task; Eve';
      const tl = new TaskLine(line, 1, file, vault, settings);
      expect(tl.line).toEqual(line);
      expect(tl.repeats).toBeTruthy();
      expect(tl.repeater.isValid()).toBeFalsy();
      expect(tl.blockID).toEqual('');
      expect(tl.isOriginalInstance).toBeFalsy();
    });
  });
});

describe('Tasks are created and removed correctly when repetition is updated', () => {
  describe('When the task updated is the original task', () => {});

  describe('When the task updated is a repetition in the past', () => {});

  describe('When the task updated is a repetition in the future', () => {});

  describe('When the task updated is a repetition on today', () => {});
});

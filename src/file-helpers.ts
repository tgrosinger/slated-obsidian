import type { ISettings } from './settings';
import type { TaskLine } from './task-line';
import type { VaultIntermediate } from './vault';
import type { TFile } from 'obsidian';

/**
 * Adds a line for the provided task to the specified file in the tasks section.
 */
export const addTaskRepetition = async (
  file: TFile,
  task: TaskLine,
  settings: ISettings,
  vault: VaultIntermediate,
): Promise<void> => {
  console.debug(
    'Slated: Ensuring repeating task exists in file: ' + file.basename,
  );

  return withFileContents(file, vault, (lines: string[]): boolean => {
    const taskSectionIndex = getIndexTasksHeading(
      lines,
      task.headings,
      settings,
    );
    const taskSectionEndIndex = getIndexSectionLastContent(
      lines,
      taskSectionIndex,
    );

    const linesToInsert = task.subContent.slice();
    linesToInsert.unshift(task.lineAsRepeated());

    insertLines(lines, linesToInsert, taskSectionEndIndex + 1, settings);
    return true;
  });
};

export const addTaskMove = async (
  file: TFile,
  task: TaskLine,
  settings: ISettings,
  vault: VaultIntermediate,
): Promise<void> => {
  console.debug('Slated: Moving task to file: ' + file.basename);

  const linesToInsert = task.subContent.slice();
  linesToInsert.unshift(task.line);

  return withFileContents(file, vault, (lines: string[]): boolean => {
    const taskSectionIndex = getIndexTasksHeading(
      lines,
      task.headings,
      settings,
    );
    const taskSectionEndIndex = getIndexSectionLastContent(
      lines,
      taskSectionIndex,
    );

    insertLines(lines, linesToInsert, taskSectionEndIndex + 1, settings);
    return true;
  });
};

export const removeTask = async (
  file: TFile,
  task: TaskLine,
  vault: VaultIntermediate,
): Promise<void> =>
  removeLines(file, task.lineNum, 1 + task.subContent.length, vault);

export const removeLines = async (
  file: TFile,
  start: number,
  count: number,
  vault: VaultIntermediate,
): Promise<void> =>
  withFileContents(file, vault, (lines: string[]): boolean => {
    lines.splice(start, count);
    return true;
  });

/**
 * @description marks {count} the tasks starting on line {start} as copied by inserting '>' between brackets
 * @param {TFile} file
 * @param {number} start -- the line number of the first task to mark as copied
 * @param {number} count -- the number of tasks to mark as copied
 * @param {VaultIntermediate} vault 
 * @returns 
 */
export const markTaskAsCopied = async (
  file: TFile,
  start: number,
  count: number,
  vault: VaultIntermediate,
): Promise<void> =>
  withFileContents(file, vault, (lines: string[]): boolean => {
    const tasksToMark = lines.slice(start, start + count);
    const markedTasks = tasksToMark.map((t) => t.replace('[ ]', '[>]'));
    lines.splice(start, count, ...markedTasks);
    return true;
  });

/**
 * Read the file contents and pass to the provided function as a list of lines.
 * If the provided function returns true, write the array back to the file.
 * NOTE: If useCache is true, the fn is not allowed to update the file!
 */
const withFileContents = async (
  file: TFile,
  vault: VaultIntermediate,
  fn: (lines: string[]) => boolean,
  useCache = false,
): Promise<void> => {
  const fileContents = (await vault.readFile(file, useCache)) || '';
  const lines = fileContents.split('\n');

  const updated = fn(lines);
  if (!useCache && updated) {
    return vault.writeFile(file, lines.join('\n'));
  }
};

/**
 * Search the provided lines for the index of the tasks section heading.
 * NOTE: This may modifiy the array to add the header if missing.
 */
export const getIndexTasksHeading = (
  lines: string[],
  headings: string[],
  settings: ISettings,
): number => {
  if (headings.length === 0) {
    headings.push(settings.tasksHeader);
  }

  let startIdx = 0;
  let endIdx = lines.length;
  headings.forEach((heading) => {
    startIdx = getIndexHeadingHelper(
      lines,
      startIdx,
      endIdx,
      heading,
      settings,
    );
    endIdx = getIndexSectionNextSibling(lines, startIdx);
  });

  return startIdx;
};

const getIndexHeadingHelper = (
  lines: string[],
  startIdx: number,
  endIdx: number,
  heading: string,
  settings: ISettings,
): number => {
  const actualEndIdx = Math.min(endIdx, lines.length);
  for (let i = startIdx; i < actualEndIdx; i++) {
    if (lines[i] === heading) {
      return i;
    }
  }

  // Tasks section not found, so add it

  if (lines.length === 1 && lines[0] === '') {
    // Empty file, just replace the first line
    lines[0] = heading;
    return 0;
  }

  if (settings.blankLineAfterHeader && lines[endIdx - 1] !== '') {
    lines.splice(endIdx, 0, '', heading);
    return endIdx + 1;
  }

  lines.splice(endIdx, 0, heading);
  return endIdx;
};

export const getIndexSectionNextSibling = (
  lines: string[],
  sectionHeader: number,
): number => {
  const desiredHeaderDepth = getHeaderDepth(lines[sectionHeader]);

  // Start on the line after the header.
  // NOTE: That could be the end of the file!
  for (let i = sectionHeader + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#') && getHeaderDepth(line) <= desiredHeaderDepth) {
      return i;
    }
  }
  return lines.length;
};

/**
 * Search the provided lines for the index of the last line of content starting
 * after the provided section header index.
 */
export const getIndexSectionLastContent = (
  lines: string[],
  sectionHeader: number,
): number => {
  let lastContentLine = -1;
  let nextHeaderLine = -1;

  // Start on the line after the header.
  // NOTE: That could be the end of the file!
  for (let i = sectionHeader + 1; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('#')) {
      nextHeaderLine = i;
      break;
    }

    if (line.trim() !== '') {
      lastContentLine = i;
    }
  }

  if (lastContentLine === -1) {
    // There is no content in this section, so return the header index
    return sectionHeader;
  }
  // There is content in this section, return the last line of it.
  return lastContentLine;
};

/**
 * Insert the provided line before the provided index. If the settings call
 * for a blank line around headings, insert blank lines as necessary.
 */
export const insertLines = (
  fileLines: string[],
  linesToAdd: string[],
  i: number,
  settings: ISettings,
): void => {
  if (!settings.blankLineAfterHeader) {
    fileLines.splice(i, 0, ...linesToAdd);
    return;
  }

  if (i > 0 && fileLines[i - 1].startsWith('#')) {
    // Line before is a heading, leave a space
    linesToAdd.unshift('');
  }
  if (i < fileLines.length && fileLines[i].startsWith('#')) {
    // Next line is a heading, leave a space
    linesToAdd.push('');
  } else if (i === fileLines.length) {
    // Last line of the file, leave a space
    linesToAdd.push('');
  }

  fileLines.splice(i, 0, ...linesToAdd);
};

/**
 * Return true if the name of this daily note can be parsed into a date using
 * the configured daily note naming settings.
 */
export const fileIsDailyNote = (
  file: TFile,
  vault: VaultIntermediate,
): boolean => vault.findMomentForDailyNote(file) !== undefined;

export const getBlockIDIndex = (lines: string[], blockID: string): number => {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf(blockID) > -1) {
      return i;
    }
  }
  return -1;
};

export const getHeaderDepth = (line: string): number => {
  const trimmedLine = line.trimStart();
  for (let i = 0; i < trimmedLine.length; i++) {
    if (trimmedLine[i] === '#') {
      continue;
    }

    return i;
  }

  return trimmedLine.length;
};

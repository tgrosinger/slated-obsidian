<script lang="ts">
  import {
    cbCheckedIconSvg,
    cbUncheckedIconSvg,
    moved2IconSvg,
    repeatingIconSvg,
    nonRepeatingIconSvg,
    dailyIconSvg,
    weeklyIconSvg,
    monthlyIconSvg,
  } from 'src/graphics';

  import { FileTasks, NoteType, TaskCache } from 'src/task-cache';
  import type { TaskLine } from 'src/task-line';
  import ButtonGroup from './ButtonGroup.svelte';
  import TaskBlock from './TaskBlock.svelte';

  // Creation Parameters
  export let taskCache: TaskCache;

  // Constants
  const taskStatusFilterButtons = [
    { id: 0, icon: repeatingIconSvg },
    { id: 1, icon: nonRepeatingIconSvg },
    { id: 2, icon: cbUncheckedIconSvg },
    { id: 3, icon: cbCheckedIconSvg },
    { id: 4, icon: moved2IconSvg },
  ];

  const noteTypeFilterButtons = [
    { id: 1, icon: dailyIconSvg },
    { id: 2, icon: weeklyIconSvg },
    { id: 3, icon: monthlyIconSvg },
  ];

  // State
  let activeTaskStatuses = [0, 1, 2];
  let activeNoteTypes = [1, 2, 3];

  const shouldDisplayFile = (f: FileTasks): boolean =>
    (f.type === NoteType.Day && activeNoteTypes.contains(1)) ||
    (f.type === NoteType.Week && activeNoteTypes.contains(2)) ||
    (f.type === NoteType.Month && activeNoteTypes.contains(3));

  const shouldDisplayTask = (t: TaskLine): boolean =>
    !(
      (t.repeats && !activeTaskStatuses.contains(0)) ||
      (!t.repeats && !activeTaskStatuses.contains(1)) ||
      (t.incomplete && !activeTaskStatuses.contains(2)) ||
      (t.complete && !activeTaskStatuses.contains(3)) ||
      (t.moved && !activeTaskStatuses.contains(4))
    );
</script>

<div>
  <ButtonGroup
    buttons={taskStatusFilterButtons}
    activeButtonIDs={activeTaskStatuses}
    extraButtonClass="slated-task-view-filter-button"
    onUpdate={(ids) => {
      activeTaskStatuses = ids;
      taskCache.notify();
    }}
  />
  <ButtonGroup
    buttons={noteTypeFilterButtons}
    activeButtonIDs={activeNoteTypes}
    extraButtonClass="slated-task-view-filter-button"
    onUpdate={(ids) => {
      activeNoteTypes = ids;
      taskCache.notify();
    }}
  />
</div>

<div>
  {#if $taskCache.loading}
    <!-- TODO: Use a Svelte transition when data is done loading -->
    <p>Loading...</p>
  {:else}
    <!-- TODO: Define keys in the each clauses-->
    {#each $taskCache.files.filter(shouldDisplayFile) as file (file.file.basename)}
      <!-- TODO: Allow dragging tasks between sections to move between notes -->

      <div>
        <div>
          {file.file.basename}
        </div>
        {#each file.tasks.filter(shouldDisplayTask) as task (file.file.basename + task.lineNum)}
          <TaskBlock {task} notify={taskCache.notify} />
        {/each}
      </div>
    {:else}
      <div>No files with tasks found</div>
    {/each}
  {/if}
</div>

<script lang="ts">
  import { fileTasks, noteType, TaskCache } from 'src/task-cache';
  import ButtonGroup from './ButtonGroup.svelte';
  import TaskLine from './TaskLine.svelte';

  // Creation Parameters
  export let taskCache: TaskCache;

  // Constants
  const taskStatusFilterButtons = [
    { id: 0, text: 'Repeating' },
    { id: 1, text: 'Non-Repeating' },
    { id: 2, text: 'Incomplete' },
    { id: 3, text: 'Moved' },
    { id: 4, text: 'Complete' },
  ];

  const noteTypeFilterButtons = [
    { id: 1, text: 'Daily' },
    { id: 2, text: 'Weekly' },
    { id: 3, text: 'Monthly' },
  ];

  // State
  let activeTaskStatuses = [0, 1, 2];
  let activeNoteTypes = [1, 2, 3];

  const shouldDisplayFile = (f: fileTasks): boolean =>
    (f.type === noteType.Day && activeNoteTypes.contains(1)) ||
    (f.type === noteType.Week && activeNoteTypes.contains(2)) ||
    (f.type === noteType.Month && activeNoteTypes.contains(3));

  const shouldDisplayTask = (t: TaskLine): boolean =>
    !(
      (t.repeats && !activeTaskStatuses.contains(0)) ||
      (!t.repeats && !activeTaskStatuses.contains(1)) ||
      (t.incomplete && !activeTaskStatuses.contains(2)) ||
      (t.moved && !activeTaskStatuses.contains(3)) ||
      (t.complete && !activeTaskStatuses.contains(4))
    );
</script>

<div>
  <ButtonGroup
    buttons={taskStatusFilterButtons}
    activeButtonIDs={activeTaskStatuses}
    onUpdate={(ids) => {
      activeTaskStatuses = ids;
      taskCache.notify();
    }}
  />
  <ButtonGroup
    buttons={noteTypeFilterButtons}
    activeButtonIDs={activeNoteTypes}
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
          <TaskLine {task} />
        {/each}
      </div>
    {:else}
      <div>No files with tasks found</div>
    {/each}
  {/if}
</div>

<script lang="ts">
  import type { TaskView } from 'src/task-view';
  import ButtonGroup from './ButtonGroup.svelte';
  import TaskLine from './TaskLine.svelte';

  // Creation Parameters
  export let view: TaskView;

  // Constants
  const filterButtons = [
    { id: 0, text: 'Repeating' },
    { id: 1, text: 'Non-Repeating' },
    { id: 2, text: 'Incomplete' },
    { id: 3, text: 'Moved' },
    { id: 4, text: 'Complete' },
  ];

  // State
  let activeButtonIDs = [0, 1, 2, 3, 4];
</script>

<div>
  <ButtonGroup buttons={filterButtons} {activeButtonIDs} />
</div>

<div>
  {#if $view.loading}
    <!-- TODO: Use a Svelte transition when data is done loading -->
    <p>Loading...</p>
  {:else}
    <!-- TODO: Define keys in the each clauses-->
    {#each $view.getTaskFiles() as filename}
      <div>{filename}</div>
      <!-- TODO: Only display daily and weekly notes, ordered chronologically -->
      <!-- TODO: Allow dragging tasks between sections to move between notes -->
      {#each $view.getTasksForFile(filename) as task}
        <TaskLine {task} />
      {/each}
    {:else}
      <div>No files with tasks found</div>
    {/each}
  {/if}
</div>

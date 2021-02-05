<script lang="ts">
  import type { TaskView } from 'src/task-view';
  import TaskLine from './TaskLine.svelte';

  // Creation Parameters
  export let view: TaskView;
</script>

<div>
  {#if $view.loading}
    <!-- TODO: Use a Svelte transition when data is done loading -->
    <p>Loading...</p>
  {:else}
    {#each $view.tasks as task}
      <TaskLine {task} />
    {/each}
  {/if}
</div>

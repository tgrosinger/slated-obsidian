<script lang="ts">
  import { movedIconSvg, skippedIconSvg } from 'src/graphics';
  import { slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  import type { TaskLine } from 'src/task-line';

  // Creation Parameters
  export let task: TaskLine;

  // State
  let selected = false;
</script>

<div class={selected ? 'task-line task-line-expanded' : 'task-line'}>
  <div
    class="task-line-header"
    on:click={() => {
      selected = !selected;
    }}
  >
    {#if task.incomplete}
      <input type="checkbox" checked={false} />
    {:else if task.complete}
      <input type="checkbox" checked={true} />
    {:else if task.moved}
      {@html movedIconSvg}
    {:else if task.skipped}
      {@html skippedIconSvg}
    {:else}
      {console.log('Unexpected task state for task: ' + task.line)}
    {/if}

    <span>
      {task.baseTaskContent()}
    </span>
  </div>

  {#if selected}
    <div
      class="task-line-content"
      transition:slide|local={{ delay: 0, duration: 350, easing: quintOut }}
    >
      {#if task.movedFrom}
        <label>
          Moved From:
          <input type="text" disabled={true} value={task.movedFrom} />
        </label>
      {/if}

      {#if task.movedTo}
        <label>
          Moved To:
          <input type="text" disabled={true} value={task.movedTo} />
        </label>
      {/if}

      <h2>Repetition</h2>
      {#if task.repeats}
        {#if !task.isOriginalInstance}
          <label>
            Repeats From:
            <input type="text" disabled={true} value={task.repeatsFrom} />
          </label>
        {/if}
      {:else}
        <button>Configure Repetition</button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .task-line {
    padding: 4px;
    color: var(--text-muted);
  }

  .task-line-header {
    font-size: 14px;
    font-weight: 600;
  }

  .task-line-header:hover {
    background-color: var(--background-secondary-alt);
  }

  .task-line-expanded {
    border-bottom: 1px solid var(--background-modifier-border);
  }

  .task-line-content {
    margin-left: 10px;
    padding: 5px;
  }

  .task-line-content h2 {
    margin-top: 5px;
    line-height: 1em;
  }
</style>

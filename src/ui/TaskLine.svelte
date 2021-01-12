<script lang="ts">
  import { Element, movedIconSvg, skippedIconSvg } from 'src/graphics';

  import type { TaskLine } from 'src/task-line';

  // Creation Parameters
  export let task: TaskLine;
</script>

<div class="slated-task-line">
  {#if task.incomplete}
    <input type="checkbox" checked={false} />
  {:else if task.complete}
    <input type="checkbox" checked={true} />
  {:else if task.moved}
    {Element(movedIconSvg)}
  {:else if task.skipped}
    {Element(skippedIconSvg)}
  {:else}
    {console.log('Unexpected task state for task: ' + task.line)}
  {/if}

  <span>
    {task.line}
  </span>
</div>

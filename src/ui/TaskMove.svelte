<script lang="ts">
  import type { TaskLine } from 'src/task-line';

  // Creation Parameters
  export let task: TaskLine;
  export let close: () => void;

  // Internal Properties
  let currentView: 'repeat';

  const showMove = () => {
    this.currentView = 'move';
  };
</script>

<div>This is task Move</div>
<dif>{task.line}</dif>

<button on:click={showMove}> Move </button>

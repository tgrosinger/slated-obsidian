<script lang="ts">
  import type { TaskLine } from 'src/task-line';
  import type { Moment } from 'moment';

  // Creation Parameters
  export let task: TaskLine;
  export let close: () => void;

  // Internal Properties
  let currentView: 'repeat';

  const showMove = () => {
    this.currentView = 'move';
  };

  const onClickDay = (date: Moment, isMetaPressed: boolean) => {
    console.log('click!');
  };
</script>

<div>This is task Move</div>
<div>{task.line}</div>

<button on:click={showMove}> Move </button>
<button on:click={close}> Close </button>

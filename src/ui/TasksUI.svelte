<script lang="ts">
  import type { TaskView } from 'src/task-view';

  // Creation Parameters
  export let view: TaskView;

  // TODO: view.buildTaskCache() w/o blocking the loading msg rendering
</script>

<div>
  <!-- TODO: Use a Svelte transition when data is done loading -->
  <p>Loading...</p>
</div>

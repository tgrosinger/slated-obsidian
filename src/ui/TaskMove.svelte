<script lang="ts">
  import type { TaskLine } from 'src/task-line';
  import type { Moment } from 'moment';
  import { Calendar } from 'obsidian-calendar-ui';

  // Creation Parameters
  export let task: TaskLine;
  export let close: () => void;

  // Internal Properties
  const today = window.moment();
  let createLinks = true;

  const onClickDay = async (
    date: Moment,
    isMetaPressed: boolean,
  ): Promise<void> => {
    await task.move(date.startOf('day'), createLinks);
    close();
  };
</script>

<p>Select a day for the task to be moved to:</p>

<Calendar {onClickDay} {today} />

<label>
  <input type="checkbox" bind:checked={createLinks} />
  Create bi-directional links
</label>

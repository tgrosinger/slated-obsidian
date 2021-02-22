<script lang="ts">
  import type { Moment } from 'moment';
  import { Calendar } from 'obsidian-calendar-ui';

  import type { TaskLine } from 'src/task-line';

  // Creation Parameters
  export let task: TaskLine;
  export let moveChildren: boolean;
  export let close: () => void;

  // Internal Properties
  const today = window.moment();
  let createLinks = true;

  $: if (!createLinks) {
    moveChildren = true;
  }

  const onClickDay = async (
    date: Moment,
    isMetaPressed: boolean,
  ): Promise<void> => {
    await task.move(date.startOf('day'), createLinks, moveChildren);
    close();
  };
</script>

<p>Select a day for the task to be moved to:</p>

<Calendar
  {onClickDay}
  {today}
  showWeekNums={false}
  localeData={today.localeData()}
/>

<div class="slated-move-option">
  <label>
    <input type="checkbox" bind:checked={createLinks} />
    Create bi-directional links
  </label>
</div>
<div class="slated-move-option">
  <label>
    <input
      type="checkbox"
      disabled={!createLinks}
      bind:checked={moveChildren}
    />
    Move sub-items and tasks
  </label>
</div>

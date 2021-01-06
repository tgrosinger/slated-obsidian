<script lang="ts">
  import type { TaskLine } from 'src/task-line';
  import type { Moment } from 'moment';
  import { Calendar } from 'obsidian-calendar-ui';

  const moment = window.moment;

  // Creation Parameters
  export let task: TaskLine;
  export let close: () => void;

  // Internal Properties
  const today = moment();

  const onClickDay = async (
    date: Moment,
    isMetaPressed: boolean,
  ): Promise<void> => {
    await task.move(date.startOf('day'));
    close();
  };
</script>

<p>Select a day for the task to be moved to:</p>

<Calendar {onClickDay} {today} />

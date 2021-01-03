<script lang="ts">
  import type { TaskLine } from 'src/task-line';
  import type { Moment } from 'moment';
  import { Calendar, MetadataCache } from 'obsidian-calendar-ui';
  import moment from 'moment';

  // Creation Parameters
  export let task: TaskLine;
  export let close: () => void;
  export let metadata: MetadataCache;

  // Internal Properties
  const today = moment();

  const showMove = () => {
    this.currentView = 'move';
  };

  const onClickDay = async (
    date: Moment,
    isMetaPressed: boolean,
  ): Promise<void> => {
    await task.move(date.startOf('day'));
    close();
  };
</script>

<p>Select a day for the task to be moved to:</p>

<Calendar {metadata} {onClickDay} {today} />

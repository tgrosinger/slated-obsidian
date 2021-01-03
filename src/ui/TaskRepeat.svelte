<script lang="ts">
  import ButtonGroup from './ButtonGroup.svelte';
  import WeekDaysOfMonthSelector from './WeekDaysOfMonthSelector.svelte';
  import { Frequency } from 'src/repeat';
  import type { TaskLine } from 'src/task-line';

  // Repetition types:
  // - Daily with interval
  // - Weekly with weekday selector and interval
  // - Monthly with day of month selctor (including "last day") and interval
  // - Monthly with [1-5, last], weekday selector, and interval
  // - Yearly with month selector, [1-5, last], weekday selector, and interval
  // - All of the above with:
  //   - "Until..."
  //   - "For ... occurences"

  // Tips:
  // - day of month can be selected with negatives (-1 = last day)
  // - multiple days of month can be selected (15,-1)
  // - nth weekday is represented as '1FR' or '-1SU'
  // - Lots more examples: https://www.kanzaki.com/docs/ical/rrule.html

  export let task: TaskLine;
  export let close: () => void;

  // TODO: Support localizations
  const weekdays = [
    { id: 6, text: 'S' },
    { id: 0, text: 'M' },
    { id: 1, text: 'T' },
    { id: 2, text: 'W' },
    { id: 3, text: 'T' },
    { id: 4, text: 'F' },
    { id: 5, text: 'S' },
  ];

  // TODO: Support localizations
  const months = [
    { id: 1, text: 'Jan' },
    { id: 2, text: 'Feb' },
    { id: 3, text: 'Mar' },
    { id: 4, text: 'Apr' },
    { id: 5, text: 'May' },
    { id: 6, text: 'Jun' },
    { id: 7, text: 'Jul' },
    { id: 8, text: 'Aug' },
    { id: 9, text: 'Sep' },
    { id: 10, text: 'Oct' },
    { id: 11, text: 'Nov' },
    { id: 12, text: 'Dec' },
  ];

  const save = () => {
    console.debug('Updating task...');
    $task.save();
    close();
  };

  const startingRepeatType =
    task.repeater.getWeekDaysOfMonth().length > 0 ? 'every' : 'onThe';
  let monthlyRepeatType = startingRepeatType;

  console.debug(task);
</script>

<div class="slated-modal">
  <h1>Task Repetition</h1>
  <div>
    <span>Every</span>
    <input
      id="slated-interval-selector"
      bind:value={$task.repeater.interval}
      type="number"
      min="1" />

    <!-- svelte-ignore a11y-no-onchange -->
    <select
      id="slated-frequency-selector"
      class="dropdown"
      bind:value={$task.repeater.frequency}>
      <option value={Frequency.Daily}>
        {$task.repeater.interval > 1 ? 'Days' : 'Day'}
      </option>
      <option value={Frequency.Weekly}>
        {$task.repeater.interval > 1 ? 'Weeks' : 'Week'}
      </option>
      <option value={Frequency.Monthly}>
        {$task.repeater.interval > 1 ? 'Months' : 'Month'}
      </option>
      <option value={Frequency.Yearly}>
        {$task.repeater.interval > 1 ? 'Years' : 'Year'}
      </option>
    </select>

    {#if $task.repeater.frequency === Frequency.Weekly}
      <div class="slated-days-btn-group">
        <ButtonGroup
          buttons={weekdays}
          activeButtonIDs={task.repeater.daysOfWeek}
          onUpdate={task.repeater.setDaysOfWeek} />
      </div>
    {/if}

    {#if $task.repeater.frequency === Frequency.Yearly}
      <div class="slated-months-btn-group">
        <ButtonGroup
          buttons={months}
          activeButtonIDs={task.repeater.monthsOfYear}
          onUpdate={task.repeater.setMonthsOfYear} />
      </div>
    {/if}

    {#if $task.repeater.frequency === Frequency.Monthly || $task.repeater.frequency === Frequency.Yearly}
      <div>
        <select class="dropdown" bind:value={monthlyRepeatType}>
          <option value={'onThe'}>on the</option>
          <option value={'every'}>every</option>
        </select>

        {#if monthlyRepeatType == 'onThe'}
          <input
            id="slated-onthe-selector"
            bind:value={$task.repeater.dayOfMonth}
            disabled={$task.repeater.dayOfMonth === -1}
            placeholder="1"
            type="number" />
          <label>
            <input
              bind:checked={$task.repeater.lastDayOfMonth}
              type="checkbox" />
            Last Day
          </label>
        {:else}
          <span>
            <WeekDaysOfMonthSelector
              initialSelected={task.repeater.getWeekDaysOfMonth()}
              onUpdate={task.repeater.setWeekDaysOfMonth} />
          </span>
        {/if}
      </div>
    {/if}
  </div>

  <h2>Preview</h2>

  <input
    id="slated-repetition-preview"
    disabled
    type="text"
    value={$task.repeater.toText()} />

  <button id="slated-save-repetition-config" on:click={save}> Save </button>
</div>

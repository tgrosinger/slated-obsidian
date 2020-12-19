<script lang="ts">
  import { Frequency } from 'src/repeat';
  import type { TaskLine } from 'src/task-line';

  // Repetition types:
  // - [ ] Daily with interval
  // - [ ] Weekly with weekday selector and interval
  // - [ ] Monthly with day of month selctor (including "last day") and interval
  // - [ ] Monthly with [1-5, last], weekday selector, and interval
  // - [ ] Yearly with month selector, [1-5, last], weekday selector, and interval
  // - [ ] All of the above with "Until..."
  // - [ ] All of the above with "For ... occurences"

  // Tips:
  // - day of month can be selected with negatives (-1 = last day)
  // - multiple days of month can be selected (15,-1)
  // - nth weekday is represented as '1FR' or '-1SU'
  // - Lots more examples: https://www.kanzaki.com/docs/ical/rrule.html

  // TODO: Support localizations
  const weekdays = [
    { id: 'MO', checked: false, text: 'Monday' },
    { id: 'TU', checked: false, text: 'Tuesday' },
    { id: 'WE', checked: false, text: 'Wednesday' },
    { id: 'TH', checked: false, text: 'Thursday' },
    { id: 'FR', checked: false, text: 'Friday' },
    { id: 'SA', checked: false, text: 'Saturday' },
    { id: 'SU', checked: false, text: 'Sunday' },
  ];

  // TODO: Support localizations
  const months = [
    { id: '1', checked: false, text: 'January' },
    { id: '2', checked: false, text: 'February' },
    { id: '3', checked: false, text: 'March' },
    { id: '4', checked: false, text: 'April' },
    { id: '5', checked: false, text: 'May' },
    { id: '6', checked: false, text: 'June' },
    { id: '7', checked: false, text: 'July' },
    { id: '8', checked: false, text: 'August' },
    { id: '9', checked: false, text: 'September' },
    { id: '10', checked: false, text: 'October' },
    { id: '11', checked: false, text: 'November' },
    { id: '12', checked: false, text: 'December' },
  ];

  // TODO: Support localizations
  const weeks = [
    { id: '1', checked: false, text: 'First' },
    { id: '2', checked: false, text: 'Second' },
    { id: '3', checked: false, text: 'Third' },
    { id: '4', checked: false, text: 'Fourth' },
    { id: '5', checked: false, text: 'Fifth' },
    { id: '-1', checked: false, text: 'Last' },
  ];

  // Creation Parameters
  export let task: TaskLine;
  export let close: () => void;

  // Functions
  const save = () => {
    console.debug('Updating task...');
    task.save();
    close();
  };

  // Setup
</script>

<div>
  <h1>Task Repetition</h1>
  <p>{task.repeater.toText()}</p>
  <div>
    <span>Every</span>
    <input
      id="slated-interval-selector"
      bind:value={task.repeater.interval}
      type="number"
      min="1" />
    <select id="slated-frequency-selector" bind:value={task.repeater.frequency}>
      <option value={Frequency.Daily}>
        {task.repeater.interval > 1 ? 'Days' : 'Day'}
      </option>
      <option value={Frequency.Weekly}>
        {task.repeater.interval > 1 ? 'Weeks' : 'Week'}
      </option>
      <option value={Frequency.Monthly}>
        {task.repeater.interval > 1 ? 'Months' : 'Month'}
      </option>
      <option value={Frequency.Yearly}>
        {task.repeater.interval > 1 ? 'Years' : 'Year'}
      </option>
    </select>

    {#if task.repeater.frequency === Frequency.Weekly}
      <div id="slated-weekday-selector">
        {#each weekdays as weekday (weekday.id)}
          <input type="checkbox" bind:checked={weekday.checked} />{weekday.text}
        {/each}
      </div>
    {/if}
  </div>
  <button on:click={save}> Save </button>
</div>

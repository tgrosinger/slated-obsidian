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

  // Internal Properties
  let repeatType = Frequency.None;
  let interval = 1;

  // Functions
  const save = () => {
    console.log('Updating task...');
    task.save();
    close();
  };

  // Setup
</script>

<div>This is task Repeat</div>
<dif>{task.line}</dif>

<select bind:value={task.repeater.frequency}>
  <option value={Frequency.None}>None</option>
  <option value={Frequency.Daily}>Daily</option>
  <option value={Frequency.Weekly}>Weekly</option>
  <option value={Frequency.Monthly}>Monthly</option>
  <option value={Frequency.Yearly}>Yearly</option>
</select>

<input value={interval} type="number" />

{#if repeatType === Frequency.Weekly}
  {#each weekdays as weekday (weekday.id)}
    <input type="checkbox" bind:checked={weekday.checked} />{weekday.text}
  {/each}
{/if}

<button on:click={save}> Save </button>

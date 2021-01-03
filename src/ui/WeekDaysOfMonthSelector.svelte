<script lang="ts">
  import { writable } from 'svelte/store';

  export let onUpdate: (selected: { week: string; weekDay: string }[]) => void;
  export let initialSelected: { week: string; weekDay: string }[];

  // By using a Store, we can bind to it easier in the {#each} block below.
  const selectedWeeks = writable(
    initialSelected.map(({ week, weekDay }, i) => {
      return { id: i, week: week, weekDay: weekDay };
    }),
  );

  // Send the updates back upstream.
  selectedWeeks.subscribe((updatedVal) => {
    onUpdate(
      updatedVal.map(({ week, weekDay }) => {
        return {
          week: week,
          weekDay: weekDay,
        };
      }),
    );
  });

  // Create a function which when called will remove the provided ID from the
  // list of selected weeks.
  const newRemoveWeek = (removeID: number): (() => void) => {
    return (): void => {
      selectedWeeks.update((curr) => curr.filter(({ id }) => id !== removeID));
    };
  };

  // Add a "First Monday" item to the list.
  const addWeek = (): void => {
    selectedWeeks.update((curr) => {
      const maxID = curr.reduce((prev, { id }) => Math.max(prev, id), 0);
      curr.push({
        id: maxID + 1,
        week: '1',
        weekDay: '0',
      });
      return curr;
    });
  };

  // If the list every has 0 items (only if initialized empty), then add one.
  if ($selectedWeeks.length === 0) {
    addWeek();
  }
</script>

<div id="slated-selected-weeks">
  <ul>
    {#each $selectedWeeks as week}
      <li>
        <select class="dropdown" bind:value={week.week}>
          <option value="1">First</option>
          <option value="2">Second</option>
          <option value="3">Third</option>
          <option value="4">Fourth</option>
          <option value="5">Fifth</option>
          <option value="-1">Last</option>
        </select>
        <select class="dropdown" bind:value={week.weekDay}>
          <option value="6">Sunday</option>
          <option value="0">Monday</option>
          <option value="1">Tuesday</option>
          <option value="2">Wednesday</option>
          <option value="3">Thursday</option>
          <option value="4">Friday</option>
          <option value="5">Saturday</option>
        </select>
        {#if $selectedWeeks.length > 1}
          <button on:click={newRemoveWeek(week.id)}>-</button>
        {/if}
      </li>
    {/each}
  </ul>
  <button on:click={addWeek}>+</button>
</div>

<script lang="ts">
  type Button = {
    id: string;
    text: string;
    active: boolean;
  };

  export let buttons: Button[];
  export let onUpdate: (ids: string[]) => void;

  const newToggleButton = (button: Button): ((e: MouseEvent) => void) => {
    return (e: MouseEvent) => {
      button.active = !button.active;
      const target = <HTMLButtonElement>e.target;
      if (target.hasClass('mod-cta')) {
        target.removeClass('mod-cta');
      } else {
        target.addClass('mod-cta');
      }

      onUpdate(buttons.filter((b) => b.active).map((b) => b.id));
    };
  };
</script>

{#each buttons as button}
  <button
    class={button.active ? 'mod-cta' : ''}
    on:click={newToggleButton(button)}>{button.text}</button>
{/each}

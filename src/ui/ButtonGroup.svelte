<script lang="ts">
  type IButton = {
    id: number;
    text?: string;
    icon?: string;
  };

  type Button = {
    id: number;
    text?: string;
    icon?: string;
    active: boolean;
  };

  export let buttons: IButton[];
  export let activeButtonIDs: number[];
  export let onUpdate: (ids: number[]) => void;
  export let extraButtonClass: string = '';

  $: activeClass = 'mod-cta ' + extraButtonClass;
  $: inactiveClass = extraButtonClass;

  $: _buttons = buttons.map(
    (btn): Button => {
      return {
        id: btn.id,
        text: btn.text,
        icon: btn.icon,
        active: activeButtonIDs.includes(btn.id),
      };
    },
  );

  const newToggleButton = (button: Button): ((e: MouseEvent) => void) => {
    return (e: MouseEvent) => {
      button.active = !button.active;
      const target = <HTMLButtonElement>e.target;
      if (target.hasClass('mod-cta')) {
        target.removeClass('mod-cta');
      } else {
        target.addClass('mod-cta');
      }

      onUpdate(_buttons.filter((b) => b.active).map((b) => b.id));
    };
  };
</script>

{#each _buttons as button}
  <button
    class={button.active ? activeClass : inactiveClass}
    on:click={newToggleButton(button)}
  >
    {#if button.icon}
      {@html button.icon}
    {/if}
    {#if button.text}
      {button.text}
    {/if}
  </button>
{/each}

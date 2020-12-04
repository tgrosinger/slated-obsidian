# Agenda for Obsidian

The goal of this plugin will be to bring advanced task management and agenda functionality to the Obsidian knowledgebase.

This plugin is still in the ideation and design phase. This repo serves as an early collaboration hub. I encourage you to create pull-requests with suggestions and recommendations. If it's easier, you can also open issues which I will use to synthesize ideas into this document.

## Requirements

- Maintain compatibility with Markdown
  - This is essential for ease of use (especially on mobile) and to avoid lock-in
- Use well understood patterns wherever possible
  - Checkboxes to indicate open/done status for example
  - Existing tag and link syntax

## Inspiration

- [[org-mode]]
  - [TODO items manual](https://orgmode.org/manual/TODO-Items.html)
  - [Date and times manual](https://orgmode.org/manual/Dates-and-Times.html)
  - [Agenda views manual](https://orgmode.org/manual/Agenda-Views.html)
  - [Custom agenda views tutorial](https://orgmode.org/worg/org-tutorials/org-custom-agenda-commands.html)
- [TaskPaper](https://www.taskpaper.com/)
- ToDo.txt
  - [ice-recur plugin](https://github.com/rlpowell/todo-text-stuff/blob/master/ice_recur) has an interesting recurrence format.

## User Experience

- Use markdown task lists for each todo item
  - Sub-lists can be used to add subtasks, if the list item has a checkbox
  - Sub-lists can be used to add metadata, such as due-dates, or repetition config
- When a task is checked...
  - If there is repetition config...
    - A follow-up task will be created according to the repetition config
    - The repetition config will be removed from the checked task.
  - If at task is checked outside of Obsidian, the repetition config will still be present, so the next time Obsidian is run, the plugin can take the necessary actions.
- The markdown should always be the source of truth, but alternate view can improve user experience:
  - A sidebar, modal, or custom pane type (alternative to `editor` and `preview`)
  - Sidebar widgets work well for small persistent information
  - Modals work well for short interactions, such as selecting dates
  - A custom pane type has good flexibility in placement for the user, and allows precise control over dimensions. This is the least "supported" method though and may require a little research.
- When interacting with todo items in the editor (not the custom view) suggestion popups for links and labels will work out of the box. A hotkey can open a modal for adding dates and repetition to the task.
- Dates
  - Could be stored as [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601)
    - Org-mode uses a friendlier format (2006-11-01 Wed 19:15) but is inspired by ISO 8601
  - Integrate with the [nl-dates plugin](https://github.com/argenos/nldates-obsidian) to make generation of the timestamps more powerful and easy
  - Obsidian has moment.js available at runtime. Check Discord for instructions on using it.
- Priorities
  - todo.txt uses `(A)` at the beginning of a task
  - org-mode uses `[A]` just after the `TODO`

## Integration

Let's try to prevent proliferation of similar plugins that each has a subset of what a user is looking for by making it clear this plugin is for and by the community! Additionally, look for areas where tight integration with other plugins will make both richer.

- How can this integrate with the Calendar plugin? (@liamcain)
  - See [this Github thread](liamcain/obsidian-calendar-plugin#59)
  - Also [this Github thread](ryanjamurphy/review-obsidian#8)
- How can this integrate with the Daily Notes plugin? (built-in)
- Seems like there might be some similarity with the review plugin? (@ryanjamurphy)
- Other plugin authors that should be contacted?

## Crazy Ideas

- Search for dates throughout the vault
  - Have a simple way to include them in the Agenda
  - This would be useful for things like birthdays in a contacts note

## Open Questions

- Can there be saved queries that can be opened in the custom view?
- How does day planner do desktop notifications (@lynchjames)?
- We cannot use the org-mode format for active dates
  - \<tags> will be hidden in rendered mode
  - But it is still useful to have a distinction between dates that should be included in the agenda, and dates which are excluded.
  - Perhaps the agenda has two modes - TODO items (list item with checkbox), and all dates

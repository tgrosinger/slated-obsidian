# Design of Slated

This space contains some of the original design brainstorming for this
plugin. Not all of it is what was actually implemented, but it might be
useful to see how the plugin got to where it is today.

## Design Requirements

- Maintain compatibility with Markdown
  - This is essential for ease of use (especially on mobile) and to avoid lock-in
  - Obsidian variations from official Markdown are allowed, such as block links
- Use well understood patterns wherever possible
  - Checkboxes to indicate open/done status for example
  - Existing tag and link syntax
  - Adopt priority syntax from todo.txt

## Inspiration

- org-mode
  - [TODO items manual](https://orgmode.org/manual/TODO-Items.html)
  - [Date and times manual](https://orgmode.org/manual/Dates-and-Times.html)
- [NotePlan](https://noteplan.co/)

## User Experience

- Use markdown task lists for each todo item
  - Sub-lists can be used to add subtasks, if the list item has a checkbox
- The markdown should always be the source of truth, but alternate view can improve user experience:
  - A modal can be used for appending repetition config to a task
- Tasks with due-dates should be either stored in, or transcluded into the daily note for that day
  - See the [Review plugin](https://github.com/ryanjamurphy/review-obsidian)
  - With this simplification, dates no longer need to be stored, only repeat config
- Priorities
  - todo.txt uses `(A)` at the beginning of a task
  - org-mode uses `[A]` just after the `TODO`
- Block IDs
  - When a task is going to be moved or has a repetition pattern added, generate a block ID
  - The block ID will be used to tie all tasks in a repetition back to the original
  - The block ID will be used to tie a task that has been moved back to it's originally scheduled location
  - A popup will make it easy to navigate to previous/upcoming occurences of this task
- Recurrence
  - Denoted with either a semicolon, or 📅
  - If the task recurrence has a definite end, all tasks should be created and put into daily notes right away
  - For tasks which have no definite end, a configurable number into the future will be created
    - This is checked dynamically whenever a recurring task is detected
  - Optionally, generate and include links to next and previous occurrence of a task
    - This may not be necessary if a popup can aid in navigating to other occurences using the block ID
  - Using [rrule](https://www.npmjs.com/package/rrule) library, which supports NLP or very advanced config
  - Recurrence is stored in plain text after a task, but a popup will help configure the pattern.
- Task moving
  - Inspired by NotePlan, tasks can be moved to another date.
  - Moved tasks will contain the block ID from the original location.
  - Original location will remain in place, be crossed out, checked, and have block ID

## Integration

Let's try to prevent proliferation of similar plugins that each has a subset of what a user is looking for by making it clear this plugin is for and by the community! Additionally, look for areas where tight integration with other plugins will make both richer.

- How can this integrate with the Calendar plugin? (@liamcain)
  - This plugin already adds a fantastic calendar to Obsidian which links to daily notes
  - The calendar plugin might be usable embedded as a date picker ([tracking thread](https://github.com/liamcain/obsidian-calendar-plugin/issues/59))
  - See [this Github thread](https://github.com/ryanjamurphy/review-obsidian/issues/8)
- How can this integrate with the Daily Notes plugin? (built-in)
  - [This library](https://www.npmjs.com/package/obsidian-daily-notes-interface) replicates the daily notes functionality, but allows creating notes in the future.
  - A task which has a due date should be stored or transcluded into the corresponding daily note
  - The [review plugin](https://github.com/ryanjamurphy/review-obsidian) is perfect for this
- Agenda view may be solved by an upcoming plugin from @ryanjamurphy
  > An Obsidian plugin to track overdue items (e.g., tasks in daily notes before today not yet completed/moved/cancelled)
- Tasks with specified times can show OS notifications
  - [Example from Day Planner](https://github.com/lynchjames/obsidian-day-planner/blob/main/src/main.ts#L120)

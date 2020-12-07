# Agenda for Obsidian

**Note:** The name will likely need to change as the functionality of this plugin solidifies.

The goal of this plugin will be to bring advanced task management and agenda functionality to the Obsidian knowledgebase.

This plugin is still in the ideation and design phase. This repo serves as an early collaboration hub. I encourage you to create pull-requests with suggestions and recommendations. If it's easier, you can also open issues which I will use to synthesize ideas into this document.

## Requirements

- Maintain compatibility with Markdown
  - This is essential for ease of use (especially on mobile) and to avoid lock-in
- Use well understood patterns wherever possible
  - Checkboxes to indicate open/done status for example
  - Existing tag and link syntax

## Inspiration

- org-mode
  - [TODO items manual](https://orgmode.org/manual/TODO-Items.html)
  - [Date and times manual](https://orgmode.org/manual/Dates-and-Times.html)
  - [Agenda views manual](https://orgmode.org/manual/Agenda-Views.html)
  - [Custom agenda views tutorial](https://orgmode.org/worg/org-tutorials/org-custom-agenda-commands.html)
- [TaskPaper](https://www.taskpaper.com/)
- [NotePlan]()

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
  
## Example tasks

- [ ] Go to the dentist ;8:30am ^jzzz3f4
- [ ] Make ferry reservation 📅 7:00am ^0sd238l
- [ ] (A) Vacuum the stairs
- [ ] Make bread ;Every Sunday ^ze6w5od
- [ ] Bring dog to the vet <2020-11-22 ^3k2codg
- [x] ~~Wash the car~~ >2021-05-01 ^uos9sdy
- [ ] Do the dishes 📅 Every weekday at 5pm ^v423ddx

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

## Crazy Ideas

- Search for dates throughout the vault
  - Have a simple way to include them in the Agenda
  - This would be useful for things like birthdays in a contacts note

## Open Questions

- Can there be saved queries that can be opened in the custom view?
- How does [day planner](https://github.com/lynchjames/obsidian-day-planner) do desktop notifications (@lynchjames)?

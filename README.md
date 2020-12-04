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
- Recurrence
  - When a task is viewed with recurrence configured, the plugin will ensure the next task has been created
    - In other words, lazily evaluate the recurrence configs
  - Optionally, generate and include links to next and previous occurrence of a task
  - Using [rrule](https://www.npmjs.com/package/rrule) library, which supports NLP or very advanced config
    - While this library is capable of very powerful repetition configs, it does not look like the NLP is as advanced as I would like
- Task moving
  - Inspired by NotePlan, tasks can be moved to another date.
  - Moved tasks will link to their original location.
  - Original location will remain in place, be crossed out, checked, and link to new location
  
## Example tasks

- [ ] Go to the dentist ;8:30am
- [ ] (A) Vacuum the stairs
- [ ] Make bread ;Every Sunday
- [ ] Bring dog to the vet <2020-11-22
- [ ] ~~Wash the car~~ >2021-05-01
- [ ] Do the dishes ;Every weekday at 5pm

## Integration

Let's try to prevent proliferation of similar plugins that each has a subset of what a user is looking for by making it clear this plugin is for and by the community! Additionally, look for areas where tight integration with other plugins will make both richer.

- How can this integrate with the Calendar plugin? (@liamcain)
  - This plugin already adds a fantastic calendar to Obsidian which links to daily notes
  - The calendar plugin might be usable embedded as a date picker ([tracking thread](https://github.com/liamcain/obsidian-calendar-plugin/issues/59))
  - See [this Github thread](https://github.com/ryanjamurphy/review-obsidian/issues/8)
- How can this integrate with the Daily Notes plugin? (built-in)
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

# Slated for Obsidian

Advanced task management in the Obsidian knowledgebase.

- Setup repeating tasks
- Defer tasks to another daily note
- Move all incomplete tasks to today's daily note
- All in 100% Obsidian Markdown!

Coming Soon: View, filter, and modify tasks across daily, weekly, and monthly notes from a single interface.

## Screenshots

![move-incomplete-tasks](https://raw.githubusercontent.com/tgrosinger/slated-obsidian/main/resources/screenshots/move-incomplete-tasks.gif)

![task-repeat-config-1](https://raw.githubusercontent.com/tgrosinger/slated-obsidian/main/resources/screenshots/task-repeat-config-1.png)

![task-repeat-config-2](https://raw.githubusercontent.com/tgrosinger/slated-obsidian/main/resources/screenshots/task-repeat-config-2.png)

## How to use

Tasks are created using normal markdown syntax, for example `- [ ] Water the
plants`. Once a task is created, configure repetition or move the task using
the commands added by this plugin. This is easiest to do by either binding
them to a hotkey, or using the command palette.

![slated-command-palette](https://raw.githubusercontent.com/tgrosinger/slated-obsidian/main/resources/screenshots/slated-command-palette.png)

Repetition configs can also be edited manually, however using the interface
helps ensure a valid repetition config has been created.

Tasks can also be moved to another day, and the original task and the moved
task will link bidirectionally.

![task-move](https://raw.githubusercontent.com/tgrosinger/slated-obsidian/main/resources/screenshots/task-move.png)

## Task Format

- [ ] This task is incomplete and repeats ; Every Monday and Tuesday ^task-1234
- [-] This repeating task occurence was skipped ; Every Sunday ^task-5678
- [>] This task was moved to >[[2021-05-01]] ^task-9101
- [x] This task was completed
- [ ] This task was moved here from [[2020-12-31|< Origin]]
- [ ] This task has sub-items that will move with it
  - [ ] Sub items can be a task
  - Or not
- [ ] Tasks can have non-list subcontent too
      Such as this line

### More Examples

- [ ] Go to the dentist ;8:30am ^jzzz3f4
- [x] Make ferry reservation 📅 7:00am ^0sd238l
- [ ] (A) Vacuum the stairs
- [ ] Make bread ;Every Sunday ^ze6w5od
- [ ] Bring dog to the vet [[2020-11-22^3k2codg|< Origin]]
- [>] Wash the car >[[2021-05-01]] ^task-9sdy
- [ ] Do the dishes 📅 Every weekday at 5pm ^task-3ddx

## Pricing

This plugin is provided to everyone for free, however if you would like to
say thanks or help support continued development, feel free to send a little
my way through one of the following methods:

[![GitHub Sponsors](https://img.shields.io/github/sponsors/tgrosinger?style=social)](https://github.com/sponsors/tgrosinger)
[![Paypal](https://img.shields.io/badge/paypal-tgrosinger-yellow?style=social&logo=paypal)](https://paypal.me/tgrosinger)
[<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="BuyMeACoffee" width="100">](https://www.buymeacoffee.com/tgrosinger)

## Credits

A huge thank you to [Liam Cain](https://github.com/liamcain) for adapting the [Obsidian Calendar Plugin](https://github.com/liamcain/obsidian-calendar-plugin) and making it broadly usable by other plugins!

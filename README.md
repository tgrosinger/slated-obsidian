# Slated for Obsidian

## ⚠ Project Archived

Afer much thought and experimentation, I have decided to change directions with how I manage tasks in Obsidian. The approach I am taking now is different enough that I felt it warranted a new plugin, rather than adapting Slated and foisting it on the existing users. The new plugin is called [tq](https://github.com/tgrosinger/tq-obsidian) and is availalbe in the community plugins list.

If you would like to carry on the torch of Slated, please reach out to me and we can discuss un-archiving this repository.

Thank you for your understanding and support!

## Overview

Advanced task management in the Obsidian knowledgebase.

- Setup repeating tasks
- Defer tasks to another daily note
- Move all incomplete tasks to today's daily note
- Works in Obsidian Mobile
- All in 100% Obsidian Markdown!

## Screenshots

![move-incomplete-tasks](https://raw.githubusercontent.com/tgrosinger/slated-obsidian/main/resources/screenshots/move-incomplete-tasks.gif)

![task-repeat-config-1](https://raw.githubusercontent.com/tgrosinger/slated-obsidian/main/resources/screenshots/task-repeat-config-1.png)

![configure-repetition](https://raw.githubusercontent.com/tgrosinger/slated-obsidian/main/resources/screenshots/configure-repetition.gif)

## How to use

Tasks are created using normal markdown syntax, for example `- [ ] Water the
plants`. Once a task is created, configure repetition or move the task using
the commands added by this plugin. This is easiest to do by either binding
them to a hotkey, or using the command palette.

![slated-command-palette](https://raw.githubusercontent.com/tgrosinger/slated-obsidian/main/resources/screenshots/slated-command-palette.png)

Repetition configs can also be edited manually, however using the interface
helps ensure a valid repetition config has been created.

Tasks can also be moved to another day.

![task-move](https://raw.githubusercontent.com/tgrosinger/slated-obsidian/main/resources/screenshots/task-move.png)

## Task Format

- [ ] This task is incomplete and repeats ; Every Monday and Tuesday
- [-] This repeating task occurence was skipped ; Every Sunday
- [x] This task was completed
- [ ] This task has sub-items that will move with it
  - [ ] Sub items can be a task
  - Or not
- [ ] Tasks can have non-list subcontent too
      Such as this line

### More Examples

- [ ] Go to the dentist ;8:30am
- [x] Make ferry reservation 📅 7:00am
- [ ] (A) Vacuum the stairs
- [ ] Make bread ;Every Sunday
- [ ] Bring dog to the vet
- [ ] Do the dishes 📅 Every weekday at 5pm

## Pricing

This plugin is provided to everyone for free, however if you would like to
say thanks or help support continued development, feel free to send a little
my way through one of the following methods:

[![GitHub Sponsors](https://img.shields.io/github/sponsors/tgrosinger?style=social)](https://github.com/sponsors/tgrosinger)
[![Paypal](https://img.shields.io/badge/paypal-tgrosinger-yellow?style=social&logo=paypal)](https://paypal.me/tgrosinger)
[<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="BuyMeACoffee" width="100">](https://www.buymeacoffee.com/tgrosinger)

## Credits

A huge thank you to [Liam Cain](https://github.com/liamcain) for adapting the
[Obsidian Calendar
Plugin](https://github.com/liamcain/obsidian-calendar-plugin) and making it
broadly usable by other plugins!

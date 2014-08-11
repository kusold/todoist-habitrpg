# Todist - HabitRPG sync
This is a small utility to help you keep your [Todoist](https://todoist.com) tasks in sync with [HabitRPG](https://habitrpg.com).

## Installation
`npm install -g todoist-habitrpg`

## Running
`todoist-habitrpg -u habitRpgUserId -t habitRpgApiToken -a todoistApiToken`

I would recommend running this as a cron job.

1. `crontab -e`
2. `*/10 * * * * todoist-habitrpg -u habitRpgUserId -t habitRpgApiToken -a todoistApiToken`
3. Verify it was saved with `crontab -l`

## Locating your API Tokens
### HabitRPG
Your User ID (`habitRpgUserId`) and API Token (`habitRpgApiToken`) can be located at your HabitRPG [settings page](https://habitrpg.com/#/options/settings/api).

### Todoist
Your API Token (todoistApiToken) can be located by following these steps:

1. Login to your account at [todoist.com](https://todoist.com)
2. Click the "Gear" icon in the top right corner
3. Click "Todoist Settings"
4. Click the "Account" header inside the modal.
5. Your API Token is located on this page.

## Command Line Help
`todoist-habitrpg --help`

## Current Limitations
* Only supports syncing from Todoist -> HabitRPG.
* Only supports basic task syncing. Subtasks get synced as a toplevel task in HabitRPG
* Only tested on Linux. Should work on OSX.
* Sync History file is hardcoded to be at `$HOME/.todoist-habitrpg.json`

## Roadmap
* Support Windows
* Support specifying where the sync history file is.
* If a task has a subtask, then create the item on HabitRPG as a checklist
* If a task belongs to a project, on HabitRPG create a tag with that project name
* If a task is a daily task then create it as a daily on HabitRPG
* If a tasks is a repeating task then create it as a habit on HabitRPG
* Support syncing from HabitRPG -> Todoist
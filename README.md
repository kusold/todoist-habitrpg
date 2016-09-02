# Todist - HabitRPG sync

[![Build Status](https://travis-ci.org/Kusold/todoist-habitrpg.svg?branch=master)](https://travis-ci.org/Kusold/todoist-habitrpg)

This is a small utility to help you keep your [Todoist](https://todoist.com) tasks in sync with [HabitRPG](https://habitrpg.com).

## Installation
Ensure that you have [NodeJS](http://nodejs.org/download/) installed.

Then run:
`npm install -g todoist-habitrpg`

### Windows Troubleshooting
Currently the Windows NodeJS installer has a bug in it. If you encounter an `Error: ENOENT, stat 'C:\Users\.....'` error, just create a folder at the path specified and re-run the above command.

## Running
From the terminal or command prompt enter the command below and replace `habitRpgUserId`, `habitRpgApiToken`, and `todoistApiToken` with the correct values. You can find directions on how to find these values in the [Locating Your API Tokens](#locating-your-api-tokens) section.

`todoist-habitrpg -u habitRpgUserId -t habitRpgApiToken -a todoistApiToken`

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

## Choosing the directory where the sync history is stored
Pass a -f flag followed by the directory where you want your file to be stored, relative to your home directory. For example, if you want the json file stored in ~/foo/bar/.todoist-habitrpg.json, you'd write the following at the end of your terminal command
```
-f ~/foo/bar
```

## Assigning Attribute Labels
Once you've reached level 10 in HabitRPG, you start gaining skill points and can choose to allocate those skill points based on the kind of task you do. You can choose what kind of task it is by applying labels in Todoist. Below is a list of valid labels for each attribute.

| Attribute Name | Valid Labels                   |
| -------------  | ------------------------------ |
| Strength       | str, strength, physical, phy   |
| Intelligence   | int, intelligence, mental, men |
| Constitution   | con, constitution, social, soc |
| Perception     | per, perception, other, oth    |

If more than one valid label is assigned to a task in todoist, the first valid label will be assigned to the task in HabitRPG.

## Updating to new versions
Periodically new versions will be published. You can install these updates with the command below.

`npm update -g todoist-habitrpg`

## Command Line Help
`todoist-habitrpg --help`

## Cron Usage - Linux/Mac Only
I would recommend setting this up as a cron job for automatic syncing.

1. `crontab -e`
2. Set your $HOME variable: `HOME=/home/username`
2. `*/10 * * * * todoist-habitrpg -u habitRpgUserId -t habitRpgApiToken -a todoistApiToken`
3. Verify it was saved with `crontab -l`

Troubleshooting: If this doesn't work for you, please use absolute paths or adjust the PATH for your cron.

## Current Limitations
* Only supports syncing from Todoist -> HabitRPG.
* Only supports basic task syncing. Subtasks get synced as a toplevel task in HabitRPG
* ~~Sync History file is hardcoded to be at `$HOME/.todoist-habitrpg.json`~~

## Roadmap
* ~~Support Windows~~
* ~~Support specifying where the sync history file is.~~
* If a task has a subtask, then create the item on HabitRPG as a checklist
* If a task belongs to a project, on HabitRPG create a tag with that project name
* If a task is a daily task then create it as a daily on HabitRPG
* If a tasks is a repeating task then create it as a habit on HabitRPG
* Support syncing from HabitRPG -> Todoist
* Write up instructions on setting this up to run with the Windows Task Scheduler

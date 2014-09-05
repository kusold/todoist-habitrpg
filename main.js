#!/usr/bin/env node
var program = require('commander');
var habitSync = require('./habitSync');

program
  .version('0.0.1')
  .usage('-u habitRpgUserId -t habitRpgApiToken -a todoistApiToken')
  .option('-u, --uid <s>', 'Your HabitRPG User Id')
  .option('-t, --token <s>', 'Your HabitRPG API Token')
  .option('-a, --todoist <s>', 'Your Todoist API Token')
  .option('-f, --file <s>', 'Location of your sync history')
  .parse(process.argv);

main();

function main() {
// todo: think about removing these checks
  if (!program.uid) {
    console.error("No HabitRPG User Id found");
    return;
  }
  if (!program.token) {
    console.error("No HabitRPG API Token found");
    return;
  }
  if (!program.todoist) {
    console.error("No Todoist API Token found");
    return;
  }
  if (program.file) {
    program.historyPath = program.file + '/.todoist-habitrpg.json';
  } else {
    if(process.platform == "win32") {
      program.historyPath = process.env.HOMEPATH + '/.todoist-habitrpg.json'
    } else {
      program.historyPath = process.env.HOME + '/.todoist-habitrpg.json'
    }
  }
  
  var sync = new habitSync({uid: program.uid, token: program.token, historyPath: program.file});
  sync.Run();
}
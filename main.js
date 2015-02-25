#!/usr/bin/env node
var program = require('commander');
var habitSync = require('./habitSync');
var fs = require('fs');

program
  .version('0.0.1')
  .usage('-u habitRpgUserId -t habitRpgApiToken -a todoistApiToken')
  .option('-u, --uid <s>', 'Your HabitRPG User Id')
  .option('-t, --token <s>', 'Your HabitRPG API Token')
  .option('-a, --todoist <s>', 'Your Todoist API Token')
  .option('-f, --file <s>', 'Location of your sync history')
  .option('-c, --config <s>', 'Location of your configuration file')
  .option('-s, --save <s>', 'Location to save a new config file')
  .parse(process.argv);

var config;

main();

function main() {
  if(program.config) {
    if(fs.existsSync(program.config)) {
      var data = fs.readFileSync(program.config, 'utf8');
      config = JSON.parse(data);
    } else {
      console.error('No config file found');
      return;
    }
  } else {
    config = {
      uid: program.uid,
      token: program.token,
      todoist: program.todoist,
      file: program.file,
    }
  }

  if (!config.uid) {
    console.error("No HabitRPG User Id found");
    return;
  }
  if (!config.token) {
    console.error("No HabitRPG API Token found");
    return;
  }
  if (!config.todoist) {
    console.error("No Todoist API Token found");
    return;
  }
  if (config.file) {
    config.historyPath = config.file + '/.todoist-habitrpg.json';
  } else {
    if(process.platform == "win32") {
      config.historyPath = process.env.HOMEPATH + '/.todoist-habitrpg.json';
    } else {
      config.historyPath = process.env.HOME + '/.todoist-habitrpg.json';
    }
  }

  var sync = new habitSync({uid: config.uid, token: config.token, todoist: config.todoist, historyPath: config.historyPath});
  sync.run(function(err) {
    if(err) {
      return console.log('Sync failed with error: ' + err)
    }

    if(program.save && config) {
      delete config.historyPath;
      delete config.save;
      delete config.config;
      fs.writeFileSync(program.save, JSON.stringify(config));
    }
    console.log('Sync completed successfully.')
  });
}

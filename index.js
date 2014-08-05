#!/usr/bin/env node

var program = require('commander');
var habitapi = require('habitrpg-api');
var request = require('superagent');
var async = require('async');

program
  .version('0.0.1')
  .usage('-u habitRpgUserId -t habitRpgApiToken -a todoistApiToken')
  .option('-u, --uid <s>', 'Your HabitRPG User Id')
  .option('-t, --token <s>', 'Your HabitRPG API Token')
  .option('-a, --todoist <s>', 'Your Todoist API Token')
  .parse(process.argv);

main()
function main() {
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
  
  async.waterfall([
    function(cb) {
      getTodoistSync(cb);
    },
    function(res, cb) {
      console.log('MRK 1');
      console.log(res.body.Items);
      syncItemsToHabitRpg(res.body.Items, cb);
    }
  ], function(err, res) {
    console.log('+++++++ END');
    console.error(err);
    console.log(res);
  });
}

function getTodoistSync(cb) {
  console.log('todoist');
  request.post('https://api.todoist.com/TodoistSync/v5.3/get')
	 .send('api_token=' + program.todoist)
	 .send('seq_no=0')
	 .end(function(err, res) {
	   cb(err,res);
	 });
}

function syncItemsToHabitRpg(items, cb) {
  var habit = new habitapi(program.uid, program.token);
  var taskRes = [];
  // Cannot execute in parallel. See: https://github.com/HabitRPG/habitrpg/issues/2301
  async.eachSeries(items, function(item, next) {
    var task = {
      text: item.content,
      dateCreated: new Date(item.date_added),
      type: 'todo'
    }
    habit.user.createTask(task, function(err, res) {
      if(!err) {
	taskRes.push(res.body);
      }
      next(err, res.body);
    });
  }, function(err) {
    cb(err, taskRes);
  });
}


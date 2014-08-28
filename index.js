#!/usr/bin/env node

var program = require('commander');
var habitapi = require('habitrpg-api');
var request = require('superagent');
var async = require('async');
var fs = require('fs');
var _ = require('lodash');

program
  .version('0.0.1')
  .usage('-u habitRpgUserId -t habitRpgApiToken -a todoistApiToken')
  .option('-u, --uid <s>', 'Your HabitRPG User Id')
  .option('-t, --token <s>', 'Your HabitRPG API Token')
  .option('-a, --todoist <s>', 'Your Todoist API Token')
  .option('-f, --file <s>', 'Location of your sync history')
  .parse(process.argv);

var history = {};
main();

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
  if (program.file) {
    program.historyPath = program.file + '/.todoist-habitrpg.json';
  } else {
    if(process.platform == "win32") {
      program.historyPath = process.env.HOMEPATH + '/.todoist-habitrpg.json'
    } else {
      program.historyPath = process.env.HOME + '/.todoist-habitrpg.json'
    }
  }
  
  history = readHistoryFromFile(program.historyPath);
  if(!history.tasks) {
    history.tasks = {};
  }

  var oldHistory = _.cloneDeep(history);

  async.waterfall([
    function(cb) {
      getTodoistSync(cb);
    },
    function(res, cb) {
      history.seqNo = res.body.seq_no;
      updateHistoryForTodoistItems(res.body.Items);
      var changedTasks = findTasksThatNeedUpdating(history, oldHistory);
      syncItemsToHabitRpg(changedTasks, cb);
    }
  ], function(err, newHistory) {
    fs.writeFileSync(program.historyPath, JSON.stringify(newHistory));
  });
}

function findTasksThatNeedUpdating(newHistory, oldHistory) {
  var needToUpdate = []
  _.forEach(newHistory.tasks, function(item) {
    var old = oldHistory.tasks[item.todoist.id];
    if(!old || !old.todoist || old.todoist.content != item.todoist.content ||
       old.todoist.checked != item.todoist.checked ||
       old.todoist.due_date_utc != item.todoist.due_date_utc) {
      needToUpdate.push(item);
    }
  });
  return needToUpdate;
}

function updateHistoryForTodoistItems(items) {
  _.forEach(items, function(item) {
    if(history.tasks[item.id]) {
      history.tasks[item.id].todoist = item;
    } else {
      history.tasks[item.id] = {todoist: item}
    }
  });
}

function readHistoryFromFile(path) {
  var history = {};
  if(fs.existsSync(path)) {
    var data = fs.readFileSync(path, 'utf8');
    history = JSON.parse(data);
  }
  return history;
}

function getTodoistSync(cb) {
  var seqNo = history.seqNo || 0;

  request.post('https://api.todoist.com/TodoistSync/v5.3/get')
	 .send('api_token=' + program.todoist)
	 .send('seq_no='+seqNo)
	 .end(function(err, res) {
	   cb(err,res);
	 });
}

function syncItemsToHabitRpg(items, cb) {
  var habit = new habitapi(program.uid, program.token);
  // Cannot execute in parallel. See: https://github.com/HabitRPG/habitrpg/issues/2301
  async.eachSeries(items, function(item, next) {
    async.waterfall([
      function(cb) {
        var dueDate;
        if(item.todoist.due_date_utc) {
          dueDate = new Date(item.todoist.due_date_utc);
        }

        var task = {
          text: item.todoist.content,
          dateCreated: new Date(item.todoist.date_added),
          date: dueDate,
          type: 'todo',
          completed: item.todoist.checked == true
        };

        if(item.habitrpg) {
          // Checks if the complete status has changed
          if(task.completed != item.habitrpg.completed && item.habitrpg.completed != undefined) {
            var direction = task.completed == true;
            habit.user.updateTaskScore(item.habitrpg.id, direction, function(response, error){ });
          }
          habit.user.updateTask(item.habitrpg.id, task, function(err, res) {
            cb(err, res)
          });
        } else {
          habit.user.createTask(task, function(err, res) {
            cb(err, res)
          });
        }
      },
      function(res, cb) {
        history.tasks[item.todoist.id] = {
          todoist: item.todoist,
          habitrpg: res.body
        }
        cb()
      }
    ], next)
  }, function(err) {
    cb(err, history);
  });
}

module.exports = {
  findTasksThatNeedUpdating: findTasksThatNeedUpdating
};

var habitapi = require('habitrpg-api');
var request = require('superagent');
var async = require('async');
var fs = require('fs');
var _ = require('lodash');

var history = {};

//
// options.uid: HabitRPG UserId
// options.token: HabitRPG API Token
// options.todoist: Todoist API Token
// options.historyPath: Directory for history
//
function habitSync(options) {
  if(!options) {
    throw new Error("Options are required");
  }
  if(!options.uid) {
    throw new Error("No HabitRPG User Id found");
  }
  if (!options.token) {
    throw new Error("No HabitRPG API Token found");
  }
  if (!options.todoist) {
    throw new Error("No Todoist API Token found");
  }

  if (options.historyPath) {
    this.historyPath = options.historyPath + '/.todoist-habitrpg.json';
  } else {
    // Defaults
    if(process.platform == "win32") {
      this.historyPath = process.env.HOMEPATH + '/.todoist-habitrpg.json'
    } else {
      this.historyPath = process.env.HOME + '/.todoist-habitrpg.json'
    }
  }

  this.uid = options.uid;
  this.token = options.token;
  this.todoist = options.todoist;
}

habitSync.prototype.run = function(done) {
  var self = this;
  history = self.readHistoryFromFile(self.historyPath);
  if(!history.tasks) {
    history.tasks = {};
  }

  var oldHistory = _.cloneDeep(history);

  async.waterfall([
    function(cb) {
      self.getTodoistSync(cb);
    },
    function(res, cb) {
      history.seqNo = res.body.seq_no;
      self.updateHistoryForTodoistItems(res.body.Items);
      var changedTasks = self.findTasksThatNeedUpdating(history, oldHistory);
      self.syncItemsToHabitRpg(changedTasks, cb);
    }
  ], function(err, newHistory) {
    fs.writeFileSync(self.historyPath, JSON.stringify(newHistory));
    done();
  });
}

habitSync.prototype.findTasksThatNeedUpdating = function(newHistory, oldHistory) {
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

habitSync.prototype.updateHistoryForTodoistItems = function(items) {
  _.forEach(items, function(item) {
    if(history.tasks[item.id]) {
      history.tasks[item.id].todoist = item;
    } else {
      history.tasks[item.id] = {todoist: item}
    }
  });
}

habitSync.prototype.readHistoryFromFile = function(path) {
  var history = {};
  if(fs.existsSync(path)) {
    var data = fs.readFileSync(path, 'utf8');
    history = JSON.parse(data);
  }
  return history;
}

habitSync.prototype.getTodoistSync = function(cb) {
  var seqNo = history.seqNo || 0;

  request.post('https://api.todoist.com/TodoistSync/v5.3/get')
   .send('api_token=' + program.todoist)
   .send('seq_no='+seqNo)
   .end(function(err, res) {
     cb(err,res);
   });
}

habitSync.prototype.syncItemsToHabitRpg = function(items, cb) {
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

module.exports = habitSync;

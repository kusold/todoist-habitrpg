#!/usr/bin/env node
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
      self.getHabitAttributeIds(cb)
    },
    function(attributes, cb) {
      habitAttributes = attributes;
      self.getTodoistSync(cb);
    },
    function(res, cb) {
      history.seqNo = res.body.seq_no;
      self.updateHistoryForTodoistItems(res.body.Items);
      var changedTasks = self.findTasksThatNeedUpdating(history, oldHistory);
      self.syncItemsToHabitRpg(changedTasks, cb);
    }
  ], function(err, newHistory) {
    if(err) {
      return done(err);
    }
    fs.writeFileSync(self.historyPath, JSON.stringify(newHistory));
    done();
  });
}

habitSync.prototype.findTasksThatNeedUpdating = function(newHistory, oldHistory) {
  var self = this;
  var needToUpdate = []
  _.forEach(newHistory.tasks, function(item) {
    var old = oldHistory.tasks[item.todoist.id];
    var updateLabels = false;
    if(old) {
      updateLabels = self.checkTodoistLabels(old.todoist.labels, item.todoist.labels);
    }
    if(!old || !old.todoist || old.todoist.content != item.todoist.content ||
       old.todoist.checked != item.todoist.checked ||
       old.todoist.due_date_utc != item.todoist.due_date_utc ||
       old.todoist.is_deleted != item.todoist.is_deleted ||
       updateLabels) {
      needToUpdate.push(item);
    }
  });
  return needToUpdate;
}

habitSync.prototype.updateHistoryForTodoistItems = function(items) {
  var self = this;
  var habit = new habitapi(self.uid, self.token);
  _.forEach(items, function(item) {
    if(history.tasks[item.id]) {
      if(item.is_deleted) {
        // TODO: Determine if you want to delete the task in the habit sync function
        var habitId = history.tasks[item.id].habitrpg.id;
        habit.deleteTask(habitId, function(response, error){})

        // Deletes record from sync history
        delete history.tasks[item.id];
      } else {
        history.tasks[item.id].todoist = item;
      }
    } else if(!item.is_deleted) {
      // Only adds item to history if it was not deleted before syncing to habitrpg
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
  var self = this;
  var seqNo = history.seqNo || 0;

  request.post('https://api.todoist.com/TodoistSync/v5.3/get')
   .send('api_token=' + self.todoist)
   .send('seq_no='+seqNo)
   .end(function(err, res) {
     cb(err,res);
   });
}

habitSync.prototype.syncItemsToHabitRpg = function(items, cb) {
  var self = this;
  var habit = new habitapi(self.uid, self.token);
  // Cannot execute in parallel. See: https://github.com/HabitRPG/habitrpg/issues/2301
  async.eachSeries(items, function(item, next) {
    async.waterfall([
      function(cb) {
        var dueDate, 
            attribute, 
            taskType = 'todo',
            repeat;
        if(item.todoist.due_date_utc) {
          dueDate = new Date(item.todoist.due_date_utc);
        }

        if(item.todoist.date_string.match(/^ev(ery | )/i)) {
            taskType = 'daily';
            repeat = {
              "su": false,
              "s": false,
              "f": false,
              "th": false,
              "w": false,
              "t": false,
              "m": false
            }
        }
        
        var task = {
          text: item.todoist.content,
          dateCreated: new Date(item.todoist.date_added),
          date: dueDate,
          type: taskType,
          repeat: repeat,
          completed: item.todoist.checked == true
        };
        if (item.todoist.labels.length > 0) {
          attribute = self.checkForAttributes(item.todoist.labels);
        } 
        if(attribute) {
          task.attribute = attribute;
        }
        
        if(item.habitrpg) {
          // Checks if the complete status has changed
          if((task.completed != item.habitrpg.completed && item.habitrpg.completed !== undefined) ||
             (task.completed == true && item.habitrpg.completed === undefined)) {
            var direction = task.completed == true;
            habit.updateTaskScore(item.habitrpg.id, direction, function(response, error){ });
          }
          habit.updateTask(item.habitrpg.id, task, function(err, res) {
            cb(err, res)
          });
        } else {
          habit.createTask(task, function(err, res) {
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

habitSync.prototype.getHabitAttributeIds = function(callback) {
  // Gets a list of label ids and puts
  // them in an object if they correspond
  // to HabitRPG attributes (str, int, etc)
  var self = this;
  var labels = {};

  request.post('https://api.todoist.com/API/getLabels')
	 .send('token=' + self.todoist)
   .end(function(err, res) {
     var labelObject = res.body;
     for(var l in labelObject) {
      labels[l] = labelObject[l].id;
     }

    var attributes = {str: [], int: [], con: [], per: []}

    for(var l in labels) {
      if (l == 'str' || l == 'strength' 
            || l == 'physical' || l == 'phy') {
        attributes.str.push(labels[l]);
      } else if (l == 'int' || l == 'intelligence' 
            || l == 'mental' || l == 'men') {
        attributes.int.push(labels[l]);
      } else if (l == 'con' || l == 'constitution' 
            || l == 'social' || l == 'soc') {
        attributes.con.push(labels[l]);
      } else if (l == 'per' || l == 'perception' 
            || l == 'other' || l == 'oth') {
        attributes.per.push(labels[l]);
      }
    }

    callback(null, attributes)
  });
}

habitSync.prototype.checkForAttributes = function(labels) {
  // Cycle through todoist labels
  // For each label id, check it against the ids stored in habitAttributes
  // If a match is found, return it

  for(var label in labels) { 
    for(var att in habitAttributes) {
      for(var num in habitAttributes[att]) {
        if(habitAttributes[att][num] == labels[label]) {
          return att;
        }
      }
    }
  }
}

habitSync.prototype.checkTodoistLabels = function(oldLabel, newLabel) {
  // Compares ids of todoist labels to determine
  // if the item needs updating
  
  if(oldLabel.length != newLabel.length) {
    return true;
  }

  for(var i in oldLabel) {
    if(oldLabel[i] != newLabel[i]) {
      return true;
    }
  }

  return false;
}

module.exports = habitSync;

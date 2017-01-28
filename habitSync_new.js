#!/usr/bin/env node
'use strict';
const _ = require('lodash');
const fetch = require('isomorphic-fetch');
const Habitica = require('habitica');
const PromisePool = require('es6-promise-pool');

const querystring = require('querystring');
const fs = require('fs');

class HabitSync {
  constructor({uid, token, todoist, historyPath} = {}) {
    if(!uid) {
      throw new Error('No Habitica User Id found');
    }
    if (!token) {
      throw new Error("No Habitica API Token found");
    }
    if (!todoist) {
      throw new Error("No Todoist API Token found");
    }

    if (historyPath) {
      this.historyPath = options.historyPath + '/.todoist-habitrpg.json';
    } else {
      // Defaults
      if(process.platform == "win32") {
        this.historyPath = process.env.HOMEPATH + '/.todoist-habitrpg.json'
      } else {
        this.historyPath = process.env.HOME + '/.todoist-habitrpg.json'
      }
    }

    this.uid = uid;
    this.token = token;
    this.todoist = todoist;

    this.habiticaClient = new Habitica({
      id: uid,
      apiToken: token,
      platform: 'todoist-habitrpg',
    });
  }

  run() {
    this.history = this.loadSavedHistorySync();
    this.previousHistory = _.cloneDeep(this.history);

    return this.syncTodoist()
      .then(body => {
        if(!body || typeof body !== 'object' || Array.isArray(body.item)) {
          throw new Error('Todoist Sync was missing items');
        }

        // TODO: Update sync_token elsewhere
        this.history.sync_token = body.sync_token;

        // Map labels
        //        this.labels = {};
        //        if(Array.isArray(body.labels)) {
        //          body.labels.forEach(l => {
        //            const labelType = this.parseLabel(l.name);
        //            if(labelType) this.labels[l.id] = labelType;
        //          });
        //        }

        const needsUpdating = body.items.filter((item) =>
          this.taskNeedsUpdating(item, _.get(this.history.tasks[item.id], 'todoist', undefined))
        );

        const tasks = needsUpdating.map(item => this.prepareTask(item));

        let index = 0;
        const promiseReducer = () => {
          if(index < tasks.length) {
            const task = tasks[index];
            index++;
            return this.syncHabitica(task, _.get(this.history.tasks[task.id], 'habitrpg', {})).then(res => {
              if(res) return this.history.tasks[res.todoist.id] = res
              delete this.history.tasks[task.id];
            });
          }
          return null;
        }
        // Keep at 1. Server 500s with more concurrency
        return new PromisePool(promiseReducer, 1).start().then(() => Promise.resolve(this.history));
      }).then(history => this.saveHistory(history));
  }

  loadSavedHistorySync() {
    let history;
    if(fs.existsSync(this.historyPath)) {
      const data = fs.readFileSync(this.historyPath, 'utf8');
      history = JSON.parse(data);
    }
    if(typeof history !== 'object') history = {};
    if(!history.tasks) history.tasks = {};
    return history;
  }

  saveHistory(history) {
    return fs.writeFile(this.historyPath, JSON.stringify(history));
  }

  syncTodoist() {
    const syncToken = this.previousHistory.sync_token || '*';
    const data = {token: this.todoist, sync_token: syncToken, resource_types: '["all"]'};
    return fetch(`https://todoist.com/API/v7/sync?${querystring.stringify(data)}`, {
      headers: {'accept': 'application/json'}
    })
      .then(response => {
        if(!response.ok) throw new Error(`Problem retrieving Todoist history: ${response.statusText}`);
        return response.json();
      });
  }

  taskNeedsUpdating(newTask, oldTask) {
    if(!oldTask) return true;
    // Check that labels haven't changed
    if(!_.isEqual(newTask.labels, oldTask.labels)) return true;
    
    // Check to see if any of these attributes have changed since last sync
    const attributes = ['content', 'checked', 'due_date_utc', 'is_deleted'];
    return !attributes.every(attr => newTask[attr] === oldTask[attr]);
  }

  prepareTask(task) {
    const { repeat, type } = this.parseTodoistRepeatingDate(task.date_string);
    let preparedTask =  {
      id: task.id, //TODOIST ID
      is_deleted: task.is_deleted, // Determine if this task should be deleted
      text: task.content,
      dateCreated: new Date(task.date_added),
      completed: task.checked == true,
      type,
      repeat,
    };
    if(task.due_date_utc) preparedTask.date = new Date(task.due_date_utc);
    if(preparedTask.completed) preparedTask.dateCompleted = new Date();
    return preparedTask;
    //TODO: Check attributes
  }

  parseTodoistRepeatingDate(date) {
    let type = 'todo';
    let repeat;

    if(!date) return {type: type, repeat: repeat};

    const noStartDate = !(date.match(/(after|starting|last|\d+(st|nd|rd|th)|(first|second|third))/i));

    const needToParse = date.match(/^ev(ery)? [^\d]/i) || date === "daily";

    if(needToParse && noStartDate) {
      type = 'daily';

      const everyday = (!!(date.match(/^ev(ery)? [^(week)]?(?:day|night)/i)) || date === "daily");
      const weekday = !!(date.match(/^ev(ery)? (week)?day/i));
      const weekend = !!(date.match(/^ev(ery)? (week)?end/i));

      repeat = {
        "su": everyday || weekend || !!(date.match(/\bs($| |,|u)/i)),
        "s":  everyday || weekend || !!(date.match(/\bsa($| |,|t)/i)),
        "f":  everyday || weekday || !!(date.match(/\bf($| |,|r)/i)),
        "th": everyday || weekday || !!(date.match(/\bth($| |,|u)/i)),
        "w":  everyday || weekday || (!!(date.match(/\bw($| |,|e)/i)) && !weekend), // Otherwise also matches weekend
        "t":  everyday || weekday || !!(date.match(/\bt($| |,|u)/i)),
        "m":  everyday || weekday || !!(date.match(/\bm($| |,|o)/i))
      };
    }

    return {type: type, repeat: repeat};

  }

  syncHabitica(newItem, oldItem) {
    if(newItem.is_deleted) return this.deleteHabiticaTask(oldItem.id).then(res => Promise.resolve(undefined));
    if(oldItem && oldItem.id) {
      let p;
      if(newItem.type === 'todo') p = this.scoreTodo(newItem, oldItem);
      if(newItem.type === 'daily') p = this.scoreDaily(newItem, oldItem);
    
      return p.then(() => this.updateHabiticaTask(oldItem.id, newItem)).then(res => Promise.resolve({todoist: newItem, habitrpg: res.data}));
    }
    return this.createHabiticaTask(newItem).then(res => Promise.resolve({todoist: newItem, habitrpg: res.data}));
  }

  scoreTodo(newItem, oldItem) {
    if(this.taskNeedsScoring(newItem, oldItem)) {
      const direction = newItem.completed === true;
      return this.scoreTask(oldItem.id, direction).then(() => Promise.resolve(newItem));
    } 
    // Didn't need updating
    return Promise.resolve(newItem);
  }

  scoreDaily(newItem, oldItem) {
    if(this.taskNeedsScoring(newItem, oldItem)) {
      if(new Date(newItem.date) >= new Date(oldItem.date)) {
        newItem.completed = true;
      }
      const direction = newItem.completed === true;
      return this.scoreTask(oldItem.id, direction).then(() => Promise.resolve(newItem));
    }
    // Didn't need updating
    return Promise.resolve(newItem);
    

  }

  scoreTask(habiticaId, direction) {
    return this.habiticaClient.post(`/tasks/${habiticaId}/score/${direction ? 'up' : 'down'}`)
  }

  updateHabiticaTask(id, task) {
    return this.habiticaClient.put(`/tasks/${id}`, task)

  }

  taskNeedsScoring(newTask, oldTask) {
    const changed = newTask.completed != oldTask.completed && oldTask.completed !== undefined;
    const newCompleted = newTask.completed === true && oldTask.completed === undefined;

    return changed || newCompleted;
  }

  createHabiticaTask(task) {
    return this.habiticaClient.post(`/tasks/user`, task)
  }
  deleteHabiticaTask(id) {
    if(!id) return Promise.resolve(); // New task was already deleted before we could sync
    return this.habiticaClient.del(`/tasks/${id}`).catch(err => {
      if(err.status === 404) {
        return Promise.resolve();
      }
      throw err
    })
  }

  writeHistorySync(history) {
    /*
     * tasks: {
     *   [todoist.id]: {
     *     habitrpg: {},
     *     todoist: {},
     *   },
     *
     */
    fs.writeFileSync(this.historyPath, JSON.stringify(history));
  }


  parseLabel(label) {
    switch(label.toLowerCase()) {
      case 'strength':
      case 'str':
      case 'physical':
      case 'phy':
        return 'strength';
      case 'intelligence':
      case 'int':
      case 'mental':
      case 'men':
        return 'intelligence';
      case 'constitution':
      case 'con':
      case 'social':
      case 'soc':
        return 'constitution';
      case 'perception':
      case 'per':
      case 'other':
      case 'oth':
        return 'perception';
      default:
        return '';
    }
  }
}

module.exports = HabitSync;

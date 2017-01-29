'use strict';
const fs = require('fs');
const path = require('path');

const _ = require('lodash');
const chai = require('chai');
const expect = require('chai').expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const habitica = require('habitica');

const thrpg = require('../habitSync_new.js');

chai.use(expect);
chai.use(sinonChai);

const todoistResponse = {
  "sync_token": 5555555555,
  "items": [{
    "date_string": "",
    "checked": 0,
    "collapsed": 0,
    "project_id": 111111111,
    "responsible_uid": null,
    "item_order": 6,
    "priority": 1,
    "has_notifications": 0,
    "in_history": 0,
    "sync_id": null,
    "labels": [],
    "is_archived": 0,
    "assigned_by_uid": 2222222,
    "day_order": -1,
    "due_date": "Thu 04 Sep 2014 22:59:59",
    "date_added": "Thu 21 Aug 2014 15:00:19 +0000",
    "indent": 2,
    "children": null,
    "content": "Create More Tests",
    "is_deleted": 0,
    "user_id": 3333333,
    "due_date_utc": "Fri 05 Sep 2014 05:59:59 +0000",
    "id": 44444444
  }]
};
const todoistLabelResponse = {
  "oth": {
    "is_deleted": 0,
    "name": "oth",
    "color": 7,
    "id": 414269,
    "uid": 1539048
  },
  "soc": {
    "is_deleted": 0,
    "name": "soc",
    "color": 7,
    "id": 414265,
    "uid": 1539048
  },
  "perception": {
    "is_deleted": 0,
    "name": "perception",
    "color": 7,
    "id": 414267,
    "uid": 1539048
  },
  "physical": {
    "is_deleted": 0,
    "name": "physical",
    "color": 7,
    "id": 414256,
    "uid": 1539048
  },
  "mental": {
    "is_deleted": 0,
    "name": "mental",
    "color": 7,
    "id": 414260,
    "uid": 1539048
  },
  "int": {
    "is_deleted": 0,
    "name": "int",
    "color": 7,
    "id": 414258,
    "uid": 1539048
  },
  "intelligence": {
    "is_deleted": 0,
    "name": "intelligence",
    "color": 7,
    "id": 414259,
    "uid": 1539048
  },
  "men": {
    "is_deleted": 0,
    "name": "men",
    "color": 7,
    "id": 414261,
    "uid": 1539048
  },
  "per": {
    "is_deleted": 0,
    "name": "per",
    "color": 7,
    "id": 414266,
    "uid": 1539048
  },
  "testlabel": {
    "is_deleted": 0,
    "name": "testLabel",
    "color": 7,
    "id": 414247,
    "uid": 1539048
  },
  "phy": {
    "is_deleted": 0,
    "name": "phy",
    "color": 7,
    "id": 414257,
    "uid": 1539048
  },
  "other": {
    "is_deleted": 0,
    "name": "other",
    "color": 7,
    "id": 414268,
    "uid": 1539048
  },
  "str": {
    "is_deleted": 0,
    "name": "str",
    "color": 7,
    "id": 414253,
    "uid": 1539048
  },
  "social": {
    "is_deleted": 0,
    "name": "social",
    "color": 7,
    "id": 414264,
    "uid": 1539048
  },
  "con": {
    "is_deleted": 0,
    "name": "con",
    "color": 7,
    "id": 414262,
    "uid": 1539048
  },
  "strength": {
    "is_deleted": 0,
    "name": "strength",
    "color": 7,
    "id": 414254,
    "uid": 1539048
  },
  "constitution": {
    "is_deleted": 0,
    "name": "constitution",
    "color": 7,
    "id": 414263,
    "uid": 1539048
  }
};

describe('todoist-habitrpg', () => {
  let sync;
  before(() => {
    sync = new thrpg({uid: 1, token: 2, todoist: 3});
  });

  context('constructor', () => {
    it('should require certain options for instantiation', () => {
      expect(() => new thrpg()).to.throw(/No Habitica User Id found/);
      expect(() => new thrpg({uid: 1})).to.throw(/No Habitica API Token found/);
      expect(() => new thrpg({uid: 1, token: 2})).to.throw(/No Todoist API Token found/);
      const thrpgSync = new thrpg({uid: 1, token: 2, todoist: 3});
      expect(thrpgSync.uid).to.equal(1);
      expect(thrpgSync.token).to.equal(2);
      expect(thrpgSync.todoist).to.equal(3);
      expect(thrpgSync.historyPath).to.match(/\.todoist-habitrpg\.json/);
      expect(thrpgSync.habiticaClient).to.exist;
    });
  });
  context('run', () => {
    let fileExistsStub,
      readFileStub,
      writeFileStub,
      syncTodoistStub,
      habiticaStub;
    let taskGenerator = (todoistItem) => {
      return {
        id: todoistItem.id,
        is_deleted: todoistItem.is_deleted,
        text: todoistItem.content,
        dateCreated: new Date(todoistItem.date_added),
        date: new Date(todoistItem.due_date_utc),
        type: 'todo',
        completed: todoistItem.checked == true,
        repeat: undefined
      };
    };

    before(() => {
      fileExistsStub = sinon.stub(fs, 'existsSync');
      readFileStub = sinon.stub(fs, 'readFileSync');
      writeFileStub = sinon.stub(fs, 'writeFile');
      syncTodoistStub = sinon.stub(sync, 'syncTodoist');
      habiticaStub = sinon.stub(habitica.prototype);
    });

    beforeEach(() => {
      writeFileStub.yields();
    });

    afterEach(() => {
      fileExistsStub.reset();
      readFileStub.reset();
      writeFileStub.reset();
      syncTodoistStub.reset();
      habiticaStub.del.reset();
      habiticaStub.get.reset();
      habiticaStub.post.reset();
      habiticaStub.put.reset();
    });

    after(() => {
      fileExistsStub.restore();
      readFileStub.restore();
      writeFileStub.restore();
      syncTodoistStub.restore();
      habiticaStub.del.restore();
      habiticaStub.get.restore();
      habiticaStub.post.restore();
      habiticaStub.put.restore();
    });

    it('should send Todoist tasks to HabitRPG if there was no history file found', () => {
      fileExistsStub.returns(false);
      syncTodoistStub.returns(Promise.resolve(todoistResponse));
      habiticaStub.post.returns(Promise.resolve(todoistResponse.items[0]))

      return sync.run().then(() => {
        expect(habiticaStub.put).to.not.have.been.called;
        expect(habiticaStub.post).to.have.been.calledOnce;
        expect(habiticaStub.post).to.have.been.calledWith('/tasks/user', sync.prepareTask(todoistResponse.items[0]));
        expect(habiticaStub.post.lastCall.args[1].dateCompleted).to.be.empty;
        expect(writeFileStub).to.have.been.called;
        return Promise.resolve();
      });
    });

    it('should send new completed Todoist tasks to HabitRPG with a dateCompleted', () => {
      var modifiedTodoistResp = _.cloneDeep(todoistResponse);
      modifiedTodoistResp.items[0].checked = true;

      fileExistsStub.returns(false);
      syncTodoistStub.returns(Promise.resolve(modifiedTodoistResp));

      return sync.run().then(() => {
        expect(habiticaStub.put).to.not.have.been.called;
        expect(habiticaStub.post).to.have.been.calledOnce;
        expect(habiticaStub.post).to.have.have.been.calledWithMatch('/tasks/user', taskGenerator(modifiedTodoistResp.items[0]));
        expect(habiticaStub.post.lastCall.args[1].dateCompleted).to.be.exist;
        expect(writeFileStub).to.have.been.called;
        return Promise.resolve();
      });
    });

    it('should not update tasks that havent changed since the last sync', () => {
      fileExistsStub.returns(true);
      readFileStub.returns(JSON.stringify({
        seqNo: todoistResponse.seq_no,
        tasks: {
          44444444: {
            habitrpg: {id: "44444444"},
            todoist: todoistResponse.items[0]
          }
        }
      }));
      syncTodoistStub.returns(Promise.resolve(todoistResponse));

      return sync.run().then(() => {
        expect(habiticaStub.del).to.not.have.been.called;
        expect(habiticaStub.get).to.not.have.been.called;
        expect(habiticaStub.post).to.not.have.been.called;
        expect(habiticaStub.put).to.not.have.been.called;
        expect(writeFileStub).to.have.been.called;
        return Promise.resolve();
      });
    });

    it('should update tasks that have changed content', () => {
      var modifiedTodoistResp = _.cloneDeep(todoistResponse);
      modifiedTodoistResp.items[0].content = "Getting there";
      readFileStub.returns(JSON.stringify({
        seqNo: todoistResponse.seq_no,
        tasks: {
          44444444: {
            habitrpg: {id: "44444444"},
            todoist: todoistResponse.items[0]
          }
        }
      }));
      habiticaStub.put.returns(Promise.resolve(todoistResponse.items[0]));
      syncTodoistStub.returns(Promise.resolve(modifiedTodoistResp));

      return sync.run().then(() => {
        expect(habiticaStub.put).to.have.been.calledOnce;
        expect(habiticaStub.put).to.have.been.calledWith('/tasks/44444444', taskGenerator(modifiedTodoistResp.items[0]));
        expect(writeFileStub).to.have.been.called;
        return Promise.resolve();
      });
    });

    it('should update tasks that have changed their checked state', () => {
      var modifiedTodoistResp = _.cloneDeep(todoistResponse);
      modifiedTodoistResp.items[0].checked = true;
      readFileStub.returns(JSON.stringify({
        seqNo: todoistResponse.seq_no,
        tasks: {
          44444444: {
            habitrpg: {id: "44444444", completed: false},
            todoist: todoistResponse.items[0]
          }
        }
      }));
      syncTodoistStub.returns(Promise.resolve(modifiedTodoistResp));
      return sync.run().then(() => {
        expect(habiticaStub.post).to.have.been.calledWith('/tasks/44444444/score/up');
        expect(habiticaStub.put).to.have.been.calledWithMatch('/tasks/44444444', taskGenerator(modifiedTodoistResp.items[0]));
        expect(habiticaStub.put.lastCall.args[1].dateCompleted).to.exist;
        expect(writeFileStub).to.have.been.called;
        Promise.resolve();
      });
    });

    it('should remove dateCompleted form todos that have unchecked their state', () => {
      var modifiedTodoistResp = _.cloneDeep(todoistResponse);
      modifiedTodoistResp.items[0].checked = false;

      var historyTodoistResp = _.cloneDeep(todoistResponse).items[0];
      historyTodoistResp.checked = true;
      readFileStub.returns(JSON.stringify({
        seqNo: todoistResponse.seq_no,
        tasks: {
          44444444: {
            habitrpg: {id: "44444444", completed: true},
            todoist: historyTodoistResp
          }
        }
      }));
      syncTodoistStub.returns(Promise.resolve(modifiedTodoistResp));
      return sync.run().then(() => {
        expect(habiticaStub.post).to.have.been.calledOnce;
        expect(habiticaStub.post).to.have.been.calledWithMatch('/tasks/44444444/score/down');
        expect(habiticaStub.put).to.have.been.calledOnce;
        expect(habiticaStub.put).to.have.been.calledWithMatch('/tasks/44444444', taskGenerator(modifiedTodoistResp.items[0]));
        expect(habiticaStub.put.lastCall.args[1].dateCompleted).to.be.empty;
        expect(writeFileStub).to.have.been.called;
        return Promise.resolve();
      });
    });

    it('should update tasks that have been completed before being synced', () => {
      var modifiedTodoistResp = _.cloneDeep(todoistResponse);
      modifiedTodoistResp.items[0].checked = true;
      readFileStub.returns(JSON.stringify({
        seqNo: todoistResponse.seq_no,
        tasks: {
          44444444: {
            habitrpg: {id: "44444444"},
            todoist: todoistResponse.items[0]
          }
        }
      }));
      syncTodoistStub.returns(Promise.resolve(modifiedTodoistResp));
      return sync.run().then(() => {
        expect(habiticaStub.post).to.be.calledOnce;
        expect(habiticaStub.post).to.have.been.calledWith('/tasks/44444444/score/up');
        expect(habiticaStub.put).to.have.been.calledWithMatch("44444444", taskGenerator(modifiedTodoistResp.items[0]));
        expect(writeFileStub).to.have.been.called;
        return Promise.resolve();
      });
    });

    it('should recreate a task if it has habitrpg history, but not habitrpg id', () => {
      var modifiedTodoistResp = _.cloneDeep(todoistResponse);
      modifiedTodoistResp.items[0].content = "Getting there";
      readFileStub.returns(JSON.stringify({
        seqNo: todoistResponse.seq_no,
        tasks: {
          44444444: {
            habitrpg: {attribute: 'str'},
            todoist: todoistResponse.items[0]
          }
        }
      }));
      syncTodoistStub.returns(Promise.resolve(modifiedTodoistResp));

      return sync.run().then(() => {
        expect(habiticaStub.post).to.be.calledOnce;
        expect(habiticaStub.put).to.not.have.been.called;
        expect(habiticaStub.post).to.have.have.been.calledWithMatch('/tasks/user', taskGenerator(modifiedTodoistResp.items[0]));
        expect(writeFileStub).to.have.been.called;
        Promise.resolve();
      });
    });

    it('should process tasks without a date string', () => {
      var modifiedTodoistResp = _.cloneDeep(todoistResponse);
      modifiedTodoistResp.items[0].due_date_utc = "Sat 06 Sep 2014 05:59:59 +0000";
      modifiedTodoistResp.items[0].date_string = undefined;
      readFileStub.returns(JSON.stringify({
        seqNo: todoistResponse.seq_no,
        tasks: {
          44444444: {
            habitrpg: {id: "44444444"},
            todoist: todoistResponse.items[0]
          }
        }
      }));
      syncTodoistStub.returns(Promise.resolve(modifiedTodoistResp));

      return sync.run().then(() => {
        expect(habiticaStub.put).to.have.been.calledOnce;
        expect(habiticaStub.put).to.have.been.calledWithMatch("44444444", taskGenerator(modifiedTodoistResp.items[0]));
        expect(writeFileStub).to.have.been.called;
        Promise.resolve();
      });
    });

    it('should update tasks that have changed due dates', () => {
      var modifiedTodoistResp = _.cloneDeep(todoistResponse);
      modifiedTodoistResp.items[0].due_date_utc = "Sat 06 Sep 2014 05:59:59 +0000";
      readFileStub.returns(JSON.stringify({
        seqNo: todoistResponse.seq_no,
        tasks: {
          44444444: {
            habitrpg: {id: "44444444"},
            todoist: todoistResponse.items[0]
          }
        }
      }));
      syncTodoistStub.returns(Promise.resolve(modifiedTodoistResp));

      return sync.run().then(() => {
        expect(habiticaStub.put).to.have.been.called;
        expect(habiticaStub.put).to.have.been.calledWithMatch("44444444", taskGenerator(modifiedTodoistResp.items[0]));
        expect(writeFileStub).to.have.been.called;
        Promise.resolve();
      });
    });

    it('should be able to add a label to a task', () => {
      var modifiedTodoistResp = _.cloneDeep(todoistResponse);
      modifiedTodoistResp.items[0].labels = [todoistLabelResponse.str.id];
      readFileStub.returns(JSON.stringify({
        seqNo: todoistResponse.seq_no,
        tasks: {
          44444444: {
            habitrpg: {id: "44444445"},
            todoist: todoistResponse.items[0]
          }
        }
      }));
      syncTodoistStub.returns(Promise.resolve(modifiedTodoistResp));

      return sync.run().then(() => {
        expect(habiticaStub.put).to.have.been.called;
        expect(habiticaStub.put).to.have.been.calledWithMatch("44444445", taskGenerator(modifiedTodoistResp.items[0]));
        expect(writeFileStub).to.have.been.called;
        Promise.resolve();
      });
    });

    it('should be able to change a task\'s label', () => {
      var modifiedTodoistResp = _.cloneDeep(todoistResponse);
      var historyTodoist = _.cloneDeep(todoistResponse);
      modifiedTodoistResp.items[0].labels = [todoistLabelResponse.str.id];
      historyTodoist.items[0].labels = [todoistLabelResponse.per.id];
      readFileStub.returns(JSON.stringify({
        seqNo: todoistResponse.seq_no,
        tasks: {
          44444444: {
            habitrpg: {id: "44444445"},
            todoist: historyTodoist.items[0]
          }
        }
      }));
      syncTodoistStub.returns(Promise.resolve(modifiedTodoistResp));

      return sync.run().then(() => {
        expect(habiticaStub.put).to.have.been.called;
        expect(habiticaStub.put).to.have.been.calledWithMatch("44444445", taskGenerator(modifiedTodoistResp.items[0]));
        expect(writeFileStub).to.have.been.called;
        Promise.resolve();
      });
    });

    it('should save an updated history to file')

    it('should delete the task on habitrpg when it is deleted from todolist', () => {
      habiticaStub.del.returns(Promise.resolve())
      var modifiedTodoistResp = _.cloneDeep(todoistResponse);
      modifiedTodoistResp.items[0].is_deleted = true;
      readFileStub.returns(JSON.stringify({
        seqNo: todoistResponse.seq_no,
        tasks: {
          44444444: {
            habitrpg: {id: "44444445"},
            todoist: todoistResponse.items[0]
          }
        }
      }));
      syncTodoistStub.returns(Promise.resolve(modifiedTodoistResp));

      return sync.run().then(() => {
        expect(habiticaStub.del).to.have.been.called;
        expect(habiticaStub.put).to.have.not.been.called;
        expect(habiticaStub.post).to.have.not.been.called;
        expect(habiticaStub.del).to.have.been.calledWith('/tasks/44444445');
        expect(writeFileStub).to.have.been.called;
        Promise.resolve();
      });
    });

    it('should not try to delete a task on habitrpg that wasn\'t synced yet', () => {
      var modifiedTodoistResp = _.cloneDeep(todoistResponse);
      modifiedTodoistResp.items[0].is_deleted = true;
      readFileStub.returns(JSON.stringify({
        seqNo: todoistResponse.seq_no,
        tasks: {}
      }));
      syncTodoistStub.returns(Promise.resolve(modifiedTodoistResp));

      return sync.run().then(() => {
        expect(habiticaStub.del).to.have.not.been.called;
        expect(habiticaStub.put).to.have.not.been.called;
        expect(habiticaStub.post).to.have.not.been.called;
        expect(writeFileStub).to.have.been.called;
        Promise.resolve();
      });
    });

    it('should should correctly parse all habit attribute labels from todoist', () => {
      const result = sync.mapLabels(todoistLabelResponse);
      expect(result[todoistLabelResponse.str.id]).to.equal('strength');
      expect(result[todoistLabelResponse.strength.id]).to.equal('strength');
      expect(result[todoistLabelResponse.physical.id]).to.equal('strength');
      expect(result[todoistLabelResponse.phy.id]).to.equal('strength');

      expect(result[todoistLabelResponse.int.id]).to.equal('intelligence');
      expect(result[todoistLabelResponse.intelligence.id]).to.equal('intelligence');
      expect(result[todoistLabelResponse.mental.id]).to.equal('intelligence');
      expect(result[todoistLabelResponse.men.id]).to.equal('intelligence');

      expect(result[todoistLabelResponse.con.id]).to.equal('constitution');
      expect(result[todoistLabelResponse.constitution.id]).to.equal('constitution');
      expect(result[todoistLabelResponse.social.id]).to.equal('constitution');
      expect(result[todoistLabelResponse.soc.id]).to.equal('constitution');

      expect(result[todoistLabelResponse.per.id]).to.equal('perception');
      expect(result[todoistLabelResponse.perception.id]).to.equal('perception');
      expect(result[todoistLabelResponse.other.id]).to.equal('perception');
      expect(result[todoistLabelResponse.oth.id]).to.equal('perception');
    });

    it('should not uncheck a daily on habitrpg just because an attribute was changed on todoist', () => {
      var modifiedTodoistResp = _.cloneDeep(todoistResponse);
      modifiedTodoistResp.items[0].content = "Getting there";
      modifiedTodoistResp.items[0].date_string = "every day";
      modifiedTodoistResp.items[0].checked = false;
      var dueDate = new Date().toString();
      modifiedTodoistResp.items[0].due_date_utc = dueDate;

      var historicalTask = {
        id: "44444444",
        completed: true,
        date: dueDate
      };

      readFileStub.returns(JSON.stringify({
        seqNo: todoistResponse.seq_no,
        tasks: {
          44444444: {
            habitrpg: historicalTask,
            todoist: todoistResponse.items[0]
          }
        }
      }));
      syncTodoistStub.returns(Promise.resolve(modifiedTodoistResp));

      var expectedTask = taskGenerator(modifiedTodoistResp.items[0]);
      expectedTask.type = "daily";
      expectedTask.repeat = {f: true, m: true, s: true, su: true, t: true, th: true, w: true};
      expectedTask.completed = true;

      return sync.run().then(() => {
        expect(habiticaStub.put).to.have.been.calledWithMatch('/tasks/44444444', expectedTask);
        expect(writeFileStub).to.have.been.called;
        Promise.resolve();
      });
    });

  });
  context('loadSavedHistorySync', () => {
    let existsSyncStub, readFileSyncStub;
    before(() => {
      existsSyncStub = sinon.stub(fs, 'existsSync');
      readFileSyncStub = sinon.stub(fs, 'readFileSync');
    });
    afterEach(() => {
      existsSyncStub.reset();
      readFileSyncStub.reset();
    });
    after(() => {
      existsSyncStub.restore();
      readFileSyncStub.restore();
    });
    it('returns an object if no history is found', () => {
      existsSyncStub.returns(false);
      expect(JSON.stringify(sync.loadSavedHistorySync())).to.equal(JSON.stringify({tasks: {}}))
    });
    it('parses the history file', () => {
      existsSyncStub.returns(true);
      const history = JSON.stringify({
        seqNo: todoistResponse.seq_no,
        tasks: {
          44444444: {
            habitrpg: {id: "44444444"},
            todoist: todoistResponse.items[0]
          }
        }
      });
      readFileSyncStub.returns(history);
      expect(JSON.stringify(sync.loadSavedHistorySync())).to.equal(history);
    });
    it('resets the history if it can\'t read it', () => {
      existsSyncStub.returns(true);
      readFileSyncStub.returns('I am a corrupted file');
      expect(JSON.stringify(sync.loadSavedHistorySync())).to.equal(JSON.stringify({tasks: {}}))
    });
  });
  context('saveHistory', () => {
    let writeFileStub;
    before(() => {
      writeFileStub = sinon.stub(fs, 'writeFile');
    });
    beforeEach(() => {
      writeFileStub.yields();
    })
    afterEach(() => {
      writeFileStub.reset();
    });
    after(() => {
      writeFileStub.restore();
    });

    it('writes the history', () => {
      const history = {foo: 'bar'};
      return sync.saveHistory(history).then(() => {
        expect(writeFileStub).to.be.calledWith(sync.historyPath, JSON.stringify(history));
      });
    });
    it('handles write errors', () => {
      const history = {foo: 'bar'};
      const myErr = new Error('Something bad happened');
      writeFileStub.yields(myErr);

      return sync.saveHistory(history).then(() => {
        return Promise.reject();
      }).catch((err) => {
        expect(err).to.equal(myErr);
        return Promise.resolve();
      });
    });
  });
  context('syncTodoist', () => {
    it('syncTodoist Placeholder')
  });

  context('taskNeedsUpdating', () => {
    const tests = [
      {name: 'is new task', newTask: {id: 1}, oldTask: undefined, expected: true},
      {name: 'has changed labels', newTask: {labels: 'alice'}, oldTask: {labels: 'bob'}, expected: true},
      {name: 'has changed content', newTask: {content: 'alice'}, oldTask: {content: 'bob'}, expected: true},
      {name: 'has changed checked', newTask: {checked: true}, oldTask: {checked: false}, expected: true},
      {name: 'has changed checked', newTask: {checked: true}, oldTask: {checked: false}, expected: true},
      {name: 'has changed is_deleted', newTask: {is_deleted: new Date()}, oldTask: {is_deleted: new Date('1/1/1970')}, expected: true},
      {name: 'are the same', newTask: {content: 'Hello'}, oldTask: {content: 'Hello'}, expected: false},
    ];

    tests.map((test) =>
      it(test.name, () =>
        expect(sync.taskNeedsUpdating(test.newTask, test.oldTask)).to.equal(test.expected)
      )
    );
  });

  context('prepareTask', () => {

  });
  context('parseTodoistRepeatingDate', () => {
    const tests = [
      {
        name: 'parses due dates as a todo',
        input: 'Nov 20',
        output: {
          type: 'todo',
          repeat: undefined,
        },
      },
      {
        name: 'parses todos with no due date as a todo',
        input: '',
        output: {
          type: 'todo',
          repeat: undefined,
        },
      },
      {
        input: 'daily',
        output: {
          type: 'daily',
          repeat: {su: true, m: true, t: true, w: true, th: true, f: true, s: true},
        },
      },
      {
        input: 'every day',
        output: {
          type: 'daily',
          repeat: {su: true, m: true, t: true, w: true, th: true, f: true, s: true},
        },
      },
      {
        input: 'every night',
        output: {
          type: 'daily',
          repeat: {su: true, m: true, t: true, w: true, th: true, f: true, s: true},
        },
      },
      {
        input: 'every sunday',
        output: {
          type: 'daily',
          repeat: {su: true, m: false, t: false, w: false, th: false, f: false, s: false},
        },
      },
      {
        input: 'every s',
        output: {
          type: 'daily',
          repeat: {su: true, m: false, t: false, w: false, th: false, f: false, s: false},
        },
      },
      {
        input: 'every monday',
        output: {
          type: 'daily',
          repeat: {su: false, m: true, t: false, w: false, th: false, f: false, s: false},
        },
      },
      {
        input: 'every m',
        output: {
          type: 'daily',
          repeat: {su: false, m: true, t: false, w: false, th: false, f: false, s: false},
        },
      },
      {
        input: 'every tuesday',
        output: {
          type: 'daily',
          repeat: {su: false, m: false, t: true, w: false, th: false, f: false, s: false},
        },
      },
      {
        input: 'every t',
        output: {
          type: 'daily',
          repeat: {su: false, m: false, t: true, w: false, th: false, f: false, s: false},
        },
      },
      {
        input: 'every wednesday',
        output: {
          type: 'daily',
          repeat: {su: false, m: false, t: false, w: true, th: false, f: false, s: false},
        },
      },
      {
        input: 'every w',
        output: {
          type: 'daily',
          repeat: {su: false, m: false, t: false, w: true, th: false, f: false, s: false},
        },
      },
      {
        input: 'every thursday',
        output: {
          type: 'daily',
          repeat: {su: false, m: false, t: false, w: false, th: true, f: false, s: false},
        },
      },
      {
        input: 'every th',
        output: {
          type: 'daily',
          repeat: {su: false, m: false, t: false, w: false, th: true, f: false, s: false},
        },
      },
      {
        input: 'every friday',
        output: {
          type: 'daily',
          repeat: {su: false, m: false, t: false, w: false, th: false, f: true, s: false},
        },
      },
      {
        input: 'every f',
        output: {
          type: 'daily',
          repeat: {su: false, m: false, t: false, w: false, th: false, f: true, s: false},
        },
      },
      {
        input: 'every saturday',
        output: {
          type: 'daily',
          repeat: {su: false, m: false, t: false, w: false, th: false, f: false, s: true},
        },
      },
      {
        input: 'every sa',
        output: {
          type: 'daily',
          repeat: {su: false, m: false, t: false, w: false, th: false, f: false, s: true},
        },
      },
      {
        input: 'every weekday',
        output: {
          type: 'daily',
          repeat: {su: false, m: true, t: true, w: true, th: true, f: true, s: false},
        },
      },
      {
        input: 'every weekend',
        output: {
          type: 'daily',
          repeat: {su: true, m: false, t: false, w: false, th: false, f: false, s: true},
        },
      },
      {
        input: 'every mon,weds,fri',
        output: {
          type: 'daily',
          repeat: {su: false, m: true, t: false, w: true, th: false, f: true, s: false},
        },
      },
      {
        input: 'today',
        output: {
          type: 'todo',
          repeat: undefined,
        },
      },
      {
        input: 'tomorrow',
        output: {
          type: 'todo',
          repeat: undefined,
        },
      },
      {
        input: 'friday',
        output: {
          type: 'todo',
          repeat: undefined,
        },
      },
      {
        input: 'next friday',
        output: {
          type: 'todo',
          repeat: undefined,
        },
      },
      {
        input: 'tom at 16:30',
        output: {
          type: 'todo',
          repeat: undefined,
        },
      },
      {
        input: 'fri at 2pm',
        output: {
          type: 'todo',
          repeat: undefined,
        },
      },
      {
        input: 'every mon, fri at 20:00',
        output: {
          type: 'daily',
          repeat: {su: false, m: true, t: false, w: false, th: false, f: true, s: false},
        },
      },
      {
        input: 'ev day at 1pm',
        output: {
          type: 'daily',
          repeat: {su: true, m: true, t: true, w: true, th: true, f: true, s: true},
        },
      },
      // --------------------------------------------------
      // Date strings that Todoist considers as repeating,
      // but this sync currently doesn't.
      // --------------------------------------------------
      {
        input: 'ev 7',
        output: {
          type: 'todo',
          repeat: undefined,
        },
      },
      {
        input: 'ev 7th day in a month',
        output: {
          type: 'todo',
          repeat: undefined,
        },
      },
      {
        input: 'ev 7 may',
        output: {
          type: 'todo',
          repeat: undefined,
        },
      },
      {
        input: 'ev 3 days starting next monday',
        output: {
          type: 'todo',
          repeat: undefined,
        },
      },
      {
        input: 'every day at 14:30 starting 1 Jan',
        output: {
          type: 'todo',
          repeat: undefined,
        },
      },
      {
        input: 'every 13 may',
        output: {
          type: 'todo',
          repeat: undefined,
        },
      },
      {
        input: 'every last day',
        output: {
          type: 'todo',
          repeat: undefined,
        },
      },
      {
        input: 'every 2nd monday',
        output: {
          type: 'todo',
          repeat: undefined,
        },
      },
    ];

    tests.map(test =>
      it(`parses ${test.input} correctly`, () =>
        expect(sync.parseTodoistRepeatingDate(test.input)).to.deep.equal(test.output)
      )
    );
  });
});

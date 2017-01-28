const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = require('chai').expect;
const path = require('path');
const chai = require('chai');
const fs = require('fs');
const _ = require('lodash');
const thrpg = require('../habitSync_new.js');

chai.use(expect);
chai.use(sinonChai);

describe('todoist-habitrpg', function (done) {
  var fakeOptions = {uid: 1, token: 2, todoist: 3};
  var todoistResponse = {
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
  var todoistLabelResponse = {
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
    }};

  var sync,
      readHistoryFromFileStub,
      writeFileSyncStub,
      getTodoistSyncStub,
      syncItemsToHabitRpgSpy,
      habitapiStub,
      requestStub;
  var taskGenerator = function(todoistItem) {
    return {
      text: todoistItem.content,
      dateCreated: new Date(todoistItem.date_added),
      date: new Date(todoistItem.due_date_utc),
      type: 'todo',
      completed: todoistItem.checked == true,
      repeat: undefined
    };
  };

  before(function() {
    sync = new thrpg(fakeOptions);
    readHistoryFromFileStub = sinon.stub(sync, 'readHistoryFromFile');
    writeFileSyncStub = sinon.stub(fs, 'writeFileSync');
    getTodoistSyncStub = sinon.stub(sync, 'getTodoistSync');
    syncItemsToHabitRpgSpy = sinon.spy(sync, 'syncItemsToHabitRpg');
    habitapiStub = sinon.stub(habitapi.prototype);
    habitapiStub.createTask.yields(null, {body: {type: 'todo'}});
    habitapiStub.updateTask.yields(null, {body: {type: 'todo'}});
    requestStub = sinon.stub(request.Request.prototype, 'end');
    // TODO: If we add another superagent call, this will need
    // to be improved to look at the URL.
    requestStub.yields(null, {body: todoistLabelResponse});
  });

  afterEach(function() {
    readHistoryFromFileStub.reset();
    writeFileSyncStub.reset();
    getTodoistSyncStub.reset();
    syncItemsToHabitRpgSpy.reset();
    habitapiStub.updateTask.reset();
    habitapiStub.createTask.reset();
    habitapiStub.deleteTask.reset();
    requestStub.reset();
  });

  after(function() {
    readHistoryFromFileStub.restore();
    writeFileSyncStub.restore();
    getTodoistSyncStub.restore();
    syncItemsToHabitRpgSpy.restore();
    // habitapiStub.restore();
  });

  it('should require certain options for instantiation', function() {
    expect(thrpg).to.throw(/Options are required/);
    expect(function(){thrpg({})}).to.throw(/No HabitRPG User Id found/);
    expect(function(){thrpg({uid: 1})}).to.throw(/No HabitRPG API Token found/);
    expect(function(){thrpg({uid: 1, token: 1})}).to.throw(/No Todoist API Token found/);
    var thrpgSync = new thrpg({uid: 1, token: 2, todoist: 3});
    expect(thrpgSync.uid).to.equal(1);
    expect(thrpgSync.token).to.equal(2);
    expect(thrpgSync.todoist).to.equal(3);
    expect(thrpgSync.historyPath).to.match(/\.todoist-habitrpg\.json/);
  });

  it('should send Todoist tasks to HabitRPG if there was no history file found', function(done) {
    readHistoryFromFileStub.returns({});
    getTodoistSyncStub.callsArgWith(0, null, {body: todoistResponse});

    sync.run(function() {
      expect(syncItemsToHabitRpgSpy).to.have.been.calledWith([{todoist: todoistResponse.items[0]}]);
      expect(habitapiStub.updateTask).to.not.have.been.called;
      expect(habitapiStub.createTask).to.have.have.been.calledWith(taskGenerator(todoistResponse.items[0]));
      expect(habitapiStub.createTask.lastCall.args[0].dateCompleted).to.be.empty;
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should send new completed Todoist tasks to HabitRPG with a dateCompleted', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse);
    modifiedTodoistResp.items[0].checked = true;

    readHistoryFromFileStub.returns({});
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});

    sync.run(function() {
      expect(syncItemsToHabitRpgSpy).to.have.been.calledWith([{todoist: modifiedTodoistResp.items[0]}]);
      expect(habitapiStub.updateTask).to.not.have.been.called;
      expect(habitapiStub.createTask).to.have.have.been.calledWithMatch(taskGenerator(modifiedTodoistResp.items[0]));
      expect(habitapiStub.createTask.lastCall.args[0].dateCompleted).to.be.exist;
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should not update tasks that havent changed since the last sync', function(done) {
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {id: "44444444"},
          todoist: todoistResponse.items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: todoistResponse});

    sync.run(function() {
      expect(syncItemsToHabitRpgSpy).to.have.been.calledWith([]);
      expect(habitapiStub.updateTask).to.not.have.been.called;
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should update tasks that have changed content', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse);
    modifiedTodoistResp.items[0].content = "Getting there";
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {id: "44444444"},
          todoist: todoistResponse.items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});

    sync.run(function() {
      expect(syncItemsToHabitRpgSpy).to.have.been.calledWith([{habitrpg: {id: "44444444"}, todoist: modifiedTodoistResp.items[0]}]);
      expect(habitapiStub.updateTask).to.have.been.calledWithMatch("44444444", taskGenerator(modifiedTodoistResp.items[0]));
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should update tasks that have changed their checked state', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse);
    modifiedTodoistResp.items[0].checked = true;
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {id: "44444444", completed: false},
          todoist: todoistResponse.items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});
    sync.run(function() {
      expect(syncItemsToHabitRpgSpy).to.have.been.calledWith([{habitrpg: {id: "44444444", completed: false}, todoist: modifiedTodoistResp.items[0]}]);
      expect(habitapiStub.updateTaskScore).to.have.been.calledWithMatch("44444444", true);
      expect(habitapiStub.updateTask).to.have.been.calledWithMatch("44444444", taskGenerator(modifiedTodoistResp.items[0]));
      expect(habitapiStub.updateTask.lastCall.args[1].dateCompleted).to.exist;
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should remove dateCompleted form todos that have unchecked their state', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse);
    modifiedTodoistResp.items[0].checked = false;

    var historyTodoistResp = _.cloneDeep(todoistResponse).items[0];
    historyTodoistResp.checked = true;
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {id: "44444444", completed: true},
          todoist: historyTodoistResp
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});
    sync.run(function() {
      expect(syncItemsToHabitRpgSpy).to.have.been.calledWith([{habitrpg: {id: "44444444", completed: true}, todoist: modifiedTodoistResp.items[0]}]);
      expect(habitapiStub.updateTaskScore).to.have.been.calledWithMatch("44444444", true);
      expect(habitapiStub.updateTask).to.have.been.calledWithMatch("44444444", taskGenerator(modifiedTodoistResp.items[0]));
      expect(habitapiStub.updateTask.lastCall.args[1].dateCompleted).to.be.empty;
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should update tasks that have been completed before being synced', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse);
    modifiedTodoistResp.items[0].checked = true;
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {id: "44444444"},
          todoist: todoistResponse.items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});
    sync.run(function() {
      expect(syncItemsToHabitRpgSpy).to.have.been.calledWith([{habitrpg: {id: "44444444"}, todoist: modifiedTodoistResp.items[0]}]);
      expect(habitapiStub.updateTaskScore).to.have.been.calledWithMatch("44444444", true);
      expect(habitapiStub.updateTask).to.have.been.calledWithMatch("44444444", taskGenerator(modifiedTodoistResp.items[0]));
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should recreate a task if it has habitrpg history, but not habitrpg id', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse);
    modifiedTodoistResp.items[0].content = "Getting there";
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {attribute: 'str'},
          todoist: todoistResponse.items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});

    sync.run(function() {
      expect(syncItemsToHabitRpgSpy).to.have.been.calledWith([{habitrpg: {attribute: 'str'}, todoist: modifiedTodoistResp.items[0]}]);
      expect(habitapiStub.updateTask).to.not.have.been.called;
      expect(habitapiStub.createTask).to.have.been.called;
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should process tasks without a date string', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse);
    modifiedTodoistResp.items[0].due_date_utc = "Sat 06 Sep 2014 05:59:59 +0000";
    modifiedTodoistResp.items[0].date_string = undefined;
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {id: "44444444"},
          todoist: todoistResponse.items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});

    sync.run(function() {
      expect(syncItemsToHabitRpgSpy).to.have.been.calledWith([{habitrpg: {id: "44444444"}, todoist: modifiedTodoistResp.items[0]}]);
      expect(habitapiStub.updateTask).to.have.been.called;
      expect(habitapiStub.updateTask).to.have.been.calledWithMatch("44444444", taskGenerator(modifiedTodoistResp.items[0]));
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should update tasks that have changed due dates', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse);
    modifiedTodoistResp.items[0].due_date_utc = "Sat 06 Sep 2014 05:59:59 +0000";
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {id: "44444444"},
          todoist: todoistResponse.items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});

    sync.run(function() {
      expect(syncItemsToHabitRpgSpy).to.have.been.calledWith([{habitrpg: {id: "44444444"}, todoist: modifiedTodoistResp.items[0]}]);
      expect(habitapiStub.updateTask).to.have.been.called;
      expect(habitapiStub.updateTask).to.have.been.calledWithMatch("44444444", taskGenerator(modifiedTodoistResp.items[0]));
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should be able to add a label to a task', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse);
    modifiedTodoistResp.items[0].labels = [todoistLabelResponse.str.id];
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {id: "44444445"},
          todoist: todoistResponse.items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});

    sync.run(function() {
      expect(habitapiStub.updateTask).to.have.been.called;
      expect(habitapiStub.updateTask).to.have.been.calledWithMatch("44444445", taskGenerator(modifiedTodoistResp.items[0]));
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should be able to change a task\'s label', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse);
    var historyTodoist = _.cloneDeep(todoistResponse);
    modifiedTodoistResp.items[0].labels = [todoistLabelResponse.str.id];
    historyTodoist.items[0].labels = [todoistLabelResponse.per.id];
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {id: "44444445"},
          todoist: historyTodoist.items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});

    sync.run(function() {
      expect(habitapiStub.updateTask).to.have.been.called;
      expect(habitapiStub.updateTask).to.have.been.calledWithMatch("44444445", taskGenerator(modifiedTodoistResp.items[0]));
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should save an updated history to file')

  it('should delete the task on habitrpg when it is deleted from todolist', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse);
    modifiedTodoistResp.items[0].is_deleted = true;
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {id: "44444445"},
          todoist: todoistResponse.items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});

    sync.run(function() {
      expect(habitapiStub.deleteTask).to.have.been.called;
      expect(habitapiStub.updateTask).to.have.not.been.called;
      expect(habitapiStub.createTask).to.have.not.been.called;
      expect(habitapiStub.deleteTask).to.have.been.calledWithMatch(44444445);
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should not try to delete a task on habitrpg that wasn\'t synced yet', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse);
    modifiedTodoistResp.items[0].is_deleted = true;
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});

    sync.run(function() {
      expect(habitapiStub.deleteTask).to.have.not.been.called;
      expect(habitapiStub.updateTask).to.have.not.been.called;
      expect(habitapiStub.createTask).to.have.not.been.called;
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should should correctly parse all habit attribute labels from todoist', function(done) {
    sync.getHabitAttributeIds(function(error, attributes) {
      expect(attributes.str).to.contain(todoistLabelResponse.str.id);
      expect(attributes.str).to.contain(todoistLabelResponse.strength.id);
      expect(attributes.str).to.contain(todoistLabelResponse.physical.id);
      expect(attributes.str).to.contain(todoistLabelResponse.phy.id);
      expect(attributes.int).to.contain(todoistLabelResponse.int.id);
      expect(attributes.int).to.contain(todoistLabelResponse.intelligence.id);
      expect(attributes.int).to.contain(todoistLabelResponse.mental.id);
      expect(attributes.int).to.contain(todoistLabelResponse.men.id);
      expect(attributes.con).to.contain(todoistLabelResponse.con.id);
      expect(attributes.con).to.contain(todoistLabelResponse.constitution.id);
      expect(attributes.con).to.contain(todoistLabelResponse.social.id);
      expect(attributes.con).to.contain(todoistLabelResponse.soc.id);
      expect(attributes.per).to.contain(todoistLabelResponse.per.id);
      expect(attributes.per).to.contain(todoistLabelResponse.perception.id);
      expect(attributes.per).to.contain(todoistLabelResponse.other.id);
      expect(attributes.per).to.contain(todoistLabelResponse.oth.id);
      done();
    });
  });

  it('should not uncheck a daily on habitrpg just because an attribute was changed on todoist', function(done) {
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

    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: historicalTask,
          todoist: todoistResponse.items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});

    var expectedTask = taskGenerator(modifiedTodoistResp.items[0]);
    expectedTask.type = "daily";
    expectedTask.repeat = { f: true, m: true, s: true, su: true, t: true, th: true, w: true };
    expectedTask.completed = true;

    sync.run(function() {
      expect(syncItemsToHabitRpgSpy).to.have.been.calledWith([{habitrpg: historicalTask, todoist: modifiedTodoistResp.items[0]}]);
      expect(habitapiStub.updateTask).to.have.been.calledWithMatch("44444444", expectedTask);
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  describe('Todoist date_string parsing', function() {
    it('should parse due dates as a todo', function() {
      var actual = sync.parseTodoistRepeatingDate('Nov 20');
      expect(actual.type).to.equal('todo');
      expect(actual.repeat).to.be.undefined;
    });

    it('should parse todos with no due date as a todo', function() {
      var actual = sync.parseTodoistRepeatingDate('');
      expect(actual.type).to.equal('todo');
      expect(actual.repeat).to.be.undefined;
    });

    it('should parse todos with "daily" date as a daily', function() {
      var actual = sync.parseTodoistRepeatingDate('daily');
      expect(actual.type).to.equal('daily');
      expect(actual.repeat).to.deep.equal({su: true, m: true, t: true, w: true, th: true, f: true, s: true});
    });

    it('should parse todos with "every day" date as a daily', function() {
      var actual = sync.parseTodoistRepeatingDate('every day');
      expect(actual.type).to.equal('daily');
      expect(actual.repeat).to.deep.equal({su: true, m: true, t: true, w: true, th: true, f: true, s: true});
    });

    it('should parse todos with "every night" date as a daily', function() {
      var actual = sync.parseTodoistRepeatingDate('every night');
      expect(actual.type).to.equal('daily');
      expect(actual.repeat).to.deep.equal({su: true, m: true, t: true, w: true, th: true, f: true, s: true});
    });

    it('should parse tasks that repeat one day a week', function() {
      var actual = sync.parseTodoistRepeatingDate('every sunday');
      expect(actual.type, 'Sunday').to.equal('daily');
      expect(actual.repeat, 'Sunday').to.deep.equal({su: true, m: false, t: false, w: false, th: false, f: false, s: false});

      actual = sync.parseTodoistRepeatingDate('every s');
      expect(actual.type, 'S').to.equal('daily');
      expect(actual.repeat, 'S').to.deep.equal({su: true, m: false, t: false, w: false, th: false, f: false, s: false});

      actual = sync.parseTodoistRepeatingDate('every monday');
      expect(actual.type, 'Monday').to.equal('daily');
      expect(actual.repeat, 'Monday').to.deep.equal({su: false, m: true, t: false, w: false, th: false, f: false, s: false});

      actual = sync.parseTodoistRepeatingDate('every m');
      expect(actual.type, 'M').to.equal('daily');
      expect(actual.repeat, 'M').to.deep.equal({su: false, m: true, t: false, w: false, th: false, f: false, s: false});

      actual = sync.parseTodoistRepeatingDate('every tuesday');
      expect(actual.type, 'Tuesday').to.equal('daily');
      expect(actual.repeat, 'Tuesday').to.deep.equal({su: false, m: false, t: true, w: false, th: false, f: false, s: false});

      actual = sync.parseTodoistRepeatingDate('every t');
      expect(actual.type, 'T').to.equal('daily');
      expect(actual.repeat, 'T').to.deep.equal({su: false, m: false, t: true, w: false, th: false, f: false, s: false});

      actual = sync.parseTodoistRepeatingDate('every wednesday');
      expect(actual.type, 'Wednesday').to.equal('daily');
      expect(actual.repeat, 'Wednesday').to.deep.equal({su: false, m: false, t: false, w: true, th: false, f: false, s: false});

      actual = sync.parseTodoistRepeatingDate('every w');
      expect(actual.type, 'W').to.equal('daily');
      expect(actual.repeat, 'W').to.deep.equal({su: false, m: false, t: false, w: true, th: false, f: false, s: false});

      actual = sync.parseTodoistRepeatingDate('every thursday');
      expect(actual.type, 'Thursday').to.equal('daily');
      expect(actual.repeat, 'Thursday').to.deep.equal({su: false, m: false, t: false, w: false, th: true, f: false, s: false});

      actual = sync.parseTodoistRepeatingDate('every th');
      expect(actual.type, 'Th').to.equal('daily');
      expect(actual.repeat, 'Th').to.deep.equal({su: false, m: false, t: false, w: false, th: true, f: false, s: false});

      actual = sync.parseTodoistRepeatingDate('every friday');
      expect(actual.type, 'Friday').to.equal('daily');
      expect(actual.repeat, 'Friday').to.deep.equal({su: false, m: false, t: false, w: false, th: false, f: true, s: false});

      actual = sync.parseTodoistRepeatingDate('every f');
      expect(actual.type, 'F').to.equal('daily');
      expect(actual.repeat, 'F').to.deep.equal({su: false, m: false, t: false, w: false, th: false, f: true, s: false});

      actual = sync.parseTodoistRepeatingDate('every saturday');
      expect(actual.type, 'Saturday').to.equal('daily');
      expect(actual.repeat, 'Saturday').to.deep.equal({su: false, m: false, t: false, w: false, th: false, f: false, s: true});

      actual = sync.parseTodoistRepeatingDate('every sa');
      expect(actual.type, 'Sa').to.equal('daily');
      expect(actual.repeat, 'Sa').to.deep.equal({su: false, m: false, t: false, w: false, th: false, f: false, s: true});
    });

    it('should parse weekday tasks as a daily that repeats M-F', function() {
      var actual = sync.parseTodoistRepeatingDate('every weekday');
      expect(actual.type, 'Weekday').to.equal('daily');
      expect(actual.repeat, 'Weekday').to.deep.equal({su: false, m: true, t: true, w: true, th: true, f: true, s: false});
    });

    it('should parse weekened tasks as a daily that repeats Sat and Sun', function() {
      var actual = sync.parseTodoistRepeatingDate('every weekend');
      expect(actual.type, 'Weekend').to.equal('daily');
      expect(actual.repeat, 'Weekend').to.deep.equal({su: true, m: false, t: false, w: false, th: false, f: false, s: true});
    });

    it('should parse tasks that repeat multiple days a week', function() {
      var actual = sync.parseTodoistRepeatingDate('every mon,weds,fri');
      expect(actual.type, 'Mon,Weds,Fri').to.equal('daily');
      expect(actual.repeat, 'Mon,Weds,Fri').to.deep.equal({su: false, m: true, t: false, w: true, th: false, f: true, s: false});
    });

    it('should correctly parse the examples Todoist gives', function() {
      var actual = sync.parseTodoistRepeatingDate('today');
      expect(actual.type, 'Today').to.equal('todo');
      expect(actual.repeat, 'Today').to.be.undefined;

      actual = sync.parseTodoistRepeatingDate('tomorrow');
      expect(actual.type, 'Tomorrow').to.equal('todo');
      expect(actual.repeat, 'Tomorrow').to.be.undefined;

      actual = sync.parseTodoistRepeatingDate('friday');
      expect(actual.type, 'Friday').to.equal('todo');
      expect(actual.repeat, 'Friday').to.be.undefined;

      actual = sync.parseTodoistRepeatingDate('next friday');
      expect(actual.type, 'Next Friday').to.equal('todo');
      expect(actual.repeat, 'Next Friday').to.be.undefined;

      actual = sync.parseTodoistRepeatingDate('tom at 16:30');
      expect(actual.type, 'Tom at 16:30').to.equal('todo');
      expect(actual.repeat, 'Tom at 16:30').to.be.undefined;

      actual = sync.parseTodoistRepeatingDate('fri at 2pm');
      expect(actual.type, 'Fri at 2pm').to.equal('todo');
      expect(actual.repeat, 'Fri at 2pm').to.be.undefined;

      actual = sync.parseTodoistRepeatingDate('every mon, fri at 20:00');
      expect(actual.type, 'every mon, fri at 20:00').to.equal('daily');
      expect(actual.repeat, 'every mon, fri at 20:00').to.deep.equal({su: false, m: true, t: false, w: false, th: false, f: true, s: false});

      actual = sync.parseTodoistRepeatingDate('ev day at 1pm');
      expect(actual.type, 'ev day at 1pm').to.equal('daily');
      expect(actual.repeat, 'ev day at 1pm').to.deep.equal({su: true, m: true, t: true, w: true, th: true, f: true, s: true});

      // --------------------------------------------------
      // Date strings that Todoist considers as repeating,
      // but this sync currently doesn't.
      // --------------------------------------------------

      // every 7th day in a month
      actual = sync.parseTodoistRepeatingDate('ev 7');
      expect(actual.type, 'ev 7').to.equal('todo');
      expect(actual.repeat, 'ev 7').to.undefined;

      actual = sync.parseTodoistRepeatingDate('every 7th day in a month');
      expect(actual.type, 'every 7th day in a month').to.equal('todo');
      expect(actual.repeat, 'every 7th day in a month').to.undefined;

      actual = sync.parseTodoistRepeatingDate('ev 7 may');
      expect(actual.type, 'ev 7 may').to.equal('todo');
      expect(actual.repeat, 'ev 7 may').to.undefined;

      actual = sync.parseTodoistRepeatingDate('ev 3 days starting next monday');
      expect(actual.type, 'ev 3 days starting next monday').to.equal('todo');
      expect(actual.repeat, 'ev 3 days starting next monday').to.undefined;

      actual = sync.parseTodoistRepeatingDate('every day at 14:30 starting 1 Jan');
      expect(actual.type, 'every day at 14:30 starting 1 Jan').to.equal('todo');
      expect(actual.repeat, 'every day at 14:30 starting 1 Jan').to.undefined;


      actual = sync.parseTodoistRepeatingDate('every 13 may');
      expect(actual.type, 'every 13 may').to.equal('todo');
      expect(actual.repeat, 'every 13 may').to.undefined;

      actual = sync.parseTodoistRepeatingDate('every last day');
      expect(actual.type, 'every last day').to.equal('todo');
      expect(actual.repeat, 'every last day').to.undefined;

      actual = sync.parseTodoistRepeatingDate('every 2nd monday');
      expect(actual.type, 'every 2nd monday').to.equal('todo');
      expect(actual.repeat, 'every 2nd monday').to.undefined;
    });
  });
});

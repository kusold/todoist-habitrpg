var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = require('chai').expect;
var path = require('path');
var chai = require('chai');
var fs = require('fs');
var _ = require('lodash');
var habitapi = require('habitrpg-api');
var thrpg = require('../habitSync.js');
var request = require('superagent');

chai.use(expect);
chai.use(sinonChai);

describe('todoist-habitrpg', function (done) {
  var fakeOptions = {uid: 1, token: 2, todoist: 3};
  var todoistResponse = {
    "seq_no": 5555555555,
    "Items": [{
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

  var sync = undefined;
  var readHistoryFromFileStub = undefined;
  var writeFileSyncStub = undefined;
  var getTodoistSyncStub = undefined;
  var syncItemsToHabitRpgSpy = undefined;
  var habitapiStub = undefined;
  var requestStub = undefined
  var taskGenerator = function(todoistItem) {
    return {
      text: todoistItem.content,
      dateCreated: new Date(todoistItem.date_added),
      date: new Date(todoistItem.due_date_utc),
      type: 'todo',
      completed: todoistItem.checked == true,
      repeat: undefined
    }
  }

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
  })

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
      expect(syncItemsToHabitRpgSpy).to.have.been.calledWith([{todoist: todoistResponse.Items[0]}])
      expect(habitapiStub.updateTask).to.not.have.been.called
      expect(habitapiStub.createTask).to.have.have.been.calledWith(taskGenerator(todoistResponse.Items[0]))
      expect(writeFileSyncStub).to.have.been.called
      done();
    });
  });

  it('should not update tasks that havent changed since the last sync', function(done) {
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {id: "44444444"},
          todoist: todoistResponse.Items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: todoistResponse});

    sync.run(function() {
      expect(syncItemsToHabitRpgSpy).to.have.been.calledWith([])
      expect(habitapiStub.updateTask).to.not.have.been.called
      expect(writeFileSyncStub).to.have.been.called
      done();
    });
  });

  it('should update tasks that have changed content', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse)
    modifiedTodoistResp.Items[0].content = "Getting there"
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {id: "44444444"},
          todoist: todoistResponse.Items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});

    sync.run(function() {
      expect(syncItemsToHabitRpgSpy).to.have.been.calledWith([{habitrpg: {id: "44444444"}, todoist: modifiedTodoistResp.Items[0]}]);
      expect(habitapiStub.updateTask).to.have.been.calledWithMatch("44444444", taskGenerator(modifiedTodoistResp.Items[0]))
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should update tasks that have changed their checked state', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse)
    modifiedTodoistResp.Items[0].checked = true
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {id: "44444444", completed: false},
          todoist: todoistResponse.Items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});
    sync.run(function() {
      expect(syncItemsToHabitRpgSpy).to.have.been.calledWith([{habitrpg: {id: "44444444", completed: false}, todoist: modifiedTodoistResp.Items[0]}]);
      expect(habitapiStub.updateTaskScore).to.have.been.calledWithMatch("44444444", true)
      expect(habitapiStub.updateTask).to.have.been.calledWithMatch("44444444", taskGenerator(modifiedTodoistResp.Items[0]))
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should update tasks that have been completed before being synced', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse)
    modifiedTodoistResp.Items[0].checked = true
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {id: "44444444"},
          todoist: todoistResponse.Items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});
    sync.run(function() {
      expect(syncItemsToHabitRpgSpy).to.have.been.calledWith([{habitrpg: {id: "44444444"}, todoist: modifiedTodoistResp.Items[0]}]);
      expect(habitapiStub.updateTaskScore).to.have.been.calledWithMatch("44444444", true)
      expect(habitapiStub.updateTask).to.have.been.calledWithMatch("44444444", taskGenerator(modifiedTodoistResp.Items[0]))
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should update tasks that have changed due dates', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse)
    modifiedTodoistResp.Items[0].due_date_utc = "Sat 06 Sep 2014 05:59:59 +0000"
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {id: "44444444"},
          todoist: todoistResponse.Items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});

    sync.run(function() {
      expect(syncItemsToHabitRpgSpy).to.have.been.calledWith([{habitrpg: {id: "44444444"}, todoist: modifiedTodoistResp.Items[0]}]);
      expect(habitapiStub.updateTask).to.have.been.called
      expect(habitapiStub.updateTask).to.have.been.calledWithMatch("44444444", taskGenerator(modifiedTodoistResp.Items[0]))
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should be able to add a label to a task', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse);
    modifiedTodoistResp.Items[0].labels = [todoistLabelResponse.str.id];
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {id: "44444445"},
          todoist: todoistResponse.Items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});

    sync.run(function() {
      expect(habitapiStub.updateTask).to.have.been.called
      expect(habitapiStub.updateTask).to.have.been.calledWithMatch("44444445", taskGenerator(modifiedTodoistResp.Items[0]))
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should be able to change a task\'s label', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse);
    var historyTodoist = _.cloneDeep(todoistResponse);
    modifiedTodoistResp.Items[0].labels = [todoistLabelResponse.str.id];
    historyTodoist.Items[0].labels = [todoistLabelResponse.per.id];
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {id: "44444445"},
          todoist: historyTodoist.Items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});

    sync.run(function() {
      expect(habitapiStub.updateTask).to.have.been.called
      expect(habitapiStub.updateTask).to.have.been.calledWithMatch("44444445", taskGenerator(modifiedTodoistResp.Items[0]))
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should save an updated history to file')

  it('should delete the task on habitrpg when it is deleted from todolist', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse)
    modifiedTodoistResp.Items[0].is_deleted = true
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {id: "44444445"},
          todoist: todoistResponse.Items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});

    sync.run(function() {
      expect(habitapiStub.deleteTask).to.have.been.called
      expect(habitapiStub.updateTask).to.have.not.been.called
      expect(habitapiStub.createTask).to.have.not.been.called
      expect(habitapiStub.deleteTask).to.have.been.calledWithMatch(44444445)
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should not try to delete a task on habitrpg that wasn\'t synced yet', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse)
    modifiedTodoistResp.Items[0].is_deleted = true
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});

    sync.run(function() {
      expect(habitapiStub.deleteTask).to.have.not.been.called
      expect(habitapiStub.updateTask).to.have.not.been.called
      expect(habitapiStub.createTask).to.have.not.been.called
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
    })
  })

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

    it('should parse todos with "every day" date as a daily', function() {
      var actual = sync.parseTodoistRepeatingDate('every day');
      expect(actual.type).to.equal('daily');
      expect(actual.repeat).to.deep.equal({su: true, m: true, t: true, w: true, th: true, f: true, s: true});
    });

    it('should identify tasks with a start date as a todo') // Double check here that this behaivor makes sense

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
    })

    it('should parse weekened tasks as a daily that repeats Sat and Sun', function() {
      var actual = sync.parseTodoistRepeatingDate('every weekend');
      expect(actual.type, 'Weekend').to.equal('daily');
      expect(actual.repeat, 'Weekend').to.deep.equal({su: true, m: false, t: false, w: false, th: false, f: false, s: true});
    })

    it('should parse tasks that repeat multiple days a week', function() {
      var actual = sync.parseTodoistRepeatingDate('every mon,weds,fri');
      expect(actual.type, 'Mon,Weds,Fri').to.equal('daily');
      expect(actual.repeat, 'Mon,Weds,Fri').to.deep.equal({su: false, m: true, t: false, w: true, th: false, f: true, s: false});
    })
  })
});

var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = require('chai').expect;
var path = require('path');
var chai = require('chai');
var fs = require('fs');
var _ = require('lodash');

var thrpg = require('../habitSync.js');

chai.use(expect);
chai.use(sinonChai);

describe('todoist-habitrpg', function (done) {
  var fakeOptions = {uid: 1, token: 2, todoist: 3};
  var todoistResponse = {
    "seq_no": 5555555555,
    "Items": [{
      "date_string": "",
      "checked": 1,
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
      "due_date": "Thu 04 Sep 2014 23:59:59",
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
  var sync = undefined;
  var readHistoryFromFileStub = undefined;
  var writeFileSyncStub = undefined;
  var getTodoistSyncStub = undefined;
  var syncItemsToHabitRpgStub = undefined;

  before(function() {
    sync = new thrpg(fakeOptions);
    readHistoryFromFileStub = sinon.stub(sync, 'readHistoryFromFile');
    writeFileSyncStub = sinon.stub(fs, 'writeFileSync');
    getTodoistSyncStub = sinon.stub(sync, 'getTodoistSync');
    syncItemsToHabitRpgStub = sinon.stub(sync, 'syncItemsToHabitRpg')
  });

  afterEach(function() {
    readHistoryFromFileStub.reset();
    writeFileSyncStub.reset();
    getTodoistSyncStub.reset();
    syncItemsToHabitRpgStub.reset();
  });

  after(function() {
    readHistoryFromFileStub.restore();
    writeFileSyncStub.restore();
    getTodoistSyncStub.restore();
    syncItemsToHabitRpgStub.restore();
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
    syncItemsToHabitRpgStub.callsArgWith(1, null, {fake: "newhistory"});

    sync.run(function() {
      expect(syncItemsToHabitRpgStub).to.have.been.calledWith([{todoist: todoistResponse.Items[0]}])
      expect(writeFileSyncStub).to.have.been.called
      done();
    });
  });

  it('should not update tasks that havent changed since the last sync', function(done) {
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {},
          todoist: todoistResponse.Items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: todoistResponse});
    syncItemsToHabitRpgStub.callsArgWith(1, null, {fake: "newhistory"});

    sync.run(function() {
      expect(syncItemsToHabitRpgStub).to.have.been.calledWith([])
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
          habitrpg: {},
          todoist: todoistResponse.Items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});
    syncItemsToHabitRpgStub.callsArgWith(1, null, {fake: "newhistory"});

    sync.run(function() {
      expect(syncItemsToHabitRpgStub).to.have.been.calledWith([{habitrpg: {}, todoist: modifiedTodoistResp.Items[0]}]);
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  });

  it('should update tasks that have changed checked state', function(done) {
    var modifiedTodoistResp = _.cloneDeep(todoistResponse)
    modifiedTodoistResp.Items[0].checked = false
    readHistoryFromFileStub.returns({
      seqNo: todoistResponse.seq_no,
      tasks: {
        44444444: {
          habitrpg: {},
          todoist: todoistResponse.Items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});
    syncItemsToHabitRpgStub.callsArgWith(1, null, {fake: "newhistory"});

    sync.run(function() {
      expect(syncItemsToHabitRpgStub).to.have.been.calledWith([{habitrpg: {}, todoist: modifiedTodoistResp.Items[0]}]);
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
          habitrpg: {},
          todoist: todoistResponse.Items[0]
        }
      }
    });
    getTodoistSyncStub.callsArgWith(0, null, {body: modifiedTodoistResp});
    syncItemsToHabitRpgStub.callsArgWith(1, null, {fake: "newhistory"});

    sync.run(function() {
      expect(syncItemsToHabitRpgStub).to.have.been.calledWith([{habitrpg: {}, todoist: modifiedTodoistResp.Items[0]}]);
      expect(writeFileSyncStub).to.have.been.called;
      done();
    });
  })

  it('should save an updated history to file')
});

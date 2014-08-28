var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = require('chai').expect;
var path = require('path');
var chai = require('chai');

var thrpg = require('../index.js');

chai.use(expect);
chai.use(sinonChai);

describe('Some tests for the functions in todoist-habitrpg', function () {
   describe('findTasksThatNeedUpdating()', function () {

      it('expect returned value to be an array if old history.tasks has no tasks', function () {
        var newH = {tasks: {first: {todoist: {id: 123, content: "A task", checked: false, due_date_utc: ""}}}};
        var oldH = {tasks: {}};
        var update = thrpg.findTasksThatNeedUpdating(newH, oldH);
        
        expect(update).to.be.an('array');
      });
   });
});

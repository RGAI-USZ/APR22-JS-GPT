

describe('adapter angular-scenario', function() {
describe('Test Results Reporter', function() {
var tc, model, passingSpec, failingSpec;

beforeEach(function () {
var stubRunner = {};
stubRunner.on = function(){};
model = new angular.scenario.ObjectModel(stubRunner);
passingSpec = new angular.scenario.ObjectModel.Spec('passId', 'Passing', ['Full', 'Passing']);
passingSpec.status = 'success';
passingSpec.duration = 15;
failingSpec = new angular.scenario.ObjectModel.Spec('failId', 'Failing', ['Full', 'Failing']);
failingSpec.status = 'error';
failingSpec.duration = 13;
failingSpec.line = '12';
failingSpec.error = new Error('Boooooo!!!');
failedStep = new angular.scenario.ObjectModel.Step('failing step');
failedStep.status = 'failure';
failingSpec.steps.push(failedStep);
tc = new Testacular(new MockSocket(), {});

registerResultListeners(model, tc);
});


it('should update number of tests in the beginning', function() {
spyOn(tc, 'info');
angular.scenario.Describe = {specId: 13};

model.emit('RunnerBegin');
expect(tc.info).toHaveBeenCalledWith({total: 13});
});


it('should handle passing tests', function() {
spyOn(tc, 'result').andCallFake(function(result) {
expect(result.id).toEqual(passingSpec.id);
expect(result.description).toEqual(passingSpec.name);
expect(result.suite).toEqual([passingSpec.fullDefinitionName]);
expect(result.success).toBe(true);
expect(result.skipped).toBe(false);
expect(result.log).toEqual([]);
expect(result.time).toBe(passingSpec.duration);
});

model.emit('SpecEnd', passingSpec);
expect(tc.result).toHaveBeenCalled();
});


it('should handle failing tests', function() {
spyOn(tc, 'result').andCallFake(function(result) {
expect(result.id).toEqual(failingSpec.id);
expect(result.description).toEqual(failingSpec.name);
expect(result.suite).toEqual([failingSpec.fullDefinitionName]);
expect(result.success).toBe(false);
expect(result.skipped).toBe(false);
expect(result.log).toEqual([failedStep.name, failingSpec.line + ': ' + failingSpec.error]);
expect(result.time).toBe(failingSpec.duration);
});

model.emit('SpecEnd', failingSpec);
expect(tc.result).toHaveBeenCalled();
});


it('should handle failure without line', function() {
failingSpec.line = undefined;

spyOn(tc, 'result').andCallFake(function(result) {
expect(result.id).toEqual(failingSpec.id);
expect(result.log).toEqual([failedStep.name, 'Error: Boooooo!!!']);
});

model.emit('SpecEnd', failingSpec);
expect(tc.result).toHaveBeenCalled();
});


it('should listen for finish', function() {
spyOn(tc, 'complete');

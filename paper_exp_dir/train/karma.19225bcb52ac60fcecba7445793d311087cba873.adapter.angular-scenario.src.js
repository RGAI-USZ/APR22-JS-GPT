
var createNgScenarioStartFn = function(tc, scenarioSetupAndRun) {

angular.scenario.output('testacular', function(context, runner, model) {
registerResultListeners(model, tc);
});

return function(config) {
scenarioSetupAndRun({scenario_output: 'testacular'});
};
};

var registerResultListeners = function(model, tc) {
var totalTests = 0, testsCompleted = 0;

var createFailedSpecLog = function(spec) {
var failedStep = findFailedStep(spec.steps);
return [
failedStep.name,
spec.line ? spec.line + ': ' + spec.error : spec.error
];
};

var findFailedStep = function(steps) {
var stepCount = steps.length;
for(var i=0; i<stepCount; i++) {
var step = steps[i];
if (step.status === 'failure') {
return step;
}
}
return null;
};

model.on('RunnerBegin', function() {
totalTests = angular.scenario.Describe.specId;
tc.info({total: totalTests});
});

model.on('SpecEnd', function(spec) {

var result = {
id: spec.id,
description: spec.name,
suite: [spec.fullDefinitionName],
success: spec.status === 'success',
skipped: false,
time: spec.duration,
log: []
};
if (spec.error) {
result.log = createFailedSpecLog(spec);
}
testsCompleted++;
tc.result(result);
});

model.on('RunnerEnd', function() {
var skippedTests = totalTests - testsCompleted;



for (var i = 0; i < skippedTests; i++) {
tc.result({
id: 'Skipped' + (i + 1),
description: 'Skipped' + (i + 1),
suite: [],
skipped: true,
time: 0,
log: []
});
}
tc.complete();
});
};

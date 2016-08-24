import Rx = require('@reactivex/rxjs');
//import * from 'es6-shim';
import * as chai from 'chai';
import * as sinon from 'sinon';
var expect = chai.expect;

import { ITempReader, MovingAverageTempReader } from './tempReader';
import { ITempSensor, Dht11TempSensor } from './tempSensor';
import { Thermostat } from './thermostat';
import { IThermostatConfiguration, ThermostatConfiguration, ThermostatMode, ITempSensorConfiguration, TempSensorConfiguration } from './configuration';
import { ITrigger, FurnaceTrigger, AcTrigger } from './trigger';
import { IThermostatEvent } from './thermostatEvent';

describe('Thermostat Unit Tests:', () => {

    let heatingRange: Array<number>;
    let coolingRange: Array<number>;

    let cfg: IThermostatConfiguration;
    let tempSensorCfg: ITempSensorConfiguration;
    let tempSensor: ITempSensor;
    let tempRdr: ITempReader;
    let thermostat: Thermostat;
    let furnaceTrigger: ITrigger;
    let acTrigger: ITrigger;

    let tickDelay = 2;
    let windowSize = 2;

    let clock: Sinon.SinonFakeTimers;

    function buildThermostat(mode: ThermostatMode): Thermostat {
        heatingRange = [55,75];
        coolingRange = [68,80];

        tempSensorCfg = new TempSensorConfiguration(tickDelay);
        cfg = new ThermostatConfiguration(heatingRange, coolingRange, ThermostatMode.Heating, 1, 2000, 5, tempSensorCfg, 5000);

        tempSensor = new Dht11TempSensor(tempSensorCfg);
        tempRdr = new MovingAverageTempReader(tempSensor, windowSize);
        furnaceTrigger = new FurnaceTrigger();
        acTrigger = new AcTrigger();
        thermostat = new Thermostat(cfg, tempRdr, furnaceTrigger, acTrigger);
        thermostat.setMode(mode);
        
        return thermostat;
    }

    function buildRunningThermostat(mode: ThermostatMode, autoStart: boolean = true): Rx.Observable<Thermostat> {
        let observable = Rx.Observable.create((observer: Rx.Observer<Thermostat>) => {
            buildThermostat(mode);

			thermostat.setTarget(70);

			let trigger = mode == ThermostatMode.Heating ? furnaceTrigger : acTrigger;
			sinon.stub(trigger, 'start', () => {
				observer.next(thermostat);
				observer.complete();
			});

			sinon.stub(tempSensor, 'pollSensor', () => {
				return thermostat.mode == ThermostatMode.Heating ? thermostat.target - 5 : thermostat.target + 5;
			});

			if(autoStart) {
				thermostat.start();
			}
        });
        
        return observable;
    }

    beforeEach(function() {
        buildThermostat(ThermostatMode.Heating);
    });

    afterEach(function(done) {
        if(clock) {
            clock.restore();
            clock = null;
        }

        //if it's still running, subscribe, stop it, and don't continue until it's completed
        //(this avoids cross-test bleeding of observable values)
        if(thermostat.isRunning()) {
            thermostat.eventStream.subscribe(
                () => {},
                () => {},
                () => { //completed
                    done();
                }
            );
            thermostat.stop();
        }
        else {
            done();
        }
    });

	describe('Thermostat initialization spec', () => {
		describe('creating new thermostat', () => {
			it('should default to safe values', (done) => {
				
				expect(thermostat.target).is.equals(heatingRange[0]);

				thermostat.setMode(ThermostatMode.Cooling);
				expect(thermostat.target).is.equals(coolingRange[1]);
				
				done();
			});
		});

		

		describe('setting target outside bounds', () => {
			it('should set to closest valid value', (done) => {
				thermostat.setTarget(heatingRange[0]-5); //set 5 under
				expect(thermostat.target).is.equals(heatingRange[0]);

				thermostat.setTarget(heatingRange[1]+5); //set 5 over
				expect(thermostat.target).is.equals(heatingRange[1]);
				
				done();
			});
		});
	});
    
    
	describe('furnace spec', () => {
		describe('temperature dropping below target', () => {
			it('should start furnace', (done) => {
				let temperatureValues = [71,70,69,68,67,66,65,64,63];
				thermostat.setTarget(70);

				sinon.stub(tempSensor, "pollSensor", function() {
					return temperatureValues.shift();
				});

				let startCalled: boolean = false;
				sinon.stub(furnaceTrigger, "start", function() {
					startCalled = true;
					done();
				});

				thermostat.start();
			});
		});

		describe('temperature staying above target', () => {
			it('should not start furnace', (done) => {
				let temperatureValues = [71,70,70,70,71,70,70,72,71];
				thermostat.setTarget(70);
				let startCalled: boolean = false;
				let finished: boolean = false;

				sinon.stub(tempSensor, "pollSensor", () => {
					if(temperatureValues.length > 0) {
						return temperatureValues.shift();
					}
					else if(!startCalled && !finished) {
						done();
						finished = true;
					}
					else {
						if(!finished) {
							done("furnace started when it shouldn't have");
							finished = true;
						}
					}
				});
				
				sinon.stub(furnaceTrigger, "start", function() {
					startCalled = true;
				});

				thermostat.start();
			});
		});

		describe.skip('starting furnace', () => {
			it('should overshoot temperature', (done) => {

			});
		});

		describe('temperature rising above target + overshoot temp', () => {
			it('should stop furnace', (done) => {
				let temperatureValues = [67,68,69,70,71,72,73,74,75,76,77];
				thermostat.setTarget(70);
				let startCalled: boolean = false;
				let stopCalled: boolean = false;

				sinon.stub(tempSensor, "pollSensor", () => {
					if(temperatureValues.length > 0) {
						return temperatureValues.shift();
					}
					else if(!stopCalled) {
						done("Stop furnace never called.");
					}
				});
				
				sinon.stub(furnaceTrigger, "start", function() {
					startCalled = true;
				});

				sinon.stub(furnaceTrigger, "stop", function() {
					if(!stopCalled) {
						stopCalled = true;
						if(startCalled) {
						done();
						}
						else {
							done("Stop furnace called before start.");
						}
					}
				});

				thermostat.start();
			});
		});
	});


	describe('air conditioning spec', () => {
		describe('temperature rising above target', () => {
			it('should start air conditioner', (done) => {
				let temperatureValues = [66,67,68,69,70,71,72,73,74,75,76,77];
				thermostat.setMode(ThermostatMode.Cooling);
				thermostat.setTarget(70);

				sinon.stub(tempSensor, "pollSensor", function() {
					return temperatureValues.shift();
				});

				let startCalled: boolean = false;
				sinon.stub(acTrigger, "start", function() {
					startCalled = true;
					done();
				});

				thermostat.start();
			});
		});

		describe('temperature staying below target', () => {
			it('should not start air conditioner', (done) => {
				let temperatureValues = [71,70,69,70,71,70,70,72,71];
				thermostat.setMode(ThermostatMode.Cooling);
				thermostat.setTarget(73);
				let startCalled: boolean = false;
				let allDone: boolean = false;

				sinon.stub(tempSensor, "pollSensor", () => {
					if(temperatureValues.length > 0) {
						return temperatureValues.shift();
					}
					else if(!startCalled) {
						if(!allDone) {
							done();
							allDone = true;
						}
					}
					else {
						done("air conditioner started when it shouldn't have");
					}
				});
				
				sinon.stub(acTrigger, "start", function() {
					startCalled = true;
				});

				thermostat.start();
			});
		});

		describe('temperature falling below target - overshoot temp', () => {
			it('should stop air conditioner', (done) => {
				let temperatureValues = [77,76,75,74,73,72,71,70,69,68,67,66,65];
				thermostat.setMode(ThermostatMode.Cooling);
				thermostat.setTarget(70);
				let startCalled: boolean = false;
				let stopCalled: boolean = false;

				sinon.stub(tempSensor, "pollSensor", () => {
					if(temperatureValues.length > 0) {
						return temperatureValues.shift();
					}
					else if(!stopCalled) {
						done("Stop air conditioner never called.");
					}
				});
				
				sinon.stub(acTrigger, "start", function() {
					startCalled = true;
				});

				sinon.stub(acTrigger, "stop", function() {
					if(!stopCalled) {
						stopCalled = true;
						if(startCalled) {
							done();
						}
						else {
							done("Stop air conditioner called before start.");
						}
					}
				});

				thermostat.start();
			});
		});
	});


	describe('failsafe spec', () => {
		describe('furnace running for longer than max run time', () => {
			it('should stop furnace', (done) => {
				thermostat.setTarget(70);
				cfg.MaxRunTime = 10;
				clock = sinon.useFakeTimers();  

				sinon.stub(tempSensor, "pollSensor", () => {
					return thermostat.target - 5;
				});

				thermostat.start();

				let minStartTimeAccountingForWindowAverageDelay = tickDelay * (windowSize);
				clock.tick(minStartTimeAccountingForWindowAverageDelay);
				expect(thermostat.isRunning()).is.true;
				clock.tick(cfg.MaxRunTime);
				expect(thermostat.isRunning()).is.false;

				done();
			});
		});

		describe('when furnace stops running, it', () => {
			it('should not run again until at least MinDelayBetweenRuns later', (done) => {
				thermostat.setTarget(70);
				cfg.MaxRunTime = 1;
				cfg.MinDelayBetweenRuns = 10;
				let offMillis: number = null;

				enum TestState {
					NotYetStarted,
					Started,
					Stopped
				}

				let testState = TestState.NotYetStarted;

				sinon.stub(furnaceTrigger, "start", function() {
					if(testState == TestState.NotYetStarted) {
						testState = TestState.Started;
					}
					else if(testState == TestState.Stopped) {
						let now = Date.now();
						expect(now).is.gte(offMillis + cfg.MinDelayBetweenRuns);
						done();
					}
				});

				sinon.stub(furnaceTrigger, "stop", function() {
					testState = TestState.Stopped;
					offMillis = Date.now();
				});

				sinon.stub(tempSensor, "pollSensor", () => {
					if(testState == TestState.NotYetStarted) {
						return thermostat.target - 5; //start it
					}
					else if(testState == TestState.Started) {
						return thermostat.target + 5; //turn it right back off
					}
					else if(testState == TestState.Stopped) {
						return thermostat.target - 5; //try and start it again
					}
				});

				thermostat.start();
			});
		});

		describe('air conditioner running for longer than max run time', () => {
			it('should stop air conditioner', (done) => {
				thermostat.setTarget(70);
				thermostat.setMode(ThermostatMode.Cooling);
				cfg.MaxRunTime = 10;
				clock = sinon.useFakeTimers();  

				sinon.stub(tempSensor, "pollSensor", () => {
					return thermostat.target + 5;
				});

				thermostat.start();

				let minStartTimeAccountingForWindowAverageDelay = tickDelay * (windowSize);
				clock.tick(minStartTimeAccountingForWindowAverageDelay);
				expect(thermostat.isRunning()).is.true;
				clock.tick(cfg.MaxRunTime);
				expect(thermostat.isRunning()).is.false;
				
				done();
			});
		});

		describe('when air conditioner stops running, it', () => {
			it('should not run again until at least MinDelayBetweenRuns later', (done) => {
				thermostat.setTarget(70);
				thermostat.setMode(ThermostatMode.Cooling);
				cfg.MaxRunTime = 1;
				cfg.MinDelayBetweenRuns = 5;
				let offMillis: number = null;

				enum TestState {
					NotYetStarted,
					Started,
					Stopped
				}

				let testState = TestState.NotYetStarted;

				sinon.stub(acTrigger, "start", function() {
					if(testState == TestState.NotYetStarted) {
						testState = TestState.Started;
					}
					else if(testState == TestState.Stopped) {
						expect(Date.now()).is.gte(offMillis + cfg.MinDelayBetweenRuns);
						done();
					}
				});

				sinon.stub(acTrigger, "stop", function() {
					testState = TestState.Stopped;
					offMillis = Date.now();
				});

				sinon.stub(tempSensor, "pollSensor", () => {
					if(testState == TestState.NotYetStarted) {
						return thermostat.target + 5; //start it
					}
					else if(testState == TestState.Started) {
						return thermostat.target - 5; //turn it right back off
					}
					else if(testState == TestState.Stopped) {
						return thermostat.target + 5; //try and start it again
					}
				});

				thermostat.start();
			});
		});
	});


	describe('event spec', () => {

		describe('when furnace trigger is started, it', () => {
			it('should emit an "on" message', (done) => {
				thermostat.start().subscribe((e: IThermostatEvent) => {
					if(e.topic.length == 2 &&
						e.topic[0] == 'thermostat' &&
						e.topic[1] == 'furnace' &&
						e.message == 'on') {
							done();
					}
				});

				(<any>thermostat).startTrigger();
			});
		});

		describe('when furnace trigger is stopped, it', () => {
			it('should emit an "off" message', (done) => {
				
				buildRunningThermostat(ThermostatMode.Heating).subscribe((runningThermostat) => {
					runningThermostat.eventStream.subscribe((e: IThermostatEvent) => {
						if(e.topic.length == 2 &&
							e.topic[0] == 'thermostat' &&
							e.topic[1] == 'furnace' &&
							e.message == 'off') {
								done();
						}
					}); 
					(<any>thermostat).stopTrigger();
				}); 

			});
		});

		describe('when ac trigger is started, it', () => {
			it('should emit an "on" message', (done) => {
				thermostat.setMode(ThermostatMode.Cooling);
				thermostat.start().subscribe((e: IThermostatEvent) => {
					if(e.topic.length == 2 &&
							e.topic[0] == 'thermostat' &&
							e.topic[1] == 'ac' &&
							e.message == 'on') {
								done();
						}
				});

				(<any>thermostat).startTrigger();
			});
		});

		describe('when ac trigger is stopped, it', () => {
			it('should emit an "off" message', (done) => {
				buildRunningThermostat(ThermostatMode.Cooling).subscribe((runningThermostat) => {
					runningThermostat.eventStream.subscribe((e: IThermostatEvent) => {
						if(e.topic.length == 2 &&
							e.topic[0] == 'thermostat' &&
							e.topic[1] == 'ac' &&
							e.message == 'off') {
								done();
						}
					}); 
					(<any>thermostat).stopTrigger();
				}); 
			});
		});

		describe('when thermostat is running, it', () => {

			it('should emit a temperature message at the appropriate interval', (done) => {
				//clock = sinon.useFakeTimers();
				
				let tempEmitDelay = 50;
				let iterations = 5;
				
				buildRunningThermostat(ThermostatMode.Heating, true).subscribe((runningThermostat) => {
					runningThermostat.configuration.TempEmitDelay = tempEmitDelay;
					let lastNow: number = null;
					let msgCount = 0;
					let received: boolean = false;
					let subscription: Rx.Subscription;
					subscription = runningThermostat.eventStream.subscribe((e: IThermostatEvent) => {

						if(e.topic.length == 3 &&
							e.topic[0] == 'sensors' &&
							e.topic[1] == 'temperature' &&
							e.topic[2] == 'thermostat') {
								let now: number = Date.now();
								if(lastNow != null) {
									let diff = Math.abs(now - lastNow);
									expect(diff).to.be.within(0, 5);
								}

								lastNow = now;
								msgCount++;

								if(msgCount >= iterations) {
									done();
									subscription.unsubscribe();
								}
						}
					}); 

					runningThermostat.start();

					//clock.tick(tempEmitDelay*iterations);
					//done();
				}); 
			});
		});

		describe('when target is changed, it', () => {
			it('should emit a "target changed" message', (done) => {

				buildThermostat(ThermostatMode.Heating);
				
				let newTarget = thermostat.target + 2;

				thermostat.eventStream.subscribe((e: IThermostatEvent) => {
					if(e.topic.length == 2 &&
						e.topic[0] == 'thermostat' &&
						e.topic[1] == 'target') {
							expect(e.message).to.equal(newTarget.toString());
							done();
					}
				}); 
				
				thermostat.setTarget(newTarget);
			});
		});

		describe('when target is set to the current value, it', () => {
			it('should not emit a "target changed" message', (done) => {
				clock = sinon.useFakeTimers();
				buildThermostat(ThermostatMode.Heating);

				let newTarget = thermostat.target;

				thermostat.eventStream.subscribe((e: IThermostatEvent) => {
					if(e.topic.length == 2 &&
						e.topic[0] == 'thermostat' &&
						e.topic[1] == 'target') {
							throw new Error('Received thermostat/target message when not expected');
					}
				}); 
				
				thermostat.setTarget(newTarget);

				clock.tick(500);

				done();
			});
		});
	});
});
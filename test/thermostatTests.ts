import * as Rx from 'rx';
import * as chai from 'chai';
import * as sinon from 'sinon';
var expect = chai.expect;

import { ITempReader, MovingAverageTempReader } from '../src/tempReader';
import { ITempSensor, Dht11TempSensor } from '../src/tempSensor';
import { Thermostat } from '../src/thermostat';
import { IThermostatConfiguration, ThermostatConfiguration, ThermostatMode, ITempSensorConfiguration, TempSensorConfiguration } from '../src/configuration';
import { ITrigger, FurnaceTrigger, AcTrigger } from '../src/trigger';
import { IThermostatEvent } from '../src/thermostatEvent';

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

    let tickDelay = 10;
    let windowSize = 2;

    let clock: Sinon.SinonFakeTimers;

    function buildThermostat(mode: ThermostatMode): Rx.IPromise<Thermostat> {
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
        
        return Rx.Observable.just<Thermostat>(thermostat).toPromise();
    }

    function buildRunningThermostat(mode: ThermostatMode): Rx.IPromise<Thermostat> {
        let observable = Rx.Observable.create<Thermostat>((observer) => {
            buildThermostat(mode).then((builtThermostat) => {
                builtThermostat.setTarget(70);

                let trigger = mode == ThermostatMode.Heating ? furnaceTrigger : acTrigger;
                sinon.stub(trigger, 'start', () => {
                    observer.onNext(builtThermostat);
                    observer.onCompleted();
                });

                sinon.stub(tempSensor, 'pollSensor', () => {
                    return builtThermostat.mode == ThermostatMode.Heating ? builtThermostat.target - 5 : builtThermostat.target + 5;
                });

                builtThermostat.start();
            });
        });
        
        return observable.toPromise();
    }

    beforeEach(function() {
        buildThermostat(ThermostatMode.Heating);
    });

    afterEach(function() {
        //thermostat.stop();
        if(clock) {
            clock.restore();
            clock = null;
        }
    });

    // ------- General --------- //

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
    
    // -------- Furnace --------- //

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
                    thermostat.stop();
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

    // ------------- Air Conditioning --------------- //

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
                    thermostat.stop();
                    
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

    // -------- Failsafes ---------- //

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
                    thermostat.stop();
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
                    thermostat.stop();
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
            
            buildRunningThermostat(ThermostatMode.Heating).then((runningThermostat) => {
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
            buildRunningThermostat(ThermostatMode.Cooling).then((runningThermostat) => {
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

    describe.only('when thermostat is running, it', () => {
        before(() => {
            //clock = sinon.useFakeTimers();
        });

        it('should emit a temperature message at the appropriate interval', (done) => {
            //clock = sinon.useFakeTimers();
            let testDurationMillis = 100;
            let tempEmitDelay = 5;
            
            buildRunningThermostat(ThermostatMode.Heating).then((runningThermostat) => {
                runningThermostat.configuration.TempEmitDelay = tempEmitDelay;
                let msgCount = 0;
                runningThermostat.eventStream.subscribe((e: IThermostatEvent) => {
                            
                    if(e.topic.length == 3 &&
                        e.topic[0] == 'sensors' &&
                        e.topic[1] == 'temperature' &&
                        e.topic[2] == 'thermostat') {
                            msgCount++;
                            console.log('message received');
                    }
                }); 

                //clock.tick(testDurationMillis);
                let expectedCount = testDurationMillis / tempEmitDelay;
                expect(Math.abs(msgCount - expectedCount)).to.be.within(0, 2); //account for slight variation in timings
                done();
            }); 
        });
    });
});
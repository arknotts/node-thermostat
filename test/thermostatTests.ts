/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />
/// <reference path="../typings/sinon/sinon.d.ts" />

import chai = require('chai');
import sinon = require('sinon');
import { ITempReader, MovingAverageTempReader } from '../src/tempReader';
import { ITempSensor, Dht11TempSensor } from '../src/tempSensor';
import { Thermostat } from '../src/thermostat';
import { IConfiguration, Configuration, ThermostatMode } from '../src/configuration';
import { ITrigger, FurnaceTrigger, AcTrigger } from '../src/trigger';

var expect = chai.expect;

describe('Thermostat Unit Tests:', () => {

    let heatingRange: Array<number>;
    let coolingRange: Array<number>;

    let cfg: IConfiguration;
    let tempSensor: ITempSensor;
    let tempRdr: ITempReader;
    let thermostat: Thermostat;
    let furnaceTrigger: ITrigger;
    let acTrigger: ITrigger;

    let clock: Sinon.SinonFakeTimers;

    beforeEach(function() {
        heatingRange = [55,75];
        coolingRange = [68,80];

        cfg = new Configuration(heatingRange, coolingRange, ThermostatMode.Heating, 1, 2000, 100);

        tempSensor = new Dht11TempSensor();
        tempRdr = new MovingAverageTempReader(tempSensor, 5, 1);
        furnaceTrigger = new FurnaceTrigger();
        acTrigger = new AcTrigger();
        thermostat = new Thermostat(cfg, tempRdr, furnaceTrigger, acTrigger);
    });

    afterEach(function() {
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

            sinon.stub(tempSensor, "current", function() {
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
            let temperatureValues = [71,70,69,70,71,70,70,72,71];
            thermostat.setTarget(70);
            let startCalled: boolean = false;

            sinon.stub(tempSensor, "current", () => {
                if(temperatureValues.length > 0) {
                    return temperatureValues.shift();
                }
                else if(!startCalled) {
                    thermostat.stop();
                    done();
                }
                else {
                    throw new Error("furnace started when it shouldn't have");
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

            sinon.stub(tempSensor, "current", () => {
                if(temperatureValues.length > 0) {
                    return temperatureValues.shift();
                }
                else if(!stopCalled) {
                    throw new Error("Stop furnace never called.");
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
                        throw new Error("Stop furnace called before start.");
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

            sinon.stub(tempSensor, "current", function() {
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

            sinon.stub(tempSensor, "current", () => {
                if(temperatureValues.length > 0) {
                    return temperatureValues.shift();
                }
                else if(!startCalled) {
                    thermostat.stop();
                    done();
                }
                else {
                    throw new Error("air conditioner started when it shouldn't have");
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

            sinon.stub(tempSensor, "current", () => {
                if(temperatureValues.length > 0) {
                    return temperatureValues.shift();
                }
                else if(!stopCalled) {
                    throw new Error("Stop air conditioner never called.");
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
                        throw new Error("Stop air conditioner called before start.");
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

            sinon.stub(tempSensor, "current", () => {
                return 65;
            });

            thermostat.start();

            clock.tick(2);
            expect(thermostat.isRunning()).is.true;
            clock.tick(10);
            expect(thermostat.isRunning()).is.false;
            
            done();
        });
    });

    describe('when furnace stops running, it', () => {
        it('should not run again until at least MinDelayBetweenRuns later', (done) => {
            thermostat.setTarget(70);
            cfg.MaxRunTime = 10;
            cfg.MinDelayBetweenRuns = 20;
           // var clock = sinon.useFakeTimers();
            //let startMillis: number;
            let offMillis: number = null;

            enum TestState {
                NotYetStarted,
                Started,
                Stopped,
                Restarted
            }

            let testState = TestState.NotYetStarted;

            sinon.stub(tempSensor, "current", () => {
                //let currMillis = Date.now();
                if(thermostat.isRunning()) {
                    if(testState == TestState.NotYetStarted) {
                        console.log('running, not yet started');
                        testState = TestState.Started;
                    }
                    else if(testState == TestState.Stopped) {
                        console.log('running, stopped');
                        testState = TestState.Restarted;
                        expect(Date.now()).is.gte(offMillis + cfg.MinDelayBetweenRuns);
                        done();
                    }
                }
                else if(!thermostat.isRunning()) {
                    if(testState == TestState.Started) {
                        console.log('not running, started');
                        testState == TestState.Stopped;
                        offMillis = Date.now();
                    }
                }



                if(testState == TestState.NotYetStarted) {
                    return 65; //start it
                }
                else if(testState == TestState.Started) {
                    return 75; //turn it right back off
                }
                else if(testState == TestState.Stopped) {
                    return 65; //try and start it again
                }

                
                // if(currMillis > startMillis && thermostat.isRunning() && offMillis == null) {
                //     offMillis = Date.now();
                //     return 75; //turn it off right after it starts running
                // }
                // else if(currMillis > offMillis && !thermostat.isRunning()) {
                //     return 65; //try and turn it back on
                // }
                // else {
                //     //if it reached here it has turned on again
                //     done();
                // }
            });

            thermostat.start();
        });
    });
});
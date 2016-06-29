/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />
/// <reference path="../typings/sinon/sinon.d.ts" />

import chai = require('chai');
import sinon = require('sinon');
import { ITempReader, MovingAverageTempReader } from '../src/tempReader';
import { ITempSensor, Dht11TempSensor } from '../src/tempSensor';
import { Thermostat } from '../src/thermostat';
import { IConfiguration, Configuration, ThermostatMode } from '../src/configuration';
import { ITrigger, FurnaceTrigger } from '../src/trigger';

var expect = chai.expect;

describe('Thermostat Unit Tests:', () => {

    let heatingRange: Array<number>;
    let coolingRange: Array<number>;

    let cfg: IConfiguration;
    let tempSensor: ITempSensor;
    let tempRdr: ITempReader;
    let thermostat: Thermostat;
    let furnaceTrigger: ITrigger;

    beforeEach(function() {
        heatingRange = [55,75];
        coolingRange = [68,80];

        cfg = new Configuration(heatingRange, coolingRange, ThermostatMode.Heating);

        tempSensor = new Dht11TempSensor();
        tempRdr = new MovingAverageTempReader(tempSensor, 5, 1);
        furnaceTrigger = new FurnaceTrigger();
        thermostat = new Thermostat(cfg, tempRdr, furnaceTrigger);
    });

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

    describe('temperature dropping below target', () => {
        it('should start furnace', (done) => {
            let temperatureValues = [71,70,69,68,67,66,65,64,63];
            thermostat.setTarget(70);

            sinon.stub(tempSensor, "current", function() {
                return temperatureValues.shift();
            });

            let startCalled: boolean = false;
            sinon.stub(furnaceTrigger, "start", function() {
                console.log('start!');
                startCalled = true;
                done();
            });

            thermostat.start();
        });
    });
    
});
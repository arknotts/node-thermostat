/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />
/// <reference path="../typings/sinon/sinon.d.ts" />

import chai = require('chai');
import sinon = require('sinon');
import { MovingAverageTempReader } from '../src/tempReader';
import { ITempSensor, Dht11TempSensor } from '../src/tempSensor';
import { Thermostat } from '../src/thermostat';
import { Configuration, ThermostatMode } from '../src/configuration';

var expect = chai.expect;

describe('Thermostat Unit Tests:', () => {

    describe('creating new thermostat', () => {
        it('should default to safe values', (done) => {
            let heatingRange = [55,75];
            let coolingRange = [68,80];
            
            let cfg = new Configuration(heatingRange, coolingRange, ThermostatMode.Heating);
            let tempRdr = new MovingAverageTempReader(new Dht11TempSensor(), 5, 10);
            let thermostat = new Thermostat(cfg, tempRdr);

            expect(thermostat.target).is.equals(heatingRange[0]);

            thermostat.setMode(ThermostatMode.Cooling);
            expect(thermostat.target).is.equals(coolingRange[1]);
            
            done();
        });
    });

    describe('setting target outside bounds', () => {
        it('should set to closest valid value', (done) => {
            let heatingRange = [55,75];
            let coolingRange = [68,80];
            
            let cfg = new Configuration(heatingRange, coolingRange, ThermostatMode.Heating);
            let tempRdr = new MovingAverageTempReader(new Dht11TempSensor(), 5, 10);
            let thermostat = new Thermostat(cfg, tempRdr);

            thermostat.setTarget(heatingRange[0]-5); //set 5 under
            expect(thermostat.target).is.equals(heatingRange[0]);

            thermostat.setTarget(heatingRange[1]+5); //set 5 over
            expect(thermostat.target).is.equals(heatingRange[1]);
            
            done();
        });
    });
});
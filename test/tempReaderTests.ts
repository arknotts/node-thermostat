/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />
/// <reference path="../typings/sinon/sinon.d.ts" />

/**
 * Module dependencies.
 */
import chai = require('chai');
import sinon = require('sinon');
import { MovingAverageTempReader } from '../src/tempReader';
import { ITempSensor, Dht11TempSensor } from '../src/tempSensor';

/**
 * Globals
 */

var expect = chai.expect;

/**
 * Unit tests
 */
describe('Moving Average Temp Reader Unit Tests:', () => {

    describe('adding 5 values', () => {
        it('should take the average', (done) => {
            let tempSensor: ITempSensor = new Dht11TempSensor();
            let values: Array<number> = [68,69,70,71,72];

            let callCount = 0;
            sinon.stub(tempSensor, "current", function() {
                let val = values[callCount];
                callCount++;
                return val;
            });

            let tempReader = new MovingAverageTempReader(tempSensor, values.length, 1);
            tempReader.start();
            
            let expectedAvg = 0;
            for(var i=0; i<values.length; i++) expectedAvg += values[i];
            expectedAvg /= values.length;
            setTimeout(() => {
                expect(tempReader.current()).to.equals(expectedAvg);
                done();
            }, 20);
            
            //expect(tempSensor.current()).to.equals(65);

        

            
        });
    });
});
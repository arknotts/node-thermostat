/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />
/// <reference path="../typings/sinon/sinon.d.ts" />

import chai = require('chai');
import sinon = require('sinon');

import { ITempReader, MovingAverageTempReader } from '../src/tempReader';
import { ITempSensor, Dht11TempSensor } from '../src/tempSensor';
import { ITempSensorConfiguration, TempSensorConfiguration } from '../src/configuration';

var expect = chai.expect;

describe('Moving Average Temp Reader Unit Tests:', () => {

    let tempSensorCfg: ITempSensorConfiguration;
    let tempSensor: ITempSensor;
    let tempRdr: ITempReader;

    beforeEach(function() {
        tempSensorCfg = new TempSensorConfiguration(1);
        tempSensor = new Dht11TempSensor(tempSensorCfg);
        
        tempSensor = new Dht11TempSensor(tempSensorCfg);
        tempRdr = new MovingAverageTempReader(tempSensor, 5, 1);
    });

    describe('adding multiple values', () => {
        it('should take the average', (done) => {
            let values: Array<number> = [68,69,70,71,72];
            let numValues = values.length;
            let expectedAvg = 0;
            for(var i=0; i<numValues; i++) expectedAvg += values[i];
            expectedAvg /= numValues;

            sinon.stub(tempSensor, "pollSensor", function() {
                return values.shift();
            });

            let tempReader = new MovingAverageTempReader(tempSensor, numValues, 1);
            
            let count = 0;
            tempReader.start().subscribe(
                function (x) { 
                    count++;
                    
                    if(count == numValues) 
                    {
                        expect(tempReader.current()).to.equals(expectedAvg);
                        done();
                    }
                  }
            );
            
        });
    });

    describe('adding more values than the moving average length', () => {
        it('should take average of last set of values', (done) => {
            let values: Array<number> = [68,69,70,71,72,73,74,75,76,77];
            let movingAvgLength = 5;
            let numValues = values.length;
            let expectedAvg = 0;
            for(var i=numValues-1; i >= numValues-movingAvgLength; i--) expectedAvg += values[i];
            expectedAvg /= movingAvgLength;

            sinon.stub(tempSensor, "pollSensor", function() {
                return values.shift();
            });

            let tempReader = new MovingAverageTempReader(tempSensor, movingAvgLength, 1);
            
            let count = 0;
            tempReader.start().subscribe(
                function (x) { 
                    count++;
                    
                    if(count == numValues) 
                    {
                        expect(tempReader.current()).to.equals(expectedAvg);
                        done();
                    }
                  }
            );
            
        });
    });
});
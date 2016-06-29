/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />
/// <reference path="../typings/sinon/sinon.d.ts" />

import chai = require('chai');
import sinon = require('sinon');
import { MovingAverageTempReader } from '../src/tempReader';
import { ITempSensor, Dht11TempSensor } from '../src/tempSensor';

var expect = chai.expect;

describe('Moving Average Temp Reader Unit Tests:', () => {

    describe('adding multiple values', () => {
        it('should take the average', (done) => {
            let tempSensor: ITempSensor = new Dht11TempSensor();
            let values: Array<number> = [68,69,70,71,72];
            let numValues = values.length;
            let expectedAvg = 0;
            for(var i=0; i<numValues; i++) expectedAvg += values[i];
            expectedAvg /= numValues;

            sinon.stub(tempSensor, "current", function() {
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
        it('should not exceed moving average length', (done) => {
            let tempSensor: ITempSensor = new Dht11TempSensor();
            let values: Array<number> = [68,69,70,71,72];
            let numValues = values.length;
            let expectedAvg = 0;
            for(var i=0; i<numValues; i++) expectedAvg += values[i];
            expectedAvg /= numValues;

            sinon.stub(tempSensor, "current", function() {
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
});
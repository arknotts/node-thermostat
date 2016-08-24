import * as chai from 'chai';
import * as sinon from 'sinon';

import { ITempReader, MovingAverageTempReader } from '../src/tempReader';
import { ITempSensor, Dht11TempSensor } from '../src/tempSensor';
import { ITempSensorConfiguration, TempSensorConfiguration } from '../src/configuration';

var expect = chai.expect;

describe('Moving Average Temp Reader Unit Tests:', () => {

    let tempSensorCfg: ITempSensorConfiguration;
    let tempSensor: ITempSensor;
    let tempRdr: ITempReader;

    let windowSize = 3;

    beforeEach(function() {
        tempSensorCfg = new TempSensorConfiguration(1);
        tempSensor = new Dht11TempSensor(tempSensorCfg);
        tempRdr = new MovingAverageTempReader(tempSensor, windowSize);
    });

    describe('adding multiple values', () => {
        it('should take the average', (done) => {
            let values: Array<number> = [68,69,70,71,72];
            let numValues = values.length;
            let expectedAvgs: Array<number> = new Array<number>();
            
            let numWindows = numValues-windowSize+1;

            for(var windowStart=0; windowStart<numWindows; windowStart++) {
                let thisAvg = 0;
                for(var i=windowStart; i<windowStart+windowSize; i++) {
                    thisAvg += values[i];
                }
                expectedAvgs.push(thisAvg/windowSize);
            }

            sinon.stub(tempSensor, "pollSensor", function() {
                return values.shift();
            });

            let count = 0;
            tempRdr.start().subscribe((temp) => { 
				if(!isNaN(temp)) {
					expect(temp).equals(expectedAvgs[count]);
				}
				count++;

				if(count == numWindows-1) 
				{
					done();
				}
			});
        });
    });
});
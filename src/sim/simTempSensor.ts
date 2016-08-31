import { BaseTempSensor } from '../core/tempSensor';
import { ITempSensorConfiguration } from '../core/configuration';

export class SimTempSensor extends BaseTempSensor {

    currTemp: number;
    lastTempDropMillis: number;

    constructor(_tempSensorConfiguration: ITempSensorConfiguration, public tempChangePerSecond: number) {
        super(_tempSensorConfiguration);
    }
    
    pollSensor(): number {
        let nowMillis = Date.now();
        let diff = nowMillis - this.lastTempDropMillis;

        if(diff > 1) {
            this.currTemp += this.tempChangePerSecond;
            this.lastTempDropMillis = nowMillis;
        }

        return this.currTemp;
    }


}
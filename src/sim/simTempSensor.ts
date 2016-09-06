import { BaseTempSensor } from '../core/tempSensor';
import { ITempSensorConfiguration } from '../core/configuration';

export class SimTempSensor extends BaseTempSensor {

    currTemp: number;
    lastTempDropMillis: number;

    constructor(_tempSensorConfiguration: ITempSensorConfiguration, public tempChangePerSecond: number, currTemp: number) {
        super(_tempSensorConfiguration);

		this.currTemp = currTemp;
		this.lastTempDropMillis = Date.now();
    }
    
    pollSensor(): number {
        let nowMillis = Date.now();
        let diff = nowMillis - this.lastTempDropMillis;

        if(diff > 1) {
            this.currTemp = +(this.currTemp + this.tempChangePerSecond).toFixed(1);
            this.lastTempDropMillis = nowMillis;
        }

        return this.currTemp;
    }


}
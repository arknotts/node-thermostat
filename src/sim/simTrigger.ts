import { ITrigger } from '../core/trigger';
import { SimTempSensor } from './simTempSensor';

export class SimTrigger implements ITrigger {

	constructor(private _io: any, private _simTempSensor: SimTempSensor) {
	}

	start() {
		this._io.sockets.emit('Trigger started');
		this._simTempSensor.tempChangePerSecond = -this._simTempSensor.tempChangePerSecond;
	}

	stop() {
		this._io.sockets.emit('Trigger stopped');
		this._simTempSensor.tempChangePerSecond = -this._simTempSensor.tempChangePerSecond;
	}
}
import { ITrigger } from '../core/trigger';
import { SimTempSensor } from './simTempSensor';

export class SimTrigger implements ITrigger {

	sockets: any[] = [];

	constructor(io: any, private _simTempSensor: SimTempSensor) {
        io.on('connection', function (socket: any) {
            this.sockets.push(socket);
        });
	}

	start() {
		this.sockets.forEach((socket) => {
			socket.send('Trigger started');
		});

		this._simTempSensor.tempChangePerSecond = -this._simTempSensor.tempChangePerSecond;
	}

	stop() {
		this.sockets.forEach((socket) => {
			socket.send('Trigger stopped');
		});

		this._simTempSensor.tempChangePerSecond = -this._simTempSensor.tempChangePerSecond;
	}
}
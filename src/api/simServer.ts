import path = require('path');

import { BaseServer } from './baseServer';
import { IThermostatConfiguration, ITempSensorConfiguration, ThermostatMode } from '../core/configuration';
import { ITempReader, MovingAverageTempReader } from '../core/tempReader';
import { ITempSensor } from '../core/tempSensor';
import { SimTempSensor } from '../sim/simTempSensor';

export class SimServer extends BaseServer {
    private _simTempSensor: SimTempSensor;

    preThermostatInitRoutes() {
        super.preThermostatInitRoutes();

        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname+'/bootstrapper.html'));
        });
    }

    postThermostatInitRoutes() {
        super.postThermostatInitRoutes();

        this.app.post('/tempChangePerSecond', (req, res) => {
            this._simTempSensor.tempChangePerSecond = parseFloat(req.body.tempChangePerSecond);
            res.status(200).send();
        });
    }

    buildTempReader(tempSensorConfiguration: ITempSensorConfiguration): ITempReader {
        this._simTempSensor = new SimTempSensor(tempSensorConfiguration, -.2);
        return new MovingAverageTempReader(this._simTempSensor, 3);
    }
}
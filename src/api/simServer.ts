import fs = require('fs');
import path = require('path');

import { BaseServer } from './baseServer';
import { IThermostatConfiguration, ITempSensorConfiguration, ThermostatMode } from '../core/configuration';
import { ITempReader, MovingAverageTempReader } from '../core/tempReader';
import { ITempSensor } from '../core/tempSensor';
import { ITrigger } from '../core/trigger';

import { SimTempSensor } from '../sim/simTempSensor';
import { SimTrigger } from '../sim/simTrigger';

export class SimServer extends BaseServer {
    private _simTempSensor: SimTempSensor;

	httpHandler(req: any, res: any) {
		fs.readFile(path.join(__dirname+'/bootstrapper.html'), function(error, content) {
			if (error) {
				res.writeHead(500);
				res.end();
			}
			else {
				res.writeHead(200, { 'Content-Type': 'text/html' });
				res.end(content, 'utf-8');
			}
		});
	}

    postThermostatInitRoutes() {
        super.postThermostatInitRoutes();

		this.router.on('/tempChangePerSecond', (socket: any, args: any, next: any) => {
			if(args[1] && args[1].tempChangePerSecond) {
				let tempChange = parseFloat(args[1].tempChangePerSecond);
            	this._simTempSensor.tempChangePerSecond = tempChange;
			}
			else {
				next('Invalid temp change per second call');
			}
		});
    }

	buildConfiguration(passedConfiguration: any): IThermostatConfiguration {
        let mode: ThermostatMode = passedConfiguration.mode ? 
                                        (<any>ThermostatMode)[passedConfiguration.mode] :
                                        (<any>ThermostatMode)["Heating"];
            
        let configDefaults = <IThermostatConfiguration> {
            TargetRange: mode == ThermostatMode.Heating ? [60, 75] : [68, 80],
            DefaultTarget: mode == ThermostatMode.Heating ? 69 : 75,
            MaxOvershootTemp: 4,
            MaxRunTime: 1800000,
            MinDelayBetweenRuns: 10000,
            TempEmitDelay: 300000
        };

        let tempSensorConfigDefaults = <ITempSensorConfiguration> {
            TemperatureSensorPollDelay: 2000
        };

        let configuration: IThermostatConfiguration = {
            TargetRange: passedConfiguration.TargetRange || configDefaults.TargetRange,
            Mode: mode,
            DefaultTarget: passedConfiguration.DefaultTarget || configDefaults.DefaultTarget,
            MaxOvershootTemp: passedConfiguration.MaxOvershootTemp || configDefaults.MaxOvershootTemp,
            MaxRunTime: passedConfiguration.MaxRunTime || configDefaults.MaxRunTime,
            MinDelayBetweenRuns: passedConfiguration.MinDelayBetweenRuns || configDefaults.MinDelayBetweenRuns,
            TempEmitDelay: parseInt(passedConfiguration.TempEmitDelay) || configDefaults.TempEmitDelay,
            TempSensorConfiguration: {
                TemperatureSensorPollDelay: passedConfiguration.TemperatureSensorPollDelay || tempSensorConfigDefaults.TemperatureSensorPollDelay
            }
        };

        return configuration;
    }

    buildTempReader(tempSensorConfiguration: ITempSensorConfiguration): ITempReader {
        this._simTempSensor = new SimTempSensor(tempSensorConfiguration, -.2, 70);
        return new MovingAverageTempReader(this._simTempSensor, 3);
    }

	buildFurnaceTrigger(): ITrigger {
        return new SimTrigger(this.io, this._simTempSensor);
    }

    buildAcTrigger(): ITrigger {
        return new SimTrigger(this.io, this._simTempSensor);
    }
}
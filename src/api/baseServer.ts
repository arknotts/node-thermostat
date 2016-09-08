import express = require('express');
import bodyParser = require('body-parser');

import { Thermostat } from '../core/thermostat';
import { IThermostatConfiguration, ITempSensorConfiguration, ThermostatMode } from '../core/configuration';
import { ITempReader } from '../core/tempReader';
import { ITempSensor } from '../core/tempSensor';
import { ITrigger } from '../core/trigger';
import { IThermostatEvent } from '../core/thermostatEvent';

const serverPort: number = 3000;

export abstract class BaseServer {

    app = require('http').createServer(this.httpHandler);
    io = require('socket.io')(this.app);
	router = require('socket.io-events')();
    
    thermostat: Thermostat;

    constructor() {}

    start() {
        this.preThermostatInitRoutes();
        this.initThermostatRoute();
        this.postThermostatInitRoutes();
        this.listen();
    }

	abstract buildConfiguration(passedConfiguration: any): IThermostatConfiguration;
	abstract buildTempReader(tempSensorConfiguration: ITempSensorConfiguration): ITempReader;
	abstract buildFurnaceTrigger(): ITrigger;
	abstract buildAcTrigger(): ITrigger;

	httpHandler(req: any, res: any) {
		res.send('<h1>Welcome to node-thermostat.</h1><h3>Connect via a web socket at ws://localhost:' + serverPort);
	}

    preThermostatInitRoutes() {
		this.router.use((socket: any, args: any, next: any) => {
			next();
        });
    }

    initThermostatRoute() {
		this.router.on('/init', (socket: any, args: any, next: any) => {
			let passedConfiguration = args[1];

            let configuration = this.buildConfiguration(passedConfiguration);            
            let tempReader = this.buildTempReader(configuration.TempSensorConfiguration);
            let furnaceTrigger: ITrigger = this.buildFurnaceTrigger();
            let acTrigger: ITrigger = this.buildAcTrigger();

            this.thermostat = new Thermostat(configuration, tempReader, furnaceTrigger, acTrigger);

			this.thermostat.eventStream.subscribe((e: IThermostatEvent) => {
				this.io.sockets.send(JSON.stringify(e.topic) + " : " + e.message);
			});
		});
    }

    postThermostatInitRoutes() {
        this.router.on('/reset', (socket: any, args: any, next: any) => {
            this.thermostat.stop();
            this.thermostat = null;
        });

        this.router.use((socket: any, args: any, next: any) => {
            if(this.thermostat) {
                next();
            }
            else {
                socket.emit('err', { error: 'Thermostat must be initialized first!' });
            }
        });

        this.router.on('/start', (socket: any, args: any, next: any) => {
            this.thermostat.start();
        });

        this.router.on('/target', (socket: any, args: any, next: any) => {
			let payload = args[1];
			if(payload) {
				if(payload.target) {
					this.thermostat.setTarget(payload.target);
				}
				else {
					next('Invalid set target call');
				}
			}
			else {
				socket.emit(args.shift(), { target: this.thermostat.target });
			}
        });

        this.router.on('/mode', (socket: any, args: any, next: any) => {
			let payload = args[1];
			if(payload) {
				if(payload.mode) {
					let newMode = (<any>ThermostatMode)[payload.mode];
					this.thermostat.setMode(newMode);
				}
				else {
					next('Invalid set mode call');
				}
			}
			else {
				socket.emit(args.shift(), { mode: this.thermostat.mode });
			}
        });
    }
    
    listen() {
		this.io.use(this.router);

        this.app.listen(serverPort, () => {
            console.log('Socket listening on port ' + serverPort);
        });
    }

}
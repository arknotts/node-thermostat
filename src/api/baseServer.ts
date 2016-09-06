import express = require('express');
import bodyParser = require('body-parser');

import { Thermostat } from '../core/thermostat';
import { IThermostatConfiguration, ITempSensorConfiguration, ThermostatMode } from '../core/configuration';
import { ITempReader } from '../core/tempReader';
import { ITempSensor } from '../core/tempSensor';
import { ITrigger } from '../core/trigger';
import { IThermostatEvent } from '../core/thermostatEvent';

export abstract class BaseServer {

    app = express();
    server = require('http').Server(this.app);
    io = require('socket.io')(this.server);
    
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

    preThermostatInitRoutes() {
        
        this.app.use(bodyParser.urlencoded({
            extended: true
        }));
    }

    initThermostatRoute() {
        this.app.post('/init', (req, res) => {

            let passedConfiguration = req.body;

            let configuration = this.buildConfiguration(passedConfiguration);            
            let tempReader = this.buildTempReader(configuration.TempSensorConfiguration);
            let furnaceTrigger: ITrigger = this.buildFurnaceTrigger();
            let acTrigger: ITrigger = this.buildAcTrigger();

            this.thermostat = new Thermostat(configuration, tempReader, furnaceTrigger, acTrigger);

			this.thermostat.eventStream.subscribe((e: IThermostatEvent) => {
				this.io.sockets.send(JSON.stringify(e.topic) + " : " + e.message);
			});

            res.status(200).send('initialized');
        });
    }

    postThermostatInitRoutes() {
        this.app.post('/reset', (req, res) => {
            this.thermostat.stop();
            this.thermostat = null;
            res.status(200).send({
                reset: true   
            });
        });

        this.app.use((req, res, next) => {
            if(this.thermostat) {
                next();
            }
            else {
                res.status(500).send('Thermostat must be initialized first!');
            }
        });

        this.app.post('/start', (req, res) => {
            this.thermostat.start();

            res.status(200).send('started');
        });

        this.app.get('/target', (req, res) => {
            res.status(200).send(this.thermostat.target);
        });

        this.app.post('/target', (req, res) => {
            let newTarget = parseInt(req.body.target);
            this.thermostat.setTarget(newTarget);
            res.status(200).send();
        });

        this.app.get('/mode', (req, res) => {
            res.status(200).send(this.thermostat.mode.toString());
        });

        this.app.post('/mode', (req, res) => {
            let newMode = (<any>ThermostatMode)[req.body.mode];
            this.thermostat.setMode(newMode);
            res.status(200).send({mode: newMode});
        });
    }
    
    listen() {
        this.server.listen(3000, () => {
            console.log('Socket listening on port 3000');
        });
    }

}
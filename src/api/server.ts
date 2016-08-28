import express = require('express');
import bodyParser = require('body-parser');
import path = require('path');

import { Thermostat } from '../core/thermostat';
import { IThermostatConfiguration, ITempSensorConfiguration, ThermostatMode } from '../core/configuration';
import { ITempReader, MovingAverageTempReader } from '../core/tempReader';
import { ITempSensor, Dht11TempSensor } from '../core/tempSensor';
import { ITrigger, FurnaceTrigger } from '../core/trigger';
import { IThermostatEvent } from '../core/thermostatEvent';

export class BaseServer {

    app = express();
    server = require('http').Server(this.app);
    io = require('socket.io')(this.server);
    
    thermostat: Thermostat;

    constructor() {}

    start() {
        this.initApp();
        this.listen();
    }

    initApp() {
        this.app.use(bodyParser.urlencoded({
            extended: true
        }));
    

        this.io.on('connection', function (socket: any) {
            if(this.thermostat) {
                this.thermostat.eventStream.subscribe((e: IThermostatEvent) => {
                    socket.send(JSON.stringify(e.topic) + " : " + e.message);
                });
            }
        });

        //TODO only for dev mode
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname+'/bootstrapper.html'));
        });

        this.app.post('/init', (req, res) => {

            let passedConfiguration = req.body;

            let mode: ThermostatMode = passedConfiguration.mode ? 
                                        (<any>ThermostatMode)[passedConfiguration.mode] :
                                        (<any>ThermostatMode)["Heating"];
            
            let configDefaults = <IThermostatConfiguration> {
                TargetRange: mode == ThermostatMode.Heating ? [60, 75] : [68, 80],
                DefaultTarget: mode == ThermostatMode.Heating ? 69 : 75,
                MaxOvershootTemp: 4,
                MaxRunTime: 1800000,
                MinDelayBetweenRuns: 600000,
                TempEmitDelay: 300000
            };

            let tempSensorConfigDefaults = <ITempSensorConfiguration> {
                TemperatureSensorPollDelay: 5000
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
            console.log(configuration);
            
            let tempSensor: ITempSensor = new Dht11TempSensor(configuration.TempSensorConfiguration);
            let tempReader: ITempReader = new MovingAverageTempReader(tempSensor, 5);
            let furnaceTrigger: ITrigger = new FurnaceTrigger();

            this.thermostat = new Thermostat(configuration, tempReader, furnaceTrigger, null);

            res.status(200).send('initialized');
        });

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
            res.status(200).send({target: this.thermostat.target});
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
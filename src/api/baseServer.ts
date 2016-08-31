import express = require('express');
import bodyParser = require('body-parser');

import { Thermostat } from '../core/thermostat';
import { IThermostatConfiguration, ITempSensorConfiguration, ThermostatMode } from '../core/configuration';
import { ITempReader, MovingAverageTempReader } from '../core/tempReader';
import { ITempSensor, Dht11TempSensor } from '../core/tempSensor';
import { ITrigger, FurnaceTrigger, AcTrigger } from '../core/trigger';
import { IThermostatEvent } from '../core/thermostatEvent';

export class BaseServer {

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

    buildConfiguration(passedConfiguration: any): IThermostatConfiguration {
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

        return configuration;
    }

    buildTempReader(tempSensorConfiguration: ITempSensorConfiguration): ITempReader {
        let tempSensor: ITempSensor = new Dht11TempSensor(tempSensorConfiguration);
        return new MovingAverageTempReader(tempSensor, 5);
    }

    buildFurnaceTrigger(): ITrigger {
        return new FurnaceTrigger();
    }

    buildAcTrigger(): ITrigger {
        return new AcTrigger();
    }

    preThermostatInitRoutes() {
        
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
    }

    initThermostatRoute() {
        this.app.post('/init', (req, res) => {

            let passedConfiguration = req.body;

            let configuration = this.buildConfiguration(passedConfiguration);            
            let tempReader = this.buildTempReader(configuration.TempSensorConfiguration);
            let furnaceTrigger: ITrigger = this.buildFurnaceTrigger();
            let acTrigger: ITrigger = this.buildAcTrigger();

            this.thermostat = new Thermostat(configuration, tempReader, furnaceTrigger, acTrigger);

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
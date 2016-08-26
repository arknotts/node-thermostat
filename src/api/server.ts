import express = require('express');
import bodyParser = require('body-parser');

import { Thermostat } from '../core/thermostat';
import { IThermostatConfiguration, ITempSensorConfiguration, ThermostatMode } from '../core/configuration';
import { ITempReader, MovingAverageTempReader } from '../core/tempReader';
import { ITempSensor, Dht11TempSensor } from '../core/tempSensor';
import { ITrigger, FurnaceTrigger } from '../core/trigger';
import { IThermostatEvent } from '../core/thermostatEvent';



var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
app.use(bodyParser.urlencoded({
  extended: true
}));

let thermostat: Thermostat;

io.on('connection', function (socket: any) {
	if(thermostat) {
		thermostat.eventStream.subscribe((e: IThermostatEvent) => {
            console.log('message', e);
			socket.send(JSON.stringify(e.topic) + " : " + e.message);
		});
	}
});

app.post('/init', (req, res) => {

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

	thermostat = new Thermostat(configuration, tempReader, furnaceTrigger, null);

	res.status(200).send();
});

app.use((req, res, next) => {
	if(thermostat) {
		next();
	}
	else {
		res.status(500).send('Thermostat must be initialized first!');
	}
});

app.post('/start', (req, res) => {
	thermostat.start();

    res.status(200).send();
});

app.get('/target', (req, res) => {
	res.status(200).send(thermostat.target);
});

app.post('/target', (req, res) => {
	let newTarget = parseInt(req.body.target);
	thermostat.setTarget(newTarget);
	res.status(200).send();
});

app.get('/mode', (req, res) => {
	res.status(200).send(thermostat.mode.toString());
});

app.post('/mode', (req, res) => {
	let newMode = (<any>ThermostatMode)[req.body.mode];
	thermostat.setMode(newMode);
	res.status(200).send();
});



// app.listen(3000, function () {
//   console.log('Example app listening on port 3000!');
// });

server.listen(3000, () => {
	console.log('Socket listening on port 3001');
});
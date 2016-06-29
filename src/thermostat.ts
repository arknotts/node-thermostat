import { ITempReader } from './tempReader';
import { IConfiguration, ThermostatMode } from './configuration';
import { MovingAverageTempReader } from './tempReader';
import { Dht11TempSensor } from './tempSensor';

export class Thermostat {

    private _target: number;
    private _targetOvershootBy: number;
    private _startTime: Date;
    private _stopTime: Date;

    constructor(private _configuration: IConfiguration, private _tempReader: ITempReader) {
        this.setTarget(this._configuration.DefaultTarget);
    }

    get target(): number {
        return this._target;
    }

    start() {
        this._tempReader.start().subscribe(
            this.tempReceived,
            function (error) { console.log('Error reading temperature: %s', error); }
        );
    }

    tempReceived(temp: number) {
        console.log("temp: ", temp);

        if(this._configuration.Mode == ThermostatMode.Heating) {
            if(temp < this.target - 1) {
                this.startFurnace();
            }
            //else if(temp >= this.target)
        }
        else { //cooling
            //TODO
        }
    }

    startFurnace() {
        if(!this.isRunning()) {
            this._startTime = new Date();
        }
        //TODO
    }

    stopFurnace() {
        this._startTime = null;
        this._stopTime = new Date();
        
        //TODO
    }

    isRunning(): boolean {
        return this._startTime != null;
    }

    setTarget(target: number) {
        if(this.targetIsWithinBounds(target)) {
            this._target = target;
        }
        else {
            if(target < this._configuration.TargetRange[0]) {
                this._target = this._configuration.TargetRange[0];
            }
            else if(target > this._configuration.TargetRange[1]) {
                this._target = this._configuration.TargetRange[1];
            }
        }
    }

    setMode(mode: ThermostatMode) {
        this._configuration.Mode = mode;
        this.setTarget(this._configuration.DefaultTarget);
    }

    private targetIsWithinBounds(target: number) {
        return target >= this._configuration.TargetRange[0] && target <= this._configuration.TargetRange[1];
    }
}


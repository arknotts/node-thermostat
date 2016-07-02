import { ITempReader } from './tempReader';
import { IConfiguration, ThermostatMode } from './configuration';
import { MovingAverageTempReader } from './tempReader';
import { Dht11TempSensor } from './tempSensor';
import { ITrigger } from './trigger';

export class Thermostat {

    private _target: number;
    private _targetOvershootBy: number;
    private _startTime: Date;
    private _stopTime: Date;

    constructor(private _configuration: IConfiguration, 
                private _tempReader: ITempReader, 
                private _furnaceTrigger: ITrigger, 
                private _acTrigger: ITrigger) {

        this.setTarget(this._configuration.DefaultTarget);
    }

    get target(): number {
        return this._target;
    }

    start() {
        this._tempReader.start().subscribe(
            (t:number) => this.tempReceived(t),
            function (error) { console.log('Error reading temperature: %s', error); }
        );
    }

    stop() {
        this._tempReader.stop();
    }

    tempReceived(temp: number) {
        if(this._configuration.Mode == ThermostatMode.Heating) {
            if(temp < this.target - 1) {
                if(this.isRunning() && new Date().getMilliseconds() - this._startTime.getMilliseconds() > this._configuration.MaxRunTime) {
                    this.stopFurnace();
                }
                this._targetOvershootBy = Math.min(this.target - temp, this._configuration.MaxOvershootTemp)
                this.startFurnace();
            }
            else if(temp >= this.target + this._targetOvershootBy) {
                this.stopFurnace();
            }
        }
        else { //cooling
            if(temp > this.target + 1) {
                this._targetOvershootBy = Math.min(temp - this.target, this._configuration.MaxOvershootTemp)
                this.startAc();
            }
            else if(temp <= this.target - this._targetOvershootBy) {
                this.stopAc();
            }
        }
    }

    startFurnace() {
        if(!this.isRunning()) {
            this._startTime = new Date();
            this._furnaceTrigger.start();
        }
    }

    stopFurnace() {
        if(this.isRunning()) {
            this._startTime = null;
            this._stopTime = new Date();
            this._furnaceTrigger.stop();
        }
    }

    startAc() {
        if(!this.isRunning()) {
            this._startTime = new Date();
            this._acTrigger.start();
        }
    }

    stopAc() {
        if(this.isRunning()) {
            this._startTime = null;
            this._stopTime = new Date();
            this._acTrigger.stop();
        }
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


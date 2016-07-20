import { ITempReader } from './tempReader';
import { IThermostatConfiguration, ThermostatMode } from './configuration';
import { MovingAverageTempReader } from './tempReader';
import { Dht11TempSensor } from './tempSensor';
import { ITrigger } from './trigger';
import { IEventEmitter } from './eventEmitter';

export class Thermostat {

    private _target: number;
    private _targetOvershootBy: number;
    private _startTime: Date;
    private _stopTime: Date;
    private _currentTrigger: ITrigger;

    constructor(private _configuration: IThermostatConfiguration, 
                private _tempReader: ITempReader, 
                private _furnaceTrigger: ITrigger, 
                private _acTrigger: ITrigger,
                private _eventEmitter: IEventEmitter) {

        this.setMode(_configuration.Mode);
    }

    get target(): number {
        return this._target;
    }

    start() {
        let tempReaderObservable = this._tempReader.start();

        tempReaderObservable.subscribe(
            (temperature:number) => this.tempReceived(temperature),
            function (error) { console.error('Error reading temperature: %s', error); }
        );

        // tempReaderObservable.skipLastWithTime(this._configuration.TempEmitDelay).subscribe(
        //     (temperature:number) => this._eventEmitter.emitEvent(['sensors', 'temperature', 'thermostat'], temperature.toString())
        // )
    }

    stop() {
        this._tempReader.stop();
    }

    private tryStartTrigger(temp: number) {
        if(this.isRunning() && Date.now() - this._startTime.getTime() > this._configuration.MaxRunTime) {
            this.stopTrigger();
        }

        if(this.isFirstRun() || Date.now() - this._stopTime.getTime() > this._configuration.MinDelayBetweenRuns) {
            this._targetOvershootBy = Math.min(Math.abs(this.target - temp), this._configuration.MaxOvershootTemp)
            this.startTrigger();
        }
    }

    tempReceived(temp: number) {
        if(this._configuration.Mode == ThermostatMode.Heating) {
            if(temp < this.target - 1) {
                this.tryStartTrigger(temp);
            }
            else if(temp >= this.target + this._targetOvershootBy) {
                this.stopTrigger();
            }
        }
        else { //cooling
            if(temp > this.target + 1) {
                this.tryStartTrigger(temp);
            }
            else if(temp <= this.target - this._targetOvershootBy) {
                this.stopTrigger();
            }
        }
    }

    startTrigger() {
        if(!this.isRunning()) {
            this._startTime = new Date();
            this._currentTrigger.start();
            this.emitTriggerEvent(true);
        }
    }

    stopTrigger() {
        if(this.isRunning()) {
            this._startTime = null;
            this._stopTime = new Date();
            this._currentTrigger.stop();
            this.emitTriggerEvent(false);
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
        this._currentTrigger = mode == ThermostatMode.Heating ? this._furnaceTrigger : this._acTrigger;
    }

    private targetIsWithinBounds(target: number) {
        return target >= this._configuration.TargetRange[0] && target <= this._configuration.TargetRange[1];
    }

    private isFirstRun() {
        return this._stopTime == null;
    }

    private emitTriggerEvent(start: boolean) {
        let topics = ['thermostat'];
        topics.push(this._configuration.Mode == ThermostatMode.Heating ? 'furnace' : 'ac');
        let value = start ? 'on' : 'off';

        this._eventEmitter.emitEvent(topics, value);
    }
}


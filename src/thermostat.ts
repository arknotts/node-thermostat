import * as Rx from 'rx';

import { ITempReader } from './tempReader';
import { IThermostatConfiguration, ThermostatMode } from './configuration';
import { MovingAverageTempReader } from './tempReader';
import { Dht11TempSensor } from './tempSensor';
import { ITrigger } from './trigger';
import { IThermostatEvent, ThermostatEventType } from './thermostatEvent';

export class Thermostat {

    private _target: number;
    private _targetOvershootBy: number;
    private _startTime: Date;
    private _stopTime: Date;
    private _currentTrigger: ITrigger;

    private _eventObserver: Rx.IObserver<IThermostatEvent>;
    public eventStream: Rx.IObservable<IThermostatEvent>;

    constructor(public configuration: IThermostatConfiguration, 
                private _tempReader: ITempReader, 
                private _furnaceTrigger: ITrigger, 
                private _acTrigger: ITrigger) {

        this.setMode(configuration.Mode);
    }

    get target(): number {
        return this._target;
    }

    start(): Rx.IObservable<IThermostatEvent> {
        let tempReaderObservable = this._tempReader.start();
        this.eventStream = Rx.Observable.create<IThermostatEvent>((observer) => {
            this._eventObserver = observer;
        }); 

        tempReaderObservable.subscribe(
            (temperature:number) => this.tempReceived(temperature),
            function (error) { console.error('Error reading temperature: %s', error); }
        );

        tempReaderObservable.subscribe((temperature) => {
            this.emitTemperatureEvent(temperature);
        });

        return this.eventStream;
    }

    stop() {
        this._tempReader.stop();
    }

    private tryStartTrigger(temp: number) {
        if(this.isRunning() && Date.now() - this._startTime.getTime() > this.configuration.MaxRunTime) {
            this.stopTrigger();
        }

        if(this.isFirstRun() || Date.now() - this._stopTime.getTime() > this.configuration.MinDelayBetweenRuns) {
            this._targetOvershootBy = Math.min(Math.abs(this.target - temp), this.configuration.MaxOvershootTemp)
            this.startTrigger();
        }
    }

    tempReceived(temp: number) {
        if(this.configuration.Mode == ThermostatMode.Heating) {
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

    private startTrigger() {
        if(!this.isRunning()) {
            this._startTime = new Date();
            this._currentTrigger.start();
            this.emitTriggerEvent(true);
        }
    }

    private stopTrigger() {
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
            if(target < this.configuration.TargetRange[0]) {
                this._target = this.configuration.TargetRange[0];
            }
            else if(target > this.configuration.TargetRange[1]) {
                this._target = this.configuration.TargetRange[1];
            }
        }
    }

    get mode(): ThermostatMode {
        return this.configuration.Mode;
    }

    setMode(mode: ThermostatMode) {
        this.configuration.Mode = mode;
        this.setTarget(this.configuration.DefaultTarget);
        this._currentTrigger = mode == ThermostatMode.Heating ? this._furnaceTrigger : this._acTrigger;
    }

    private targetIsWithinBounds(target: number) {
        return target >= this.configuration.TargetRange[0] && target <= this.configuration.TargetRange[1];
    }

    private isFirstRun() {
        return this._stopTime == null;
    }

    private emitTriggerEvent(start: boolean) {
        let topic = ['thermostat'];
        topic.push(this.configuration.Mode == ThermostatMode.Heating ? 'furnace' : 'ac');
        let value = start ? 'on' : 'off';

        this.emitEvent(<IThermostatEvent>{
            type: ThermostatEventType.Message,
            topic: topic,
            message: value
        });
    }

    private emitTemperatureEvent(temperature: number) {
        this.emitEvent(<IThermostatEvent>{
            type: ThermostatEventType.Message,
            topic: ['sensors', 'temperature', 'thermostat'],
            message: temperature.toString()
        });
    }

    private emitEvent(event: IThermostatEvent) {
        if(this._eventObserver != null) {
            this._eventObserver.onNext(event);
        }
    }
}


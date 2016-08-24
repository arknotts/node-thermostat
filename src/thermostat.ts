import Rx = require('@reactivex/rxjs');

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

    private _eventObservers: Rx.Observer<IThermostatEvent>[];
    public eventStream: Rx.Observable<IThermostatEvent>;

    constructor(public configuration: IThermostatConfiguration, 
                private _tempReader: ITempReader, 
                private _furnaceTrigger: ITrigger, 
                private _acTrigger: ITrigger) {
				
        this.setMode(configuration.Mode);
		this._eventObservers = [];
        this.eventStream = Rx.Observable.create((observer: Rx.Observer<IThermostatEvent>) => {
            this._eventObservers.push(observer);
        }); 
    }

    get target(): number {
        return this._target;
    }

    start(): Rx.Observable<IThermostatEvent> {
        let tempReaderObservable = this._tempReader.start();
		
        tempReaderObservable.subscribe(
            (temperature:number) => this.tempReceived(temperature),
            (error: string) => { console.error('Error reading temperature: %s', error); },
            () => { this.emitComplete(); }
        );

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

        this.emitTemperatureEvent(temp);
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
        if(target != this._target) {
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

            this.emitTargetEvent(target);
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

    private emitTargetEvent(target: number) {
        this.emitEvent(<IThermostatEvent>{
            type: ThermostatEventType.Message,
            topic: ['thermostat', 'target'],
            message: target.toString()
        });
    }

    private emitEvent(event: IThermostatEvent) {
        if(this._eventObservers) {
            this._eventObservers.forEach((observer) => {
				observer.next(event);
			});
        }
    }

	private emitComplete() {
        if(this._eventObservers) {
            this._eventObservers.forEach((observer) => {
				observer.complete();
			});
        }
    }
}


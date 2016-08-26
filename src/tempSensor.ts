import Rx = require('@reactivex/rxjs');

import { ITempSensorConfiguration } from './configuration';

export interface ITempSensor {
    start(): Rx.Observable<number>;
    stop(): void;
    pollSensor(): number;
}

export class Dht11TempSensor implements ITempSensor {
    private _start: boolean = false;
    private _timeoutId: any;

    constructor(private _configuration: ITempSensorConfiguration) {}
    
    start(): Rx.Observable<number> {
        this._start = true;
        
        return Rx.Observable.create((observer: Rx.Observer<number>) => {
            this.pollAndEmitTemperature(observer);
        });
    }

    stop() {
        // if(this._observer != null) {
        //     this._observer.onCompleted();
        // }
        this._start = false;
    }

    pollSensor(): number {
        return 70;
    }

    private pollAndEmitTemperature(observer: Rx.Observer<number>): void {
        if(this._start) {
            observer.next(this.pollSensor());
            this._timeoutId = setTimeout(() => { this.pollAndEmitTemperature(observer); }, this._configuration.TemperatureSensorPollDelay);
        }
        else {
            clearTimeout(this._timeoutId);
            observer.complete();
        }
    }
}
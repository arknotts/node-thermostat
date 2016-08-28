import Rx = require('@reactivex/rxjs');

import { ITempSensorConfiguration } from './configuration';

export interface ITempSensor {
    start(): Rx.Observable<number>;
    stop(): void;
    pollSensor(): number;
}

export abstract class BaseTempSensor implements ITempSensor {
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
        this._start = false;
    }

    abstract pollSensor(): number;

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

export class Dht11TempSensor extends BaseTempSensor {

    constructor(_configuration: ITempSensorConfiguration) {
        super(_configuration);
    }

    pollSensor(): number {
        return 70;
    }
}
import * as Rx from 'rx';

import { ITempSensorConfiguration } from './configuration';

export interface ITempSensor {
    start(): Rx.Observable<number>;
    stop(): void;
    pollSensor(): number;
}

export class Dht11TempSensor implements ITempSensor {
    private _start: boolean = false;

    constructor(private _configuration: ITempSensorConfiguration) {}
    
    start(): Rx.Observable<number> {
        this._start = true;
        
        return Rx.Observable.create<number>((observer) => {
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
        observer.onNext(this.pollSensor());

        if(this._start) {
            setTimeout(() => { this.pollAndEmitTemperature(observer); }, this._configuration.TemperatureSensorPollDelay);
        }
        else {
            observer.onCompleted();
        }
    }
}
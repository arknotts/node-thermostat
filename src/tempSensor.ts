import * as Rx from 'rx';

import { ITempSensorConfiguration } from './configuration';

export interface ITempSensor {
    start(): Rx.Observable<number>;
    stop(): void;
}

export class Dht11TempSensor implements ITempSensor {
    private _observer: Rx.Observer<number>;
    private _start: boolean = false;

    constructor(private _configuration: ITempSensorConfiguration) {

    }

    start(): Rx.Observable<number> {
        this._start = true;
        return Rx.Observable.create<number>((observer) => {
            this._observer = observer;
            this.getTemperature();
        });
    }

    stop() {
        this._start = false;
    }

    private pollSensor(): number {
        return 70;
    }

    private getTemperature(): void {
        let currentTemperature = this.pollSensor();
        
        this._observer.onNext(currentTemperature);

        if(this._start) {
            setTimeout(() => { this.getTemperature(); }, this._configuration.TemperatureSensorPollDelay);
        }
    }
}
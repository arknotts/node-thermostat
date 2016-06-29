/// <reference path="../typings/rx/rx.d.ts" />

//import Promise = require("bluebird");
import Rx = require('rx');

import { ITempSensor } from './tempSensor';

export interface ITempReader {
    start(): Rx.Observable<{}>;
    current(): number;
}

export class MovingAverageTempReader implements ITempReader {
    
    private _movingAverage: Array<number>;
    private _observer: Rx.Observer<number>;

    constructor(private _tempSensor: ITempSensor, private _movingAverageLength: number, private _pollDelay: number) {
        this._movingAverage = new Array<number>();
    }

    start(): Rx.Observable<{}> {
        return Rx.Observable.create((observer) => {
            this._observer = observer;
            this.pollSensor();
        });
    }

    pollSensor(): void {
        this._movingAverage.push(this._tempSensor.current());
        if(this._movingAverage.length > this._movingAverageLength) {
            this._movingAverage.shift();
        }

        this._observer.onNext(this.current());

        setTimeout(() => { this.pollSensor(); }, this._pollDelay);
    }
    
    current(): number {
        return this._movingAverage.reduce((prev, curr, i) => {return prev + (curr - prev)/(i+1)});
    }
}
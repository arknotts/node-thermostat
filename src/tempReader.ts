/// <reference path="../typings/rx/rx.d.ts" />

import Rx = require('rx');

import { ITempSensor } from './tempSensor';

export interface ITempReader {
    start(): Rx.Observable<number>;
    stop(): void;
    current(): number;
}

export class MovingAverageTempReader implements ITempReader {
    
    private _movingAverage: Array<number>;
    private _observer: Rx.Observer<number>;
    private _start: boolean = false;

    constructor(private _tempSensor: ITempSensor, private _movingAverageLength: number, private _pollDelay: number) {
        this._movingAverage = new Array<number>();
    }

    start(): Rx.Observable<number> {
        this._start = true;
        return this._tempSensor.start();
        //https://www.npmjs.com/package/rx-lite-aggregates
            //.takeLast(this._movingAverageLength);
        // return Rx.Observable.create<number>((observer) => {
        //     this._observer = observer;
        //     this.pollSensor();
        // });
    }

    stop() {
        this._start = false;
    }

    pollSensor(): void {
        // let currentTemperature = this._tempSensor.current();

        // if(!isNaN(currentTemperature)) {
        //     this._movingAverage.push(currentTemperature);
        //     if(this._movingAverage.length > this._movingAverageLength) {
        //         this._movingAverage.shift();
        //     }

        //     this._observer.onNext(this.current());
        // }

        // if(this._start) {
        //     setTimeout(() => { this.pollSensor(); }, this._pollDelay);
        // }
    }
    
    current(): number {
        // return this._movingAverage.reduce((prev, curr, i) => {return prev + (curr - prev)/(i+1)});
        return 0;
    }
}
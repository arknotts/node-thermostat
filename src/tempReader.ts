/// <reference path="../typings/rx/rx.d.ts" />

//import Promise = require("bluebird");
import Rx = require('rx');

import { ITempSensor } from './tempSensor';

export interface ITempReader {
    start(): void;
    current(): number;
    ready(): boolean;
}

export class MovingAverageTempReader implements ITempReader {
    
    private _movingAverage: Array<number>;
    private _observer: any;

    constructor(private _tempSensor: ITempSensor, private _movingAverageLength: number, private _pollDelay: number) {
        this._movingAverage = new Array<number>();
    }

    start() {
        let _this = this;
        return Rx.Observable.create(function (observer) {
            _this._observer = observer;
            _this.pollSensor();
            // Yield a single value and complete
            // observer.onNext(42);
            // observer.onCompleted();

            // // Any cleanup logic might go here
            // return function () {
            //     console.log('disposed');
            // }
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

    ready(): boolean {
        return this._movingAverage.length >= this._movingAverageLength;
    }

    done(): boolean {
        return this._movingAverage.length == this._movingAverageLength;
    }
}
import * as Rx from 'rx';

import { ITempSensor } from './tempSensor';

export interface ITempReader {
    start(): Rx.Observable<number>;
    stop(): void;
}

export class MovingAverageTempReader implements ITempReader {

    constructor(private _tempSensor: ITempSensor, private _windowSize: number) {}

    start(): Rx.Observable<number> {
        return this._tempSensor.start()
                    .windowWithCount(this._windowSize, 1)
                    .selectMany((temperatures) => {return temperatures.toArray();})
                    .map((temperatures) => {
                        let arrayAvg = temperatures.reduce((sum, a,i,ar) => { sum += a; return i==ar.length-1?(ar.length==0?0:sum/ar.length):sum},0);
                        return arrayAvg;
                    });
    }

    stop() {
        this._tempSensor.stop();
    }
}
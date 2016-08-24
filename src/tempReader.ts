import Rx = require('@reactivex/rxjs');

import { ITempSensor } from './tempSensor';

export interface ITempReader {
    start(): Rx.Observable<number>;
    stop(): void;
}

export class MovingAverageTempReader implements ITempReader {

    constructor(private _tempSensor: ITempSensor, private _windowSize: number) {}

    start(): Rx.Observable<number> {
        return this._tempSensor.start()
                    .windowCount(this._windowSize, 1)
					.map((x: Rx.Observable<number>) => {
							return x.reduce((acc, num) => { return acc + num; })
									.map((x: number) => { return x/(this._windowSize); })
						}
					)
					.flatMap((v, i) => v);
    }

    stop() {
        this._tempSensor.stop();
    }
}
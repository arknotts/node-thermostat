import { ITempSensor } from './tempSensor';

export interface ITempReader {
    current(): number;
}

export class MovingAverageTempReader implements ITempReader {
    
    private _movingAverage: Array<number>;

    constructor(private _tempSensor: ITempSensor, private _movingAverageLength: number, private _pollDelay: number) {
        this._movingAverage = new Array<number>();
        this.init();
    }

    init(): void {
        this.pollSensor();
    }

    pollSensor(): void {
        this._movingAverage.push(this._tempSensor.current());
        if(this._movingAverage.length > this._movingAverageLength) {
            this._movingAverage.shift();
        }

        setTimeout(this.pollSensor, this._pollDelay);
    }
    
    current(): number {
        return this._movingAverage.reduce((prev, curr, i) => {return prev + (curr - prev)/(i+1)});
    }
}
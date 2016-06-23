import { ITempReader } from './tempReader';
import { IConfiguration } from './configuration';
import { MovingAverageTempReader } from './tempReader';
import { Dht11TempSensor } from './tempSensor';

export class Thermostat {
    constructor(private _configuration: IConfiguration, private _tempReader: ITempReader) {
        
    }

    init() {
        this.poll();
    }

    poll() {
        var temperature = this._tempReader.current();

        //TODO

        setTimeout(this.poll, this._configuration.PollDelay);
    }

    setTarget(target: number) {

    }
}

let tr = new MovingAverageTempReader(new Dht11TempSensor(), 5, 500);
tr.start().subscribe(
    function (x) { console.log('onNext: %s', x); },
  function (e) { console.log('onError: %s', e); },
  function () { console.log('onCompleted'); }
);


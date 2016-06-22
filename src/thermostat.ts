import { ITempReader } from './tempReader';
import { IConfiguration } from './configuration';

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
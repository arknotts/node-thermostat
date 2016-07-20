export interface ITempSensorConfiguration {
    TemperatureSensorPollDelay: number;
}

export interface IThermostatConfiguration {
    TargetRange: Array<number>;
    Mode: ThermostatMode;
    DefaultTarget: number;
    MaxOvershootTemp: number;
    MaxRunTime: number;
    MinDelayBetweenRuns: number;
    TempSensorConfiguration: ITempSensorConfiguration;

    TempEmitDelay: number;
}

export enum ThermostatMode {
    Heating,
    Cooling
}

export class ThermostatConfiguration implements IThermostatConfiguration {

    constructor(private _heatingTargetRange: Array<number>,
                private _coolingTargetRange: Array<number>,
                public Mode: ThermostatMode,
                public MaxOvershootTemp: number,
                public MaxRunTime: number,
                public MinDelayBetweenRuns: number,
                public TempSensorConfiguration: ITempSensorConfiguration,
                public TempEmitDelay: number) {

    }

    get TargetRange(): Array<number> {
        return this.Mode == ThermostatMode.Heating ? this._heatingTargetRange : this._coolingTargetRange;
    }

    get DefaultTarget(): number {
        return this.Mode == ThermostatMode.Heating ? this._heatingTargetRange[0] : this._coolingTargetRange[1];
    }
}

export class TempSensorConfiguration implements ITempSensorConfiguration {

    constructor(public TemperatureSensorPollDelay: number) {
        
    }

}
export interface IConfiguration {
    TargetRange: Array<number>;
    Mode: ThermostatMode;
    DefaultTarget: number;
    MaxOvershootTemp: number;
}

export enum ThermostatMode {
    Heating,
    Cooling
}

export class Configuration implements IConfiguration {
    constructor(private _heatingTargetRange: Array<number>,
                private _coolingTargetRange: Array<number>,
                public Mode: ThermostatMode,
                public MaxOvershootTemp: number) {

    }

    get TargetRange(): Array<number> {
        return this.Mode == ThermostatMode.Heating ? this._heatingTargetRange : this._coolingTargetRange;
    }

    get DefaultTarget(): number {
        return this.Mode == ThermostatMode.Heating ? this._heatingTargetRange[0] : this._coolingTargetRange[1];
    }
}
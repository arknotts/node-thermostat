export enum ThermostatEventType {
    Message,
    Error,
    Warning
}

export interface IThermostatEvent {
    type: ThermostatEventType;
    topic: Array<string>;
    message: string;
}
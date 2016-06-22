export interface ITempSensor {
    current(): number;
}

export class Dht11TempSensor implements ITempSensor {
    current(): number {
        return 70;
    }
}
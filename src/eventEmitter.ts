export interface IEventEmitter {
    emitEvent(topics: Array<string>, value: string): void;
}

export class ConsoleEventEmitter implements IEventEmitter {
    emitEvent(topics: Array<string>, value: string) {
        console.log(topics.join('/'), value);
    }
}
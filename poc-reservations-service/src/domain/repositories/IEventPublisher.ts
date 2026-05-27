export interface IEventPublisher {
  publish(topic: string, event: any): Promise<void>;
}
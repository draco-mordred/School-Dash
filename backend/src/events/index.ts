import { EventEmitter } from "events";

export type SystemEventPayload = {
  source: string;
  name: string;
  timestamp: string;
  data: Record<string, unknown>;
};

const eventBus = new EventEmitter();

export function emitSystemEvent(eventName: string, data: Record<string, unknown>) {
  const payload: SystemEventPayload = {
    source: "backend",
    name: eventName,
    timestamp: new Date().toISOString(),
    data,
  };

  eventBus.emit(eventName, payload);
}

export function subscribeSystemEvent(eventName: string, listener: (payload: SystemEventPayload) => void) {
  eventBus.on(eventName, listener);
}

export default {
  emitSystemEvent,
  subscribeSystemEvent,
};

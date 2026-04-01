export type SseEvent = {
  type: string;
  payload: unknown;
};

type Client = {
  id: string;
  write: (chunk: string) => void;
  close: () => void;
};

export class SseService {
  private clients = new Map<string, Client>();

  addClient(client: Client) {
    this.clients.set(client.id, client);
  }

  removeClient(id: string) {
    this.clients.get(id)?.close();
    this.clients.delete(id);
  }

  broadcast(event: SseEvent) {
    const chunk = `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
    for (const client of this.clients.values()) {
      client.write(chunk);
    }
  }

  ping() {
    for (const client of this.clients.values()) {
      client.write(": keep-alive\n\n");
    }
  }
}


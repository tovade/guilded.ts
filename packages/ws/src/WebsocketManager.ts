import Websocket from 'ws';
import EventEmitter from 'events';
import {
	APIClientUser,
	WSEvents,
	WSMessagePayload,
	WSOpCodes,
	WSReadyPayload,
} from 'guilded-api-typings';

const { version } = require('../package.json');

/** The Websocket manager for the Guilded API. */
export class WebsocketManager extends EventEmitter {
	/** The auth token for the websocket. */
	public token?: string;
	/** The version of the Websocket API. */
	public readonly version: number;
	/** The websocket. */
	public socket?: Websocket;
	/** The date the websocket is ready. */
	public readyAt?: Date;
	/** The ping of the websocket connection. */
	public ping?: number;
	/** The date the websocket was pinged. */
	public pingedAt?: Date;
	/** The anount of times the websocket has been reconnected. */
	public reconnects = 0;
	/** The last message ID. */
	public lastMessageId?: string;

	/** @param options The options for the Websocket manager. */
	public constructor(public readonly options: WebsocketOptions) {
		super();
		this.token = options.token;
		this.version = options.version;
	}

	/** Whether the websocket is ready. */
	public get isReady() {
		return !!this.readyAt ?? false;
	}

	/** The timestamp of when the websocket is ready. */
	public get readyTimestamp() {
		return this.readyAt?.getTime();
	}

	/** The timestamp the websocket was pinged. */
	public get pingedTimestamp() {
		return this.pingedAt?.getTime();
	}

	/** How long the websocket has been connected. */
	public get uptime() {
		return this.isReady ? Date.now() - this.readyTimestamp! : undefined;
	}

	/** The URL of the Websocket. */
	public get url(): `wss://api.guilded.gg/v${number}/websocket` {
		return `wss://api.guilded.gg/v${this.version}/websocket`;
	}

	/**
	 * Connect to the Websocket API.
	 * @param token The auth token.
	 * @returns The Websocket manager.
	 */
	public connect(token: string = this.token!) {
		this.token = token;
		this.socket = new Websocket(this.url, {
			headers: {
				Authorization: `Bearer ${this.token}`,
				'User-Agent': `@guildedts/ws@${version} Node.JS@${process.versions.node}`,
				'guilded-last-message-id': this.lastMessageId ?? '',
			},
		});
		this.socket.on('close', this.onSocketDisconnect.bind(this));
		this.socket.on('message', (raw) => {
			const data: WSMessagePayload = JSON.parse(raw.toString());
			this.emit('raw', data);
			this.onSocketMessage(data);
		});
		this.socket.on('ping', this.onSocketPing.bind(this));
		this.socket.on('pong', this.onSocketPong.bind(this));
		return this;
	}

	/**
	 * Disconnect from the Websocket API.
	 * @returns The websocket manager.
	 */
	public disconnect() {
		if (!this.socket || !this.socket.OPEN) throw new Error('Websocket is not connected.');
		this.socket.terminate();
		return this;
	}

	/** @ignore */
	private onSocketDisconnect() {
		this.socket = undefined;
		this.readyAt = undefined;
		if (!this.options.reconnect || this.reconnects >= (this.options.maxReconnects ?? Infinity))
			return this.emit('disconnect', this);
		this.reconnects++;
		this.connect();
		this.emit('reconnect', this);
	}

	/** @ignore */
	private onSocketMessage({ op, t, d, s }: WSMessagePayload) {
		if (s) this.lastMessageId = s;
		switch (op) {
			case WSOpCodes.Event:
				this.emit('event', t as any, d);
				break;
			case WSOpCodes.Ready:
				this.socket?.emit('ping');
				this.readyAt = new Date();
				this.emit('ready', (d as WSReadyPayload).user);
				break;
			case WSOpCodes.Resume:
				delete this.lastMessageId;
				break;
		}
	}

	/** @ignore */
	private onSocketPing() {
		this.pingedAt = new Date();
		this.socket!.ping();
	}

	/** @ignore */
	private onSocketPong() {
		this.ping = Date.now() - this.pingedTimestamp!;
	}
}

export interface WebsocketManager {
	/** @ignore */
	on<Event extends keyof WSManagerEvents>(
		event: Event,
		listener: (...args: WSManagerEvents[Event]) => any,
	): this;
	/** @ignore */
	once<Event extends keyof WSManagerEvents>(
		event: Event,
		listener: (...args: WSManagerEvents[Event]) => any,
	): this;
	/** @ignore */
	off<Event extends keyof WSManagerEvents>(
		event: Event,
		listener: (...args: WSManagerEvents[Event]) => any,
	): this;
	/** @ignore */
	emit<Event extends keyof WSManagerEvents>(
		event: Event,
		...args: WSManagerEvents[Event]
	): boolean;
}

/** The options for the Websocket manager. */
export interface WebsocketOptions {
	/** The auth token for the Websocket API. */
	token?: string;
	/** The version of the Websocket API. */
	version: number;
	/** The maximum number of reconnect attempts. */
	maxReconnects?: number;
	/** Whether to allow reconnects. */
	reconnect?: boolean;
}

/** The websocket manager events. */
export interface WSManagerEvents {
	/** Emitted when the Websocket is connected. */
	ready: [user: APIClientUser];
	/** Emitted when the Websocket is reconnected. */
	reconnect: [ws: WebsocketManager];
	/** Emitted when the Websocket is disconnected. */
	disconnect: [ws: WebsocketManager];
	/** Emitted when a message is received. */
	raw: [data: WSMessagePayload];
	/** Emitted when data is received from the Websocket API. */
	event: {
		[Event in keyof WSEvents]: [event: Event, data: WSEvents[Event]];
	}[keyof WSEvents];
}

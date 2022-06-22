import {
	APICalendarEvent,
	APICalendarEventEditPayload,
	APICalendarEventPayload,
	APIFetchCalendarEventsQuery,
	Routes,
} from 'guilded-api-typings';
import { BaseRouter } from './BaseRouter';

/** The calendar event router for the Guilded REST API. */
export class CalendarEventRouter extends BaseRouter {
	/**
	 * Fetch a calendar event from Guilded.
	 * @param channelId The ID of the channel the calendar event belongs to.
	 * @param calendarEventId The ID of the calendar event to fetch.
	 * @returns The fetched calendar event.
	 */
	public fetch(channelId: string, calendarEventId: number): Promise<APICalendarEvent>;
	/**
	 * Fetch calendar events from Guilded.
	 * @param channelId The ID of the channel the calendar events belong to.
	 * @param options The options to fetch calendar events with.
	 * @returns The fetched calendar events.
	 */
	public fetch(
		channelId: string,
		options?: APIFetchCalendarEventsQuery,
	): Promise<APICalendarEvent[]>;
	/** @ignore */
	public fetch(
		channelId: string,
		calendarEventIdOrOptions?: number | APIFetchCalendarEventsQuery,
	) {
		if (typeof calendarEventIdOrOptions === 'number')
			return this.fetchSingle(channelId, calendarEventIdOrOptions);
		return this.fetchMany(channelId, calendarEventIdOrOptions);
	}

	/** @ignore */
	private async fetchSingle(channelId: string, calendarEventId: number) {
		const { calendarEvent } = await this.rest.get<{ calendarEvent: APICalendarEvent }>(
			Routes.calendarEvent(channelId, calendarEventId),
		);
		return calendarEvent;
	}

	/** @ignore */
	private async fetchMany(channelId: string, options?: APIFetchCalendarEventsQuery) {
		const { calendarEvents } = await this.rest.get<
			{ calendarEvents: APICalendarEvent[] },
			APIFetchCalendarEventsQuery
		>(Routes.calendarEvents(channelId), options);
		return calendarEvents;
	}

	/**
	 * Create a calendar event on Guilded.
	 * @param channelId The ID of the channel the calendar event belongs to.
	 * @param payload The payload of the calendar event.
	 * @returns The created calendar event.
	 */
	public async create(channelId: string, payload: APICalendarEventPayload) {
		const { calendarEvent } = await this.rest.post<
			{ calendarEvent: APICalendarEvent },
			APICalendarEventPayload
		>(Routes.calendarEvents(channelId), payload);
		return calendarEvent;
	}

	/**
	 * Edit a calendar event on Guilded.
	 * @param channelId The ID of the channel the calendar event belongs to.
	 * @param calendarEventId The ID of the calendar event to edit.
	 * @param payload The payload of the calendar event.
	 * @returns The edited calendar event.
	 */
	public async edit(
		channelId: string,
		calendarEventId: number,
		payload: APICalendarEventEditPayload,
	) {
		const { calendarEvent } = await this.rest.patch<
			{ calendarEvent: APICalendarEvent },
			APICalendarEventEditPayload
		>(Routes.calendarEvent(channelId, calendarEventId), payload);
		return calendarEvent;
	}

	/**
	 * Delete a calendar event from Guilded.
	 * @param channelId The ID of the channel the calendar event belongs to.
	 * @param calendarEventId The ID of the calendar event to delete.
	 */
	public delete(channelId: string, calendarEventId: number) {
		return this.rest.delete<void>(Routes.calendarEvent(channelId, calendarEventId));
	}
}

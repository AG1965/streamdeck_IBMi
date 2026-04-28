import {
	action,
	DidReceiveSettingsEvent,
	KeyAction,
	KeyDownEvent,
	SingletonAction,
	WillAppearEvent,
	WillDisappearEvent
} from "@elgato/streamdeck";

type StatusSettings = {
	webserviceUrl?: string;
	interval?: number;
	threshold_warn?: number;
	threshold_alert?: number;
};

type StatusResponse = {
	LPAR?: string;
	ASP_USED?: number | string;
	JOBS_IN_MSGW?: Array<{
		JOB?: string;
	}>;
};

type MonitorInstance = {
	action: KeyAction<StatusSettings>;
	settings: Required<StatusSettings>;
	timer?: NodeJS.Timeout;
	stopped: boolean;
};

type RenderState = "green" | "orange" | "red" | "grey";

type KeyImageContent = {
	lpar?: string;
	primary: string;
	secondary?: string;
	tertiary?: string;
};

const DEFAULTS: Required<StatusSettings> = {
	webserviceUrl: "",
	interval: 30,
	threshold_warn: 80,
	threshold_alert: 90
};

const STATE_COLORS: Record<RenderState, string> = {
	green: "#2f9e44",
	orange: "#f08c00",
	red: "#c92a2a",
	grey: "#6c757d"
};



@action({ UUID: "dev.agomb.ibmimonitor.status" })
export class StatusMonitorAction extends SingletonAction<StatusSettings> {
	private readonly monitors = new Map<string, MonitorInstance>();

	override async onWillAppear(ev: WillAppearEvent<StatusSettings>): Promise<void> {
		if (!ev.action.isKey()) {
			return;
		}

		const settings = this.normalizeSettings(ev.payload.settings);
		await this.persistNormalizedSettings(ev.action, ev.payload.settings, settings);
		this.startMonitoring(ev.action, settings);
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<StatusSettings>): Promise<void> {
		if (!ev.action.isKey()) {
			return;
		}

		const settings = this.normalizeSettings(ev.payload.settings);
		await this.persistNormalizedSettings(ev.action, ev.payload.settings, settings);
		this.startMonitoring(ev.action, settings);
	}

	private async persistNormalizedSettings(
		action: KeyAction<StatusSettings>,
		current: StatusSettings,
		normalized: Required<StatusSettings>
	): Promise<void> {
		const currentNormalized = this.normalizeSettings(current);
		const unchanged =
			currentNormalized.webserviceUrl === normalized.webserviceUrl
			&& currentNormalized.interval === normalized.interval
			&& currentNormalized.threshold_warn === normalized.threshold_warn
			&& currentNormalized.threshold_alert === normalized.threshold_alert;

		if (unchanged) {
			return;
		}

		await action.setSettings(normalized);
	}

	override onWillDisappear(ev: WillDisappearEvent<StatusSettings>): void {
		this.stopMonitoring(ev.action.id);
	}

	override async onKeyDown(ev: KeyDownEvent<StatusSettings>): Promise<void> {
		const monitor = this.monitors.get(ev.action.id);
		if (!monitor) {
			return;
		}

		await this.pollOnce(monitor);
	}

	private normalizeSettings(settings: StatusSettings): Required<StatusSettings> {
		const normalizedUrl = (settings.webserviceUrl ?? "").trim();
		const interval = this.clampNumber(settings.interval, 1, 86400, DEFAULTS.interval);
		const warn = this.clampNumber(settings.threshold_warn, 0, 100, DEFAULTS.threshold_warn);
		const alertRaw = this.clampNumber(settings.threshold_alert, 0, 100, DEFAULTS.threshold_alert);
		const alert = Math.max(alertRaw, warn);

		return {
			webserviceUrl: normalizedUrl,
			interval,
			threshold_warn: warn,
			threshold_alert: alert
		};
	}

	private clampNumber(value: unknown, min: number, max: number, fallback: number): number {
		let numericValue: number;
		if (typeof value === "number") {
			numericValue = value;
		} else if (typeof value === "string" && value.trim().length > 0) {
			numericValue = Number.parseFloat(value);
		} else {
			return fallback;
		}

		if (Number.isNaN(numericValue)) {
			return fallback;
		}

		return Math.min(max, Math.max(min, numericValue));
	}

	private startMonitoring(action: KeyAction<StatusSettings>, settings: Required<StatusSettings>): void {
		this.stopMonitoring(action.id);

		const monitor: MonitorInstance = {
			action,
			settings,
			stopped: false
		};

		this.monitors.set(action.id, monitor);
		this.scheduleNextPoll(monitor, 0);
	}

	private stopMonitoring(actionId: string): void {
		const monitor = this.monitors.get(actionId);
		if (!monitor) {
			return;
		}

		monitor.stopped = true;
		if (monitor.timer) {
			clearTimeout(monitor.timer);
		}

		this.monitors.delete(actionId);
	}

	private scheduleNextPoll(monitor: MonitorInstance, delayMs: number): void {
		if (monitor.stopped) {
			return;
		}

		monitor.timer = setTimeout(async () => {
			await this.pollOnce(monitor);
			this.scheduleNextPoll(monitor, monitor.settings.interval * 1000);
		}, delayMs);
	}

	private async pollOnce(monitor: MonitorInstance): Promise<void> {
		if (monitor.stopped) {
			return;
		}

		const { action, settings } = monitor;
		if (!settings.webserviceUrl) {
			await this.renderGrey(action, "NO URL");
			return;
		}

		try {
			const response = await fetch(settings.webserviceUrl, {
				headers: {
					"Cache-Control": "no-cache"
				},
				signal: AbortSignal.timeout(10000)
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const data = (await response.json()) as StatusResponse;
			await this.renderFromResponse(action, data, settings);
		} catch {
			await this.renderGrey(action, "NO DATA");
		}
	}

	private async renderFromResponse(
		action: KeyAction<StatusSettings>,
		data: StatusResponse,
		settings: Required<StatusSettings>
	): Promise<void> {
		const lpar = this.normalizeLpar(data.LPAR);
		const jobs = Array.isArray(data.JOBS_IN_MSGW)
			? data.JOBS_IN_MSGW.map((entry) => entry.JOB?.trim() ?? "").filter((value) => value.length > 0)
			: [];

		if (jobs.length > 0) {
			await this.renderState(action, "red", {
				lpar,
				primary: "MSGW",
				secondary: this.shortenText(jobs[0] ?? "", 18),
				tertiary: jobs.length > 1 ? `+${jobs.length - 1} more` : undefined
			});
			return;
		}

		const usage = this.parseUsage(data.ASP_USED);
		if (usage === undefined) {
			await this.renderGrey(action, "NO DATA", lpar);
			return;
		}

		const usageText = `${usage.toFixed(1)}%`;
		if (usage >= settings.threshold_alert) {
			await this.renderState(action, "red", {
				lpar,
				primary: usageText,
				secondary: "ASP used"
			});
			return;
		}

		if (usage >= settings.threshold_warn) {
			await this.renderState(action, "orange", {
				lpar,
				primary: usageText,
				secondary: "ASP used"
			});
			return;
		}

		await this.renderState(action, "green", {
			lpar,
			primary: usageText,
			secondary: "ASP used"
		});
	}

	private parseUsage(value: number | string | undefined): number | undefined {
		if (typeof value === "number") {
			return Number.isFinite(value) ? value : undefined;
		}

		if (typeof value === "string") {
			const parsed = Number.parseFloat(value);
			return Number.isFinite(parsed) ? parsed : undefined;
		}

		return undefined;
	}

	private normalizeLpar(value: string | undefined): string | undefined {
		if (typeof value !== "string") {
			return undefined;
		}

		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	}

	private shortenText(value: string, maxLength: number): string {
		return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
	}

	private escapeXml(value: string): string {
		return value
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll('"', "&quot;")
			.replaceAll("'", "&apos;");
	}

	private buildKeyImage(state: RenderState, content: KeyImageContent): string {
		const headerText = this.escapeXml(this.shortenText(content.lpar ?? "IBM i", 14));
		const primaryText = this.escapeXml(this.shortenText(content.primary, 18));
		const secondaryText = content.secondary ? this.escapeXml(this.shortenText(content.secondary, 20)) : "";
		const tertiaryText = content.tertiary ? this.escapeXml(this.shortenText(content.tertiary, 18)) : "";
		const tertiaryMarkup = tertiaryText.length > 0
			? `<text x="72" y="124" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#f8f9fa">${tertiaryText}</text>`
			: "";

		const svg = [
			`<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">`,
			`<rect width="144" height="144" rx="18" ry="18" fill="${STATE_COLORS[state]}"/>`,
			`<rect x="8" y="8" width="128" height="24" rx="12" ry="12" fill="#000000" fill-opacity="0.22"/>`,
			`<text x="72" y="24" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="#ffffff">${headerText}</text>`,
			`<text x="72" y="76" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" font-weight="bold" fill="#ffffff">${primaryText}</text>`,
			`<text x="72" y="104" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" fill="#f8f9fa">${secondaryText}</text>`,
			tertiaryMarkup,
			`</svg>`
		].join("");

		return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
	}

	private async renderState(action: KeyAction<StatusSettings>, state: RenderState, content: KeyImageContent): Promise<void> {
		await action.setImage(this.buildKeyImage(state, content));
		await action.setTitle("");
	}

	private async renderGrey(action: KeyAction<StatusSettings>, title: string, lpar?: string): Promise<void> {
		await this.renderState(action, "grey", {
			lpar,
			primary: title,
			secondary: lpar ? "Monitor unavailable" : undefined
		});
	}
}

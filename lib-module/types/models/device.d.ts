import { BaseGetCall } from "../index.js";
import { DateRangeSearch } from "./dateRangeSearch.js";
import { DeviceFlags } from "./deviceFlags.js";
import { Entity } from "./entity.js";
import { EntitySearch } from "./entitySearch.js";
import { Group, GroupEntitySearch } from "./group.js";

export type DeviceType = "CustomDevice" | "CustomVehicleDevice" | "GO2" | "GO3" | "GO4" | "GO4v3" | "GO5" | "GO6" | "GO7" | "GO8" | "GO9" | "GoDriveDevice" | "None" | "OldGeotab"

export type DeviceCall = {
	typeName: "Device"
}

export type DeviceSetCall = DeviceCall & {
	entity: Device
}

export interface DeviceSearch extends EntitySearch, DateRangeSearch, GroupEntitySearch {
	comment?: string;
	deviceIds?: string[];
	deviceType?: DeviceType
	serialNumber?: string;
	name?: string
	keywords?: string;
	licensePlate?: string;
	vehicleIdentificationNumber?: string;
}

export type DeviceGetCall = DeviceCall & BaseGetCall & { search: DeviceSearch }

export type DeviceEntityIdSearch = Pick<Device, "id">;
export type DeviceGroupSearch = { groups?: Pick<Group, "id">[] }

export interface DeviceEntitySearch { deviceSearch?: DeviceEntityIdSearch}

export interface DeviceEntityAndGroupSearch { deviceSearch?: DeviceEntityIdSearch & DeviceGroupSearch }

export interface Device extends Entity {
	obdAlertEnabled: boolean;
	auxWarningSpeed: number[];
	enableAuxWarning: boolean[];
	enableControlExternalRelay: boolean;
	externalDeviceShutDownDelay: number;
	immobilizeArming: number;
	immobilizeUnit: boolean;
	isAuxIgnTrigger: boolean[];
	isAuxInverted: boolean[];
	accelerationWarningThreshold: number;
	accelerometerThresholdWarningFactor: number;
	brakingWarningThreshold: number;
	corneringWarningThreshold: number;
	enableBeepOnDangerousDriving: boolean;
	enableBeepOnRpm: boolean;
	engineHourOffset: number;
	isActiveTrackingEnabled: boolean;
	isDriverSeatbeltWarningOn: boolean;
	isPassengerSeatbeltWarningOn: boolean;
	isReverseDetectOn: boolean;
	isIoxConnectionEnabled: boolean;
	odometerFactor: number;
	odometerOffset: number;
	rpmValue: number;
	seatbeltWarningSpeed: number;
	activeFrom: string;
	activeTo: string;
	autoGroups: any[];
	customParameters: any[];
	disableBuzzer: boolean;
	enableBeepOnIdle: boolean;
	enableMustReprogram: boolean;
	enableSpeedWarning: boolean;
	engineType: string;
	engineVehicleIdentificationNumber: string;
	ensureHotStart: boolean;
	gpsOffDelay: number;
	idleMinutes: number;
	isSpeedIndicator: boolean;
	licensePlate: string;
	licenseState: string;
	major: number;
	minAccidentSpeed: number;
	minor: number;
	parameterVersion: number;
	pinDevice: boolean;
	speedingOff: number;
	speedingOn: number;
	vehicleIdentificationNumber: string;
	goTalkLanguage: string;
	fuelTankCapacity: number;
	disableSleeperBerth: boolean;
	autoHos: string;
	parameterVersionOnDevice: number;
	comment: string;
	groups: Group[];
	timeZoneId: string;
	deviceFlags: DeviceFlags;
	deviceType: DeviceType;
	ignoreDownloadsUntil: string;
	maxSecondsBetweenLogs: number;
	name: string;
	productId: number;
	serialNumber: string;
	timeToDownload: string;
	workTime: string;
	devicePlans: string[];
	customFeatures: CustomFeatures;
}

interface CustomFeatures {
}


import { AnnotationLogGetCall } from './models/annotation.js'
import { DeviceGetCall, DeviceSearch, DeviceSetCall } from './models/device.js'
import { DeviceStatusInfoGetCall } from './models/deviceStatusInfo.js'
import { DiagnosticGetCall } from './models/diagnostic.js'
import { DistributionListGetCall, DistributionListSetCall } from './models/distributionList.js'
import { DriverChangeGetCall } from './models/driverChange.js'
import { DutyStatusLogGetCall, DutyStatusLogSetCall } from './models/dutyStatusLog.js'
import { DVIRLogGetCall, DVIRLogSetCall } from './models/dvirLog.js'
import { Entity } from './models/entity.js'
import { ExceptionEventGetCall, ExceptionEventSetCall } from './models/exception.js'
import { FaultDataGetCall, FaultDataSetCall } from './models/faultData.js'
import { GroupGetCall } from './models/group.js'
import { LogRecordGetCall, LogRecordSetCall } from './models/logRecord.js'
import { MediaFileGetCall } from './models/mediaFile.js'
import { RuleGetCall, RuleSetCall } from './models/rule.js'
import { StatusDataGetCall, StatusDataSetCall } from './models/statusData.js'
import { TagGetCall } from './models/tag.js'
import { TripGetCall } from './models/trip.js'
import { TypeName } from './models/typeName.js'
import { UnitOfMeasureGetCall } from './models/unitOfMeasure.js'
import { UserGetCall, UserSetCall } from './models/user.js'
import { ZoneGetCall, ZoneSetCall } from './models/zone.js'
import { ZoneTypeSetCall } from './models/zoneType.js'

export { DecodeVinResponse } from './models/decodeVin.js'

export { TypeName } from './models/typeName.js'
export { Entity } from './models/entity.js'
export { AnnotationLog } from './models/annotation.js'
export { Device } from './models/device.js'
export { DeviceEntity } from './models/deviceEntity.js'
export { DeviceStatusInfo } from './models/deviceStatusInfo.js'
export { DistributionList } from './models/distributionList.js'
export { Diagnostic } from './models/diagnostic.js'
export { DriverChange } from './models/driverChange.js'
export { DutyStatusLog } from './models/dutyStatusLog.js'
export { Exception, ExceptionEvent } from './models/exception.js'
export { FaultData } from './models/faultData.js'
export { Group } from './models/group.js'
export { LogRecord } from './models/logRecord.js'
export { MediaFile } from './models/mediaFile.js'
export { StatusData } from './models/statusData.js'
export { Tag } from './models/tag.js'
export { Trailer } from './models/trailer.js'
export { UnitOfMeasure } from './models/unitOfMeasure.js'
export { Rule } from './models/rule.js'
export { Trip } from './models/trip.js'
export { User } from './models/user.js'
export { Zone } from './models/zone.js'
export { GetAddressResponse } from './models/getAddress.js'

/**
 * Entrypoint to API. Separate class is used to expose "public"
 * methods only to the user - Babel currently doesn't support
 * ES10 access modifiers
 */
export class GeotabApi {
  /**
   * Constructor for GeotabApi
   *
   * @param {Object} authentication Holds credentials: {
   *                                  userName: '',
   *                                  password/sessionId: '',
   *                                  database: ''
   *                              }
   *                                  path: '',
   * @param {*} newOptions overrides default options
   */
  constructor(
    authentication?: GeotabAuthentication,
    newOptions?: GeotabApiOptions
  );

  /**
   * Authenticates the user against the server. Gets the sessionId and other relevant session information
   *
   * @param {function} callbackSuccess optional callback for successful authentications
   * @param {function} callbackError optional callback for unsuccessful authentications
   * @returns {promise} Call promise - result will be either response.data.error or response.data.result
   */
  authenticate(
    callbackSuccess?: Function,
    callbackError?: Function
  ): Promise<any>;
  /**
   * Constructs an API call to MyGeotab
   *
   * @param {string} method method name for the API call
   * @param {Object} params method's parameters
   * @param {function} callbackSuccess Optional callback for successful calls
   * @param {function} callbackError Optional callback for unsuccessful calls
   * @returns {promise} an axios promise which will resolve to either data.error or data.result
   */
  call(
    method: string,
    params: GeotabCall,
    callbackSuccess?: Function,
    callbackError?: Function
  ): Promise<any>;
  /**
   *  Constructs a multicall to myGeotab
   *
   * @param {array} calls array of calls to be included in the multicall
   * @param {function} callbackSuccess optional callback function for successful multicalls
   * @param {function} callbackError optional callback function for unsuccessful multicalls
   * @returns {promise} returns call promise
   */
  multiCall(
    calls: GeotabMultiCallParams,
    callbackSuccess?: Function,
    callbackError?: Function
  ): Promise<any>;
  /**
   * Gets a stored or new session
   * @param {function} callbackSuccess optional callback for successes
   * @param {boolean} newSession override any stored credentials and fetch a new session
   * @returns {promise} returns call promise
   */
  getSession(
    callbackSuccess?: Function,
    newSession?: boolean
  ): Promise<GeotabSession>;
  /**
   * Forgets the session in local storage
   * Resets session with already provided credentials
   */
  forget(): Promise<any>;
}

export interface FeedSearch {
  fromDate?: string;
}

export interface BaseGetCall {
  resultsLimit?: number;
}

export interface FeedCall extends BaseGetCall {
  typeName: TypeName;
  fromVersion?: string | null;
  search: FeedSearch;
}

export interface FeedResult<T extends Entity> {
  data: T[];
  toVersion: string;
}

export type GenericSetCall = {
  typeName: TypeName;
  entity: Entity;
}

export type GeotabSetCall = 
DeviceSetCall 
| DistributionListSetCall 
| DutyStatusLogSetCall
| DVIRLogSetCall
| ExceptionEventSetCall 
| FaultDataSetCall 
| LogRecordSetCall 
| RuleSetCall 
| StatusDataSetCall 
| UserSetCall
| ZoneSetCall
| ZoneTypeSetCall;

export type GeotabGetCall = 
AnnotationLogGetCall
| DeviceGetCall
| DeviceStatusInfoGetCall
| DiagnosticGetCall
| DistributionListGetCall
| DriverChangeGetCall
| DutyStatusLogGetCall
| DVIRLogGetCall
| ExceptionEventGetCall
| FaultDataGetCall
| GroupGetCall
| LogRecordGetCall
| MediaFileGetCall
| StatusDataGetCall
| RuleGetCall
| TagGetCall
| TripGetCall
| UnitOfMeasureGetCall
| UserGetCall
| ZoneGetCall;

export type GeotabCall = GeotabGetCall | GeotabSetCall;

export type GeotabMultiGetCall = ["Get", GeotabGetCall]
export type GeotabMultiSetCall = ["Set", GeotabSetCall]

export type GeotabMultiCallParams = (GeotabMultiGetCall | GeotabMultiSetCall)[];

export interface GeotabSession {
  path: string;
  credentials: GeotabCredentials;
}

export interface GeotabAuthentication {
  credentials: GeotabCredentials;
  path?: string;
}

export interface GeotabCredentials {
  database: string;
  userName: string;
  password?: string;
  sessionId?: string;
}

export interface GeotabApiOptions {
  fullResponse?: boolean;
  rememberMe?: boolean;
  timeout?: number;
  newCredentialsStore?: boolean;
}
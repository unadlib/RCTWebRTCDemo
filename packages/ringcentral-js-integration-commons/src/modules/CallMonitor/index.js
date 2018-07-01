import 'core-js/fn/array/find';
import { Module } from '../../lib/di';
import RcModule from '../../lib/RcModule';
import moduleStatuses from '../../enums/moduleStatuses';
import actionTypes from './actionTypes';
import callDirections from '../../enums/callDirections';
import getCallMonitorReducer, {
  getCallMatchedReducer
} from './getCallMonitorReducer';
import normalizeNumber from '../../lib/normalizeNumber';
import {
  isRinging,
  hasRingingCalls,
  sortByStartTime,
} from '../../lib/callLogHelpers';
import ensureExist from '../../lib/ensureExist';
import { isRing, isOnHold } from '../Webphone/webphoneHelper';

function matchWephoneSessionWithAcitveCall(sessions, callItem) {
  if (!sessions || !callItem.sipData) {
    return undefined;
  }
  return sessions.find((session) => {
    if (session.direction !== callItem.direction) {
      return false;
    }
    if (
      session.direction === callDirections.inbound &&
      callItem.sipData.remoteUri.indexOf(session.from) === -1
    ) {
      return false;
    }
    if (
      session.direction === callDirections.outbound &&
      callItem.sipData.remoteUri.indexOf(session.to) === -1
    ) {
      return false;
    }
    let webphoneStartTime;
    if (session.direction === callDirections.inbound) {
      webphoneStartTime = session.creationTime;
    } else {
      webphoneStartTime = session.startTime || session.creationTime;
    }
    // 16000 is from experience in test.
    // there is delay bettween active call created and webphone session created
    // for example, the time delay is decided by when webphone get invite info
    if (
      Math.abs(callItem.startTime - webphoneStartTime) > 16000
    ) {
      return false;
    }
    return true;
  });
}

/**
 * @class
 * @description active calls monitor module
 */
@Module({
  deps: [
    'AccountInfo',
    'Storage',
    'DetailedPresence',
    { dep: 'ContactMatcher', optional: true },
    { dep: 'Webphone', optional: true },
    { dep: 'Call', optional: true },
    { dep: 'ActivityMatcher', optional: true },
    { dep: 'CallMonitorOptions', optional: true }
  ]
})
export default class CallMonitor extends RcModule {
  /**
   * @constructor
   * @param {Object} params - params object
   * @param {Call} params.call - call module instance
   * @param {AccountInfo} params.accountInfo - accountInfo module instance
   * @param {DetailedPresence} params.detailedPresence - detailedPresence module instance
   * @param {ActivityMatcher} params.activityMatcher - activityMatcher module instance
   * @param {ContactMatcher} params.contactMatcher - contactMatcher module instance
   * @param {Webphone} params.webphone - webphone module instance
   * @param {Storage} params.storage - storage module instance
   * @param {Function} params.onRinging - function on ring
   * @param {Function} params.onNewCall - function on new call
   * @param {Function} params.onCallUpdated - function on call updated
   * @param {Function} params.onCallEnded - function on call ended
   */
  constructor({
    call,
    accountInfo,
    detailedPresence,
    activityMatcher,
    contactMatcher,
    webphone,
    onRinging,
    onNewCall,
    onCallUpdated,
    onCallEnded,
    storage,
    ...options
  }) {
    super({
      ...options,
      actionTypes,
    });
    this._call = call;
    this._accountInfo = this::ensureExist(accountInfo, 'accountInfo');
    this._detailedPresence = this::ensureExist(detailedPresence, 'detailedPresence');
    this._contactMatcher = contactMatcher;
    this._activityMatcher = activityMatcher;
    this._webphone = webphone;
    this._onRinging = onRinging;
    this._onNewCall = onNewCall;
    this._onCallUpdated = onCallUpdated;
    this._onCallEnded = onCallEnded;
    this._storage = this::ensureExist(storage, 'storage');
    this._callMatchedKey = 'callMatched';

    this._reducer = getCallMonitorReducer(this.actionTypes);

    this._storage.registerReducer({
      key: this._callMatchedKey,
      reducer: getCallMatchedReducer(this.actionTypes),
    });


    this.addSelector('normalizedCalls',
      () => this._detailedPresence.calls,
      () => this._accountInfo.countryCode,
      () => this._webphone && this._webphone.sessions,
      (callsFromPresence, countryCode, sessions) => (
        callsFromPresence.map((callItem) => {
          // use account countryCode to normalize number due to API issues [RCINT-3419]
          const fromNumber = normalizeNumber({
            phoneNumber: callItem.from && callItem.from.phoneNumber,
            countryCode,
          });
          const toNumber = normalizeNumber({
            phoneNumber: callItem.to && callItem.to.phoneNumber,
            countryCode,
          });
          const webphoneSession = matchWephoneSessionWithAcitveCall(sessions, callItem);
          return {
            ...callItem,
            from: {
              phoneNumber: fromNumber,
            },
            to: {
              phoneNumber: toNumber,
            },
            startTime: (
              (webphoneSession && webphoneSession.startTime) ||
              callItem.startTime
            ),
            webphoneSession,
          };
        }).sort(sortByStartTime)
      ),
    );

    this.addSelector('calls',
      this._selectors.normalizedCalls,
      () => (this._contactMatcher && this._contactMatcher.dataMapping),
      () => (this._activityMatcher && this._activityMatcher.dataMapping),
      () => (this.callMatched),
      (normalizedCalls, contactMapping = {}, activityMapping = {}, callMatched) => {
        const calls = normalizedCalls.map((callItem) => {
          const fromNumber = callItem.from && callItem.from.phoneNumber;
          const toNumber = callItem.to && callItem.to.phoneNumber;
          const fromMatches = (fromNumber && contactMapping[fromNumber]) || [];
          const toMatches = (toNumber && contactMapping[toNumber]) || [];
          const toNumberEntity = callMatched[callItem.sessionId];
          return {
            ...callItem,
            fromMatches,
            toMatches,
            activityMatches: (activityMapping[callItem.sessionId]) || [],
            toNumberEntity,
          };
        });
        return calls;
      }
    );

    this.addSelector('activeRingCalls',
      this._selectors.calls,
      calls => calls.filter(callItem =>
        callItem.webphoneSession && isRing(callItem.webphoneSession)
      )
    );

    this.addSelector('activeOnHoldCalls',
      this._selectors.calls,
      calls => calls.filter(callItem =>
        callItem.webphoneSession && isOnHold(callItem.webphoneSession)
      )
    );

    this.addSelector('activeCurrentCalls',
      this._selectors.calls,
      calls => calls.filter(callItem =>
        callItem.webphoneSession &&
        !isOnHold(callItem.webphoneSession) &&
        !isRing(callItem.webphoneSession)
      )
    );

    this.addSelector('otherDeviceCalls',
      this._selectors.calls,
      () => this._webphone && this._webphone.lastEndedSessions,
      (calls, lastEndedSessions) => calls.filter((callItem) => {
        if (callItem.webphoneSession) {
          return false;
        }
        if (!lastEndedSessions) {
          return true;
        }
        const endCall = matchWephoneSessionWithAcitveCall(lastEndedSessions, callItem);
        return !endCall;
      })
    );

    this.addSelector('uniqueNumbers',
      this._selectors.normalizedCalls,
      (normalizedCalls) => {
        const output = [];
        const numberMap = {};
        function addIfNotExist(number) {
          if (!numberMap[number]) {
            output.push(number);
            numberMap[number] = true;
          }
        }
        normalizedCalls.forEach((callItem) => {
          if (callItem.from && callItem.from.phoneNumber) {
            addIfNotExist(callItem.from.phoneNumber);
          }
          if (callItem.to && callItem.to.phoneNumber) {
            addIfNotExist(callItem.to.phoneNumber);
          }
        });
        return output;
      }
    );

    if (this._contactMatcher) {
      this._contactMatcher.addQuerySource({
        getQueriesFn: this._selectors.uniqueNumbers,
        readyCheckFn: () => (
          this._accountInfo.ready &&
          this._detailedPresence.ready
        ),
      });
    }

    this.addSelector('sessionIds',
      () => this._detailedPresence.calls,
      calls => calls.map(callItem => callItem.sessionId)
    );

    if (this._activityMatcher) {
      this._activityMatcher.addQuerySource({
        getQueriesFn: this._selectors.sessionIds,
        readyCheckFn: () => this._detailedPresence.ready,
      });
    }

    this._lastProcessedNumbers = null;
    this._lastProcessedCalls = null;
    this._lastProcessedIds = null;
  }

  async _onStateChange() {
    if (
      (!this._call || this._call.ready) &&
      this._accountInfo.ready &&
      this._detailedPresence.ready &&
      (!this._contactMatcher || this._contactMatcher.ready) &&
      (!this._activityMatcher || this._activityMatcher.ready) &&
      this._storage.ready &&
      this.pending
    ) {
      this.store.dispatch({
        type: this.actionTypes.init,
      });
      this.store.dispatch({
        type: this.actionTypes.initSuccess,
      });
    } else if (
      (
        (this._call && !this._call.ready) ||
        !this._accountInfo.ready ||
        !this._detailedPresence.ready ||
        (this._contactMatcher && !this._contactMatcher.ready) ||
        (this._activityMatcher && !this._activityMatcher.ready) ||
        !this._storage.ready
      ) &&
      this.ready
    ) {
      this.store.dispatch({
        type: this.actionTypes.reset,
      });
      this._lastProcessedCalls = null;
      this._lastProcessedIds = null;
      this._lastProcessedNumbers = null;
      this.store.dispatch({
        type: this.actionTypes.resetSuccess,
      });
    } else if (
      this.ready
    ) {
      const uniqueNumbers = this._selectors.uniqueNumbers();
      if (this._lastProcessedNumbers !== uniqueNumbers) {
        this._lastProcessedNumbers = uniqueNumbers;
        if (this._contactMatcher && this._contactMatcher.ready) {
          this._contactMatcher.triggerMatch();
        }
      }
      const sessionIds = this._selectors.sessionIds();
      if (this._lastProcessedIds !== sessionIds) {
        this._lastProcessedIds = sessionIds;
        if (this._activityMatcher && this._activityMatcher.ready) {
          this._activityMatcher.triggerMatch();
        }
      }

      if (
        this._lastProcessedCalls !== this.calls
      ) {
        const oldCalls = (
          this._lastProcessedCalls &&
          this._lastProcessedCalls.slice()
        ) || [];

        this._lastProcessedCalls = this.calls;

        // no ringing calls
        if (this._call &&
            oldCalls.length !== 0 &&
            this.calls.length === 0 &&
            this._call.toNumberEntities &&
            this._call.toNumberEntities.length !== 0) {
          // console.log('no calls clean to number:');
          this._call.cleanToNumberEntities();
        }

        let entities = this._call ? this._call.toNumberEntities.sort(sortByStartTime) : [];
        // const matchedMap = {};
        this.calls.forEach((call) => {
          const oldCallIndex = oldCalls.findIndex(item => item.sessionId === call.sessionId);
          if (oldCallIndex === -1) {
            if (typeof this._onNewCall === 'function') {
              this._onNewCall(call);
            }
            if (typeof this._onRinging === 'function' && isRinging(call)) {
              this._onRinging(call);
            }
          } else {
            const oldCall = oldCalls[oldCallIndex];
            oldCalls.splice(oldCallIndex, 1);
            if (
              call.telephonyStatus !== oldCall.telephonyStatus &&
              typeof this._onCallUpdated === 'function'
            ) {
              this._onCallUpdated(call);
            }
          }
          entities.find((entity, index) => {
            const toEntity = call.toMatches.find(toMatch =>
              toMatch.id === entity.entityId
            );
            if (toEntity !== undefined) {
              entities = this._removeMatched(index, entities);
              this._setMatchedData({
                sessionId: call.sessionId,
                toEntityId: toEntity.id,
              });
              return true;
            }
            return false;
          });
        });

        oldCalls.forEach((call) => {
          if (typeof this._onCallEnded === 'function') {
            this._onCallEnded(call);
          }
        });
      }
    }
  }
  initialize() {
    this.store.subscribe(() => this._onStateChange());
  }

  _removeMatched(index, entities) {
    console.log('removeMatched:', index);
    entities.splice(index, 1);
    console.log('entities after splice:', entities);
    return entities;
  }

  _setMatchedData(matched) {
    this.store.dispatch({
      type: this.actionTypes.setData,
      ...matched,
    });
  }

  get hasRingingCalls() {
    return hasRingingCalls(this.calls);
  }

  get status() {
    return this.state.status;
  }

  get ready() {
    return this.state.status === moduleStatuses.ready;
  }

  get pending() {
    return this.state.status === moduleStatuses.pending;
  }

  get calls() {
    return this._selectors.calls();
  }

  get callMatched() {
    return this._storage.getItem(this._callMatchedKey);
  }

  get activeRingCalls() {
    return this._selectors.activeRingCalls();
  }

  get activeOnHoldCalls() {
    return this._selectors.activeOnHoldCalls();
  }

  get activeCurrentCalls() {
    return this._selectors.activeCurrentCalls();
  }

  get otherDeviceCalls() {
    return this._selectors.otherDeviceCalls();
  }
}

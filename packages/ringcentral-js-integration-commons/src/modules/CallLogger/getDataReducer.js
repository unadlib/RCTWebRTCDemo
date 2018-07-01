import { combineReducers } from 'redux';

export function getLogOnRingingReducer(types) {
  return (state = true, { type, logOnRinging }) => {
    if (type === types.setLogOnRinging) return !!logOnRinging;
    return state;
  };
}

export function getAutoLogReducer(types) {
  return (state = true, { type, autoLog }) => {
    if (type === types.setAutoLog) return !!autoLog;
    return state;
  };
}

/* istanbul ignore next */
export default function getDataReducer(types) {
  return combineReducers({
    autoLog: getAutoLogReducer(types),
    logOnRinging: getLogOnRingingReducer(types),
  });
}

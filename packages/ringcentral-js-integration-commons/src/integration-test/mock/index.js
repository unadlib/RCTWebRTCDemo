require('es6-promise').polyfill();
// require('./pubnub');
const RingCentral = require('ringcentral');
const fetchMock = require('fetch-mock');

const dialingPlanBody = require('./data/dialingPlan');
const extensionBody = require('./data/extensionInfo');
const extensionListBody = require('./data/extension');
const accountBody = require('./data/accountInfo');
const subscriptionBody = require('./data/subscription');
const apiInfoBody = require('./data/subscription');
const messageSyncBody = require('./data/messageSync');
const authzProfileBody = require('./data/authzProfile');
const blockedNumberBody = require('./data/blockedNumber');
const forwardingNumberBody = require('./data/forwardingNumber');
const phoneNumberBody = require('./data/phoneNumber');
const accountPhoneNumberBody = require('./data/accountPhoneNumber');
const presenceBody = require('./data/presence.json');
const numberParserBody = require('./data/numberParser.json');
const smsBody = require('./data/sms.json');
const ringOutBody = require('./data/ringOut.json');
const messageStoreBody = require('./data/messageStore.json');

const mockServer = 'http://whatever';
export function createSDK(options = {}) {
  const opts = {
    ...options,
    appKey: 'test key',
    appSecret: 'test secret',
    server: mockServer,
    Request: fetchMock.constructor.Request,
    Response: fetchMock.constructor.Response,
    Headers: fetchMock.constructor.Headers,
    fetch: fetchMock.fetchMock.bind(fetchMock),
    refreshDelayMs: 1,
    redirectUri: 'http://foo',
    cachePrefix: 'sdkPrefix',
  };
  return new RingCentral(opts);
}

export function mockApi({
  method = 'GET',
  path,
  server = mockServer,
  url,
  body = {},
  status = 200,
  statusText = 'OK',
  headers,
  isOnce = true,
}) {
  let responseHeaders;
  const isJson = typeof body !== 'string';
  if (isJson && !headers) {
    responseHeaders = { 'Content-Type': 'application/json' };
  } else {
    responseHeaders = headers;
  }
  let mockUrl;
  if (url) {
    mockUrl = url;
  } else {
    mockUrl = `${server}${path}`;
  }
  const mock = isOnce ? fetchMock.once.bind(fetchMock) : fetchMock.mock.bind(fetchMock);
  mock(mockUrl, {
    body: isJson ? JSON.stringify(body) : body,
    status,
    statusText,
    headers: responseHeaders,
    sendAsJson: false
  }, {
    method,
    times: 1,
  });
}

export function authentication() {
  mockApi({
    method: 'POST',
    path: '/restapi/oauth/token',
    body: {
      access_token: 'ACCESS_TOKEN',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'REFRESH_TOKEN',
      refresh_token_expires_in: 60480,
      scope: 'SMS RCM Foo Boo',
      expireTime: new Date().getTime() + 3600000,
      owner_id: '23231231"',
      endpoint_id: '3213213131',
    }
  });
}

export function logout() {
  mockApi({
    method: 'POST',
    path: '/restapi/oauth/revoke',
    isOnce: false,
  });
}

export function tokenRefresh(failure) {
  if (!failure) {
    mockApi({
      method: 'POST',
      path: '/restapi/oauth/token',
      body: {
        access_token: 'ACCESS_TOKEN_FROM_REFRESH',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'REFRESH_TOKEN_FROM_REFRESH',
        refresh_token_expires_in: 60480,
        scope: 'SMS RCM Foo Boo'
      }
    });
  } else {
    mockApi({
      method: 'POST',
      path: '/restapi/oauth/token',
      body: {
        message: 'Wrong token',
        error_description: 'Wrong token',
        description: 'Wrong token'
      },
      status: 400,
    });
  }
}

export function presence(id) {
  mockApi({
    url: `begin:${mockServer}/restapi/v1.0/account/~/extension/${id}/presence`,
    body: {
      uri: `https://platform.ringcentral.com/restapi/v1.0/account/123/extension/${id}/presence`,
      extension: {
        uri: `https://platform.ringcentral.com/restapi/v1.0/account/123/extension/${id}`,
        extensionNumber: '101',
        id,
      },
      activeCalls: [],
      presenceStatus: 'Available',
      telephonyStatus: 'Ringing',
      userStatus: 'Available',
      dndStatus: 'TakeAllCalls',
      extensionId: id
    }
  });
}

export function presenceUpdate(id, mockResponse = {}) {
  mockApi({
    path: `/restapi/v1.0/account/~/extension/${id}/presence`,
    method: 'PUT',
    body: {
      ...presenceBody,
      ...mockResponse,
    }
  });
}

export function dialingPlan(mockResponse = {}) {
  mockApi({
    path: '/restapi/v1.0/account/~/dialing-plan?perPage=MAX&page=1',
    body: {
      ...dialingPlanBody,
      ...mockResponse,
    }
  });
}

export function extensionInfo(mockResponse = {}) {
  mockApi({
    path: '/restapi/v1.0/account/~/extension/~',
    body: {
      ...extensionBody,
      ...mockResponse,
    }
  });
}

export function extensionList(mockResponse = {}) {
  mockApi({
    url: `begin:${mockServer}/restapi/v1.0/account/~/extension?`,
    body: {
      ...extensionListBody,
      ...mockResponse,
    }
  });
}

export function accountInfo(mockResponse = {}) {
  mockApi({
    path: '/restapi/v1.0/account/~',
    body: {
      ...accountBody,
      ...mockResponse,
    }
  });
}

export function apiInfo(mockResponse = {}) {
  mockApi({
    path: '/restapi/v1.0',
    body: {
      ...apiInfoBody,
      ...mockResponse,
    }
  });
}

export function messageSync(mockResponse = {}) {
  mockApi({
    url: `begin:${mockServer}/restapi/v1.0/account/~/extension/~/message-sync`,
    body: {
      ...messageSyncBody,
      ...mockResponse,
    }
  });
}

export function updateMessageStatus(mockResponse = {}) {
  mockApi({
    url: `begin:${mockServer}/restapi/v1.0/account/~/extension/~/message-store`,
    method: 'PUT',
    body: {
      ...messageStoreBody,
      ...mockResponse,
    }
  });
}

export function authzProfile(mockResponse = {}) {
  mockApi({
    path: '/restapi/v1.0/account/~/extension/~/authz-profile',
    body: {
      ...authzProfileBody,
      ...mockResponse,
    }
  });
}

export function blockedNumber(mockResponse = {}) {
  mockApi({
    path: '/restapi/v1.0/account/~/extension/~/blocked-number',
    body: {
      ...blockedNumberBody,
      ...mockResponse,
    }
  });
}

export function forwardingNumber(mockResponse = {}) {
  mockApi({
    url: `begin:${mockServer}/restapi/v1.0/account/~/extension/~/forwarding-number`,
    body: {
      ...forwardingNumberBody,
      ...mockResponse
    }
  });
}

export function phoneNumber(mockResponse = {}) {
  mockApi({
    url: `begin:${mockServer}/restapi/v1.0/account/~/extension/~/phone-number`,
    body: {
      ...phoneNumberBody,
      ...mockResponse,
    }
  });
}

export function accountPhoneNumber(mockResponse = {}) {
  mockApi({
    url: `begin:${mockServer}/restapi/v1.0/account/~/phone-number`,
    body: {
      ...accountPhoneNumberBody,
      ...mockResponse,
    },
    isOnce: false
  });
}

export function subscription(mockResponse = {}) {
  mockApi({
    method: 'POST',
    url: `begin:${mockServer}/restapi/v1.0/subscription`,
    body: {
      ...subscriptionBody,
      ...mockResponse,
    }
  });
  mockApi({
    method: 'PUT',
    url: `begin:${mockServer}/restapi/v1.0/subscription`,
    body: {
      ...subscriptionBody,
      ...mockResponse,
    },
    isOnce: false
  });
}

export function numberParser(mockResponse = {}) {
  mockApi({
    method: 'POST',
    url: `begin:${mockServer}/restapi/v1.0/number-parser/`,
    body: {
      ...numberParserBody,
      ...mockResponse,
    }
  });
}

export function sms(mockResponse = {}) {
  mockApi({
    method: 'POST',
    path: '/restapi/v1.0/account/~/extension/~/sms',
    body: {
      ...smsBody,
      ...mockResponse,
    }
  });
}

export function restore() {
  fetchMock.restore();
}

export function mockForLogin({
  mockAuthzProfile = true,
  mockExtensionInfo = true,
  mockForwardingNumber = true,
} = {}) {
  authentication();
  logout();
  tokenRefresh();
  presence('~');
  dialingPlan();
  if (mockExtensionInfo) {
    extensionInfo();
  }
  accountInfo();
  apiInfo();
  if (mockAuthzProfile) {
    authzProfile();
  }
  extensionList();
  accountPhoneNumber();
  blockedNumber();
  if (mockForwardingNumber) {
    forwardingNumber();
  }
  messageSync();
  phoneNumber();
  subscription();
}

export function mockForbidden({
  method = 'GET',
  path,
  url,
  body = ''
}) {
  mockApi({
    method,
    path,
    body,
    url,
    status: 403,
  });
}

export function mockClient(client) {
  client.service = createSDK({});
}

export function ringOut(mockResponse = {}) {
  mockApi({
    isOnce: false,
    method: 'POST',
    url: `${mockServer}/restapi/v1.0/account/~/extension/~/ring-out`,
    body: {
      ...ringOutBody,
      ...mockResponse,
    }
  });
}

export function ringOutUpdate(mockResponse = {}) {
  mockApi({
    isOnce: false,
    url: `begin:${mockServer}/restapi/v1.0/account/~/extension/~/ring-out/`,
    body: {
      ...ringOutBody,
      ...mockResponse,
    }
  });
}

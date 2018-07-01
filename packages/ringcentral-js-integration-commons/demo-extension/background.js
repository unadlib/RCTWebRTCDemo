import { createStore } from 'redux';
import { getProxyServer } from '../src/lib/proxy';
import Phone from '../dev-server/Phone';
import { ServerTransport } from '../src/lib/ChromeTransport';

/* global chrome */

const ProxyServer = getProxyServer(Phone);

const transport = new ServerTransport();


const server = new ProxyServer({
  transport,
  useTabManager: false,
  extensionMode: true,
});
global.server = server;

const serverStore = createStore(server.reducer);
serverStore.subscribe(() => {
  console.log(serverStore.getState());
});
server.setStore(serverStore);

chrome.browserAction.onClicked.addListener((tab) => {
  window.open('/client.html');
});

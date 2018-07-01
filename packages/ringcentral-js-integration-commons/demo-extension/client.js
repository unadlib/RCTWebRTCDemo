import React from 'react';
import ReactDOM from 'react-dom';
import { createStore } from 'redux';
import { connect, Provider } from 'react-redux';
import JSONTree from 'react-json-tree';
import getProxyClient from '../src/lib/proxy/getProxyClient';
import Phone from '../dev-server/Phone';
import { ClientTransport } from '../src/lib/ChromeTransport';

const DemoView = connect(state => ({
  data: state,
  invertTheme: false,
}), () => ({
  shouldExpandNode: (keyName, data, level) => level < 3,
}))(JSONTree);


const ProxyClient = getProxyClient(Phone);

const transport = new ClientTransport();

const client = new ProxyClient({
  transport,
  useTabManager: false,
  extensionMode: true,
});
global.client = client;
const store = createStore(client.reducer);
client.setStore(store);

window.addEventListener('load', () => {
  ReactDOM.render((
    <Provider store={store}>
      <DemoView />
    </Provider>
  ), document.querySelector('#viewport'));
});

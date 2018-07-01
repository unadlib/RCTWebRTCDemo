'use strict';

import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
  TextInput,
  ListView,
  Platform,
} from 'react-native';
import WebPhone from './packages/web-phone-1/src/ringcentral-web-phone';

import {
  RTCPeerConnection,
  RTCMediaStream,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStreamTrack,
  getUserMedia,
} from 'react-native-webrtc';

global.localStorage = {
  getItem: () => null,
  setItem: () => null,
};
global.window = global;
global.RTCPeerConnection = RTCPeerConnection;
global.getUserMedia = getUserMedia;
global.navigator.mediaDevices = { getUserMedia };
global.RTCSessionDescription = RTCSessionDescription;
global.RTCMediaStream = RTCMediaStream;

import RingCentral from './packages/ringcentral-js';
import account from './account.json';

const option = {
  appKey: 'eac8797af1b3502F2CEAAEECAC3Ed378AA7858A386656f28A008b0c638A754B1',
  appSecret: 'c082702E4ea4DA18c4b1377917778a8aafabCA3Be579B78B66d17C36874b27F4',
  appName: 'appName',
  appVersion: 'appVersion',
  server: 'https://api-rcapps.ringcentral.com'
};
const sdk = new RingCentral(option);
const platform = sdk.platform();
let webphone;
async function createWebPhone() {
    const loginResponse = await platform.login(account);
    const sipProvisionResponse = await platform.post('/client-info/sip-provision', {
      sipInfo: [{ transport: 'WSS' }]
    });
    webphone = new WebPhone(sipProvisionResponse.json(), {
        appKey: option.appKey,
        appName: option.appName,
        appVersion: option.appVersion,
        uuid: loginResponse.json().endpoint_id,
        logLevel: 2,
        audioHelper: {
          true: false,
          // incoming: 'web-phone-1/audio/incoming.ogg',
          // outgoing: 'web-phone-1/audio/outgoing.ogg'
        },
        // sessionDescriptionHandlerFactory: (session, options) => {
        //   return new SIP.WebRTC.MediaHandler(session, options);
        // }
        sessionDescriptionHandlerFactory: function (logger, observer, options) {
          const SessionDescriptionHandler = require('./SessionDescriptionHandler')(require('sip.js/dist/sip-0.11.0.js'));
          const sdh = new SessionDescriptionHandler(logger, observer, options);
          return sdh;
      }
    });
    return webphone;
  
}

const RCTWebRTCDemo = React.createClass({
  getInitialState: function() {
    return {
      phone: null,
      status: 'Initializing',
    };
  },
  componentWillMount() {
    createWebPhone().then((phone)=> {
      setTimeout(() => {
        this.setState({ status: 'ready', phone });
      }, 1000);
    });
  },
  _press(event) {
    // this.refs.roomID.blur();
    // this.setState({status: 'connect', info: 'Connecting'});
  
    this.session = webphone.userAgent.invite('+18185321061', {
        // media: {
        //     render: {
        //         remote: document.getElementById('remoteVideo'),
        //         local: document.getElementById('localVideo')
        //     }
        // },
        fromNumber: account.username, // Optional, Company Number will be used as default
        homeCountryId: '1' // Optional, the value of
    });
  },
  render() {
    return (
      <View style={styles.container}>
        <Text>
          {this.state.status}
        </Text>
        <View style={{ flexDirection: 'row' }}>
          {this.state.phone ? (
            <TouchableHighlight
            style={{borderWidth: 1, borderColor: 'black'}}
            onPress={this._press}>
            <Text>Dial-out</Text>
          </TouchableHighlight>
          ): null}
        </View>
      </View>
    );
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

AppRegistry.registerComponent('RCTWebRTCDemo', () => RCTWebRTCDemo);

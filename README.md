# RCTWebRTCDemo
Demo for react-native-webrtc and ringcentral-web-phone.

## Usage
- Clone the repository, run `npm install`.
- Create `account.json` from root path.
- For iOS, run the project on Xcode.  
- For Android, run `react-native run-android` in the directory.

## `config.json` data Structure

```json
{
    "account": {
        "username": "username",
        "password": "password"
    },
    "options": {
        "appKey": "appKey",
        "appSecret": "appSecret",
        "appName": "appName",
        "appVersion": "appVersion",
        "server": "https://api-rcapps.ringcentral.com"
    },
    "invitePhoneNumber": "invitePhoneNumber"
}
```

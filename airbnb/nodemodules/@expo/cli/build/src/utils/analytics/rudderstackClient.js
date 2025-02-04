"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.resetInternalStateForTesting = resetInternalStateForTesting;
exports.getRudderAnalyticsClient = getRudderAnalyticsClient;
exports.setUserDataAsync = setUserDataAsync;
exports.logEventAsync = logEventAsync;
exports.getContext = getContext;
var _rudderSdkNode = _interopRequireDefault(require("@expo/rudder-sdk-node"));
var ciInfo = _interopRequireWildcard(require("ci-info"));
var _os = _interopRequireDefault(require("os"));
var _userSettings = _interopRequireDefault(require("../../api/user/UserSettings"));
var _user = require("../../api/user/user");
var _env = require("../env");
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
        return obj;
    } else {
        var newObj = {};
        if (obj != null) {
            for(var key in obj){
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {};
                    if (desc.get || desc.set) {
                        Object.defineProperty(newObj, key, desc);
                    } else {
                        newObj[key] = obj[key];
                    }
                }
            }
        }
        newObj.default = obj;
        return newObj;
    }
}
const PLATFORM_TO_ANALYTICS_PLATFORM = {
    darwin: "Mac",
    win32: "Windows",
    linux: "Linux"
};
let client = null;
let identified = false;
let identifyData = null;
function resetInternalStateForTesting() {
    identified = false;
    identifyData = null;
    client = null;
}
function getRudderAnalyticsClient() {
    if (client) {
        return client;
    }
    client = new _rudderSdkNode.default(_env.env.EXPO_STAGING || _env.env.EXPO_LOCAL ? "24TKICqYKilXM480mA7ktgVDdea" : "24TKR7CQAaGgIrLTgu3Fp4OdOkI", "https://cdp.expo.dev/v1/batch", {
        flushInterval: 300
    });
    // Install flush on exit...
    process.on("SIGINT", ()=>{
        return client == null ? void 0 : client.flush == null ? void 0 : client.flush();
    });
    process.on("SIGTERM", ()=>{
        return client == null ? void 0 : client.flush == null ? void 0 : client.flush();
    });
    return client;
}
async function setUserDataAsync(userId, traits) {
    if (_env.env.EXPO_NO_TELEMETRY) {
        return;
    }
    const deviceId = await _userSettings.default.getAnonymousIdentifierAsync();
    identifyData = {
        userId,
        deviceId,
        traits
    };
    identifyIfNotYetIdentified();
}
async function logEventAsync(event, properties = {}) {
    if (_env.env.EXPO_NO_TELEMETRY) {
        return;
    }
    // this has the side effect of calling `setUserData` which fetches the user and populates identifyData
    try {
        await (0, _user).getUserAsync();
    } catch  {}
    identifyIfNotYetIdentified();
    if (!identifyData) {
        return;
    }
    const { userId , deviceId  } = identifyData;
    const commonEventProperties = {
        source_version: "0.10.16",
        source: "expo"
    };
    const identity = {
        userId,
        anonymousId: deviceId
    };
    getRudderAnalyticsClient().track({
        event,
        properties: {
            ...properties,
            ...commonEventProperties
        },
        ...identity,
        context: getContext()
    });
}
function identifyIfNotYetIdentified() {
    if (_env.env.EXPO_NO_TELEMETRY || identified || !identifyData) {
        return;
    }
    getRudderAnalyticsClient().identify({
        userId: identifyData.userId,
        anonymousId: identifyData.deviceId,
        traits: identifyData.traits
    });
    identified = true;
}
function getContext() {
    const platform = PLATFORM_TO_ANALYTICS_PLATFORM[_os.default.platform()] || _os.default.platform();
    return {
        os: {
            name: platform,
            version: _os.default.release()
        },
        device: {
            type: platform,
            model: platform
        },
        app: {
            name: "expo",
            version: "0.10.16"
        },
        ci: ciInfo.isCI ? {
            name: ciInfo.name,
            isPr: ciInfo.isPR
        } : undefined
    };
}

//# sourceMappingURL=rudderstackClient.js.map
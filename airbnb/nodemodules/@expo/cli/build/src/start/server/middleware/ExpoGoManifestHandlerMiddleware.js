"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ResponseContentType = void 0;
var _configPlugins = require("@expo/config-plugins");
var _accepts = _interopRequireDefault(require("accepts"));
var _crypto = _interopRequireDefault(require("crypto"));
var _formData = _interopRequireDefault(require("form-data"));
var _structuredHeaders = require("structured-headers");
var _userSettings = _interopRequireDefault(require("../../../api/user/UserSettings"));
var _user = require("../../../api/user/user");
var _rudderstackClient = require("../../../utils/analytics/rudderstackClient");
var _codesigning = require("../../../utils/codesigning");
var _errors = require("../../../utils/errors");
var _url = require("../../../utils/url");
var _manifestMiddleware = require("./ManifestMiddleware");
var _resolvePlatform = require("./resolvePlatform");
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
const debug = require("debug")("expo:start:server:middleware:ExpoGoManifestHandlerMiddleware");
var ResponseContentType;
exports.ResponseContentType = ResponseContentType;
(function(ResponseContentType) {
    ResponseContentType[ResponseContentType["TEXT_PLAIN"] = 0] = "TEXT_PLAIN";
    ResponseContentType[ResponseContentType["APPLICATION_JSON"] = 1] = "APPLICATION_JSON";
    ResponseContentType[ResponseContentType["APPLICATION_EXPO_JSON"] = 2] = "APPLICATION_EXPO_JSON";
    ResponseContentType[ResponseContentType["MULTIPART_MIXED"] = 3] = "MULTIPART_MIXED";
})(ResponseContentType || (exports.ResponseContentType = ResponseContentType = {}));
class ExpoGoManifestHandlerMiddleware extends _manifestMiddleware.ManifestMiddleware {
    getParsedHeaders(req) {
        let platform = (0, _resolvePlatform).parsePlatformHeader(req);
        if (!platform) {
            debug(`No "expo-platform" header or "platform" query parameter specified. Falling back to "ios".`);
            platform = "ios";
        }
        (0, _resolvePlatform).assertRuntimePlatform(platform);
        // Expo Updates clients explicitly accept "multipart/mixed" responses while browsers implicitly
        // accept them with "accept: */*". To make it easier to debug manifest responses by visiting their
        // URLs in a browser, we denote the response as "text/plain" if the user agent appears not to be
        // an Expo Updates client.
        const accept = (0, _accepts).default(req);
        const acceptedType = accept.types([
            "unknown/unknown",
            "multipart/mixed",
            "application/json",
            "application/expo+json",
            "text/plain", 
        ]);
        let responseContentType;
        switch(acceptedType){
            case "multipart/mixed":
                responseContentType = 3;
                break;
            case "application/json":
                responseContentType = 1;
                break;
            case "application/expo+json":
                responseContentType = 2;
                break;
            default:
                responseContentType = 0;
                break;
        }
        const expectSignature = req.headers["expo-expect-signature"];
        return {
            responseContentType,
            platform,
            expectSignature: expectSignature ? String(expectSignature) : null,
            hostname: (0, _url).stripPort(req.headers["host"])
        };
    }
    getDefaultResponseHeaders() {
        const headers = new Map();
        // set required headers for Expo Updates manifest specification
        headers.set("expo-protocol-version", 0);
        headers.set("expo-sfv-version", 0);
        headers.set("cache-control", "private, max-age=0");
        return headers;
    }
    async _getManifestResponseAsync(requestOptions) {
        var ref, ref1;
        const { exp , hostUri , expoGoConfig , bundleUrl  } = await this._resolveProjectSettingsAsync(requestOptions);
        var _runtimeVersion;
        const runtimeVersion = _configPlugins.Updates.getRuntimeVersion({
            ...exp,
            runtimeVersion: (_runtimeVersion = exp.runtimeVersion) != null ? _runtimeVersion : {
                policy: "sdkVersion"
            }
        }, requestOptions.platform);
        if (!runtimeVersion) {
            throw new _errors.CommandError("MANIFEST_MIDDLEWARE", `Unable to determine runtime version for platform '${requestOptions.platform}'`);
        }
        const codeSigningInfo = await (0, _codesigning).getCodeSigningInfoAsync(exp, requestOptions.expectSignature, this.options.privateKeyPath);
        const easProjectId = (ref = exp.extra) == null ? void 0 : (ref1 = ref.eas) == null ? void 0 : ref1.projectId;
        const scopeKey = await ExpoGoManifestHandlerMiddleware.getScopeKeyAsync({
            slug: exp.slug,
            codeSigningInfo
        });
        const expoUpdatesManifest = {
            id: _crypto.default.randomUUID(),
            createdAt: new Date().toISOString(),
            runtimeVersion,
            launchAsset: {
                key: "bundle",
                contentType: "application/javascript",
                url: bundleUrl
            },
            assets: [],
            metadata: {},
            extra: {
                eas: {
                    projectId: easProjectId != null ? easProjectId : undefined
                },
                expoClient: {
                    ...exp,
                    hostUri
                },
                expoGo: expoGoConfig,
                scopeKey
            }
        };
        const stringifiedManifest = JSON.stringify(expoUpdatesManifest);
        let manifestPartHeaders = null;
        let certificateChainBody = null;
        if (codeSigningInfo) {
            const signature = (0, _codesigning).signManifestString(stringifiedManifest, codeSigningInfo);
            manifestPartHeaders = {
                "expo-signature": (0, _structuredHeaders).serializeDictionary(convertToDictionaryItemsRepresentation({
                    keyid: codeSigningInfo.keyId,
                    sig: signature,
                    alg: "rsa-v1_5-sha256"
                }))
            };
            certificateChainBody = codeSigningInfo.certificateChainForResponse.join("\n");
        }
        const headers = this.getDefaultResponseHeaders();
        switch(requestOptions.responseContentType){
            case 3:
                {
                    const form = this.getFormData({
                        stringifiedManifest,
                        manifestPartHeaders,
                        certificateChainBody
                    });
                    headers.set("content-type", `multipart/mixed; boundary=${form.getBoundary()}`);
                    return {
                        body: form.getBuffer().toString(),
                        version: runtimeVersion,
                        headers
                    };
                }
            case 2:
            case 1:
            case 0:
                {
                    headers.set("content-type", ExpoGoManifestHandlerMiddleware.getContentTypeForResponseContentType(requestOptions.responseContentType));
                    if (manifestPartHeaders) {
                        Object.entries(manifestPartHeaders).forEach(([key, value])=>{
                            headers.set(key, value);
                        });
                    }
                    return {
                        body: stringifiedManifest,
                        version: runtimeVersion,
                        headers
                    };
                }
        }
    }
    static getContentTypeForResponseContentType(responseContentType) {
        switch(responseContentType){
            case 3:
                return "multipart/mixed";
            case 2:
                return "application/expo+json";
            case 1:
                return "application/json";
            case 0:
                return "text/plain";
        }
    }
    getFormData({ stringifiedManifest , manifestPartHeaders , certificateChainBody  }) {
        const form = new _formData.default();
        form.append("manifest", stringifiedManifest, {
            contentType: "application/json",
            header: {
                ...manifestPartHeaders
            }
        });
        if (certificateChainBody && certificateChainBody.length > 0) {
            form.append("certificate_chain", certificateChainBody, {
                contentType: "application/x-pem-file"
            });
        }
        return form;
    }
    trackManifest(version) {
        (0, _rudderstackClient).logEventAsync("Serve Expo Updates Manifest", {
            runtimeVersion: version
        });
    }
    static async getScopeKeyAsync({ slug , codeSigningInfo  }) {
        const scopeKeyFromCodeSigningInfo = codeSigningInfo == null ? void 0 : codeSigningInfo.scopeKey;
        if (scopeKeyFromCodeSigningInfo) {
            return scopeKeyFromCodeSigningInfo;
        }
        // Log.warn(
        //   env.EXPO_OFFLINE
        //     ? 'Using anonymous scope key in manifest for offline mode.'
        //     : 'Using anonymous scope key in manifest.'
        // );
        return await getAnonymousScopeKeyAsync(slug);
    }
}
exports.ExpoGoManifestHandlerMiddleware = ExpoGoManifestHandlerMiddleware;
async function getAnonymousScopeKeyAsync(slug) {
    const userAnonymousIdentifier = await _userSettings.default.getAnonymousIdentifierAsync();
    return `@${_user.ANONYMOUS_USERNAME}/${slug}-${userAnonymousIdentifier}`;
}
function convertToDictionaryItemsRepresentation(obj) {
    return new Map(Object.entries(obj).map(([k, v])=>{
        return [
            k,
            [
                v,
                new Map()
            ]
        ];
    }));
}

//# sourceMappingURL=ExpoGoManifestHandlerMiddleware.js.map
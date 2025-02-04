"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
var _assert = _interopRequireDefault(require("assert"));
var _url = require("url");
var Log = _interopRequireWildcard(require("../../log"));
var _ip = require("../../utils/ip");
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
const debug = require("debug")("expo:start:server:urlCreator");
class UrlCreator {
    constructor(defaults, bundlerInfo){
        this.defaults = defaults;
        this.bundlerInfo = bundlerInfo;
    }
    /**
   * Return a URL for the "loading" interstitial page that is used to disambiguate which
   * native runtime to open the dev server with.
   *
   * @param options options for creating the URL
   * @param platform when opening the URL from the CLI to a connected device we can specify the platform as a query parameter, otherwise it will be inferred from the unsafe user agent sniffing.
   *
   * @returns URL like `http://localhost:8081/_expo/loading?platform=ios`
   * @returns URL like `http://localhost:8081/_expo/loading` when no platform is provided.
   */ constructLoadingUrl(options, platform) {
        const url = new _url.URL("_expo/loading", this.constructUrl({
            scheme: "http",
            ...options
        }));
        if (platform) {
            url.search = new URLSearchParams({
                platform
            }).toString();
        }
        const loadingUrl = url.toString();
        debug(`Loading URL: ${loadingUrl}`);
        return loadingUrl;
    }
    /** Create a URI for launching in a native dev client. Returns `null` when no `scheme` can be resolved. */ constructDevClientUrl(options) {
        var ref;
        const protocol = (options == null ? void 0 : options.scheme) || ((ref = this.defaults) == null ? void 0 : ref.scheme);
        if (!protocol || // Prohibit the use of http(s) in dev client URIs since they'll never be valid.
        [
            "http",
            "https"
        ].includes(protocol.toLowerCase())) {
            return null;
        }
        const manifestUrl = this.constructUrl({
            ...options,
            scheme: "http"
        });
        const devClientUrl = `${protocol}://expo-development-client/?url=${encodeURIComponent(manifestUrl)}`;
        debug(`Dev client URL: ${devClientUrl} -- manifestUrl: ${manifestUrl} -- %O`, options);
        return devClientUrl;
    }
    /** Create a generic URL. */ constructUrl(options) {
        const urlComponents = this.getUrlComponents({
            ...this.defaults,
            ...options
        });
        const url = joinUrlComponents(urlComponents);
        debug(`URL: ${url}`);
        return url;
    }
    /** Get the URL components from the Ngrok server URL. */ getTunnelUrlComponents(options) {
        var _bundlerInfo, ref;
        const tunnelUrl = (ref = (_bundlerInfo = this.bundlerInfo).getTunnelUrl) == null ? void 0 : ref.call(_bundlerInfo);
        if (!tunnelUrl) {
            return null;
        }
        const parsed = new _url.URL(tunnelUrl);
        var _scheme;
        return {
            port: parsed.port,
            hostname: parsed.hostname,
            protocol: (_scheme = options.scheme) != null ? _scheme : "http"
        };
    }
    getUrlComponents(options) {
        // Proxy comes first.
        const proxyURL = getProxyUrl();
        if (proxyURL) {
            return getUrlComponentsFromProxyUrl(options, proxyURL);
        }
        // Ngrok.
        if (options.hostType === "tunnel") {
            const components = this.getTunnelUrlComponents(options);
            if (components) {
                return components;
            }
            Log.warn("Tunnel URL not found (it might not be ready yet), falling back to LAN URL.");
        } else if (options.hostType === "localhost" && !options.hostname) {
            options.hostname = "localhost";
        }
        var _scheme;
        return {
            hostname: getDefaultHostname(options),
            port: this.bundlerInfo.port.toString(),
            protocol: (_scheme = options.scheme) != null ? _scheme : "http"
        };
    }
}
exports.UrlCreator = UrlCreator;
function getUrlComponentsFromProxyUrl(options, url) {
    const parsedProxyUrl = new _url.URL(url);
    var _scheme;
    let protocol = (_scheme = options.scheme) != null ? _scheme : "http";
    if (parsedProxyUrl.protocol === "https:") {
        if (protocol === "http") {
            protocol = "https";
        }
        if (!parsedProxyUrl.port) {
            parsedProxyUrl.port = "443";
        }
    }
    return {
        port: parsedProxyUrl.port,
        hostname: parsedProxyUrl.hostname,
        protocol
    };
}
function getDefaultHostname(options) {
    // TODO: Drop REACT_NATIVE_PACKAGER_HOSTNAME
    if (process.env.REACT_NATIVE_PACKAGER_HOSTNAME) {
        return process.env.REACT_NATIVE_PACKAGER_HOSTNAME.trim();
    } else if (options.hostname === "localhost") {
        // Restrict the use of `localhost`
        // TODO: Note why we do this.
        return "127.0.0.1";
    }
    return options.hostname || (0, _ip).getIpAddress();
}
function joinUrlComponents({ protocol , hostname , port  }) {
    (0, _assert).default(hostname, "hostname cannot be inferred.");
    const validProtocol = protocol ? `${protocol}://` : "";
    const url = `${validProtocol}${hostname}`;
    if (port) {
        return url + `:${port}`;
    }
    return url;
}
/** @deprecated */ function getProxyUrl() {
    return process.env.EXPO_PACKAGER_PROXY_URL;
} // TODO: Drop the undocumented env variables:
 // REACT_NATIVE_PACKAGER_HOSTNAME
 // EXPO_PACKAGER_PROXY_URL

//# sourceMappingURL=UrlCreator.js.map
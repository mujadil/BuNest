"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.signClassicExpoGoManifestAsync = signClassicExpoGoManifestAsync;
var _client = require("./rest/client");
var _actions = require("./user/actions");
var _user = require("./user/user");
async function signClassicExpoGoManifestAsync(manifest) {
    await (0, _actions).ensureLoggedInAsync();
    var _owner;
    const res = await (0, _client).fetchAsync("manifest/sign", {
        method: "POST",
        body: JSON.stringify({
            args: {
                remoteUsername: (_owner = manifest.owner) != null ? _owner : (0, _user).getActorDisplayName(await (0, _user).getUserAsync()),
                remotePackageName: manifest.slug
            },
            manifest: manifest
        })
    });
    const { data  } = await res.json();
    return data.response;
}

//# sourceMappingURL=signManifest.js.map
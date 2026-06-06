# Hot Update Real Device Test Checklist

## Target

Validate Android hot update through public OSS HTTPS staging resources before moving to CDN.

Staging base:

```text
https://buddy-hotupdate-zhzhwd1290.oss-cn-shanghai.aliyuncs.com/buddy-hot-update/staging/
```

Stable manifest entry:

```text
https://buddy-hotupdate-zhzhwd1290.oss-cn-shanghai.aliyuncs.com/buddy-hot-update/staging/project.manifest
```

## Preflight

- [ ] Phone browser can open `project.manifest`.
- [ ] Phone browser can open `version.manifest`.
- [ ] `project.manifest` version is higher than the version currently on the phone.
- [ ] `version.manifest` version matches `project.manifest`.
- [ ] `packageUrl` is a public HTTPS URL reachable by the phone.
- [ ] `remoteManifestUrl` points to the staging `project.manifest`.
- [ ] `remoteVersionUrl` points to the staging `version.manifest`.
- [ ] APK was built after running `npm run hot-update:url -- staging`.
- [ ] Login page Log panel shows the hot update stage and versions.

## Network Cases

- [ ] Wi-Fi can check hot update.
- [ ] 4G / 5G can check hot update.
- [ ] Offline launch does not block login.
- [ ] Server or OSS unavailable does not block login.
- [ ] Wrong manifest URL does not block login.
- [ ] Missing `project.manifest` does not block login.
- [ ] Missing `version.manifest` does not block login.
- [ ] One resource file returning 404 does not block login.
- [ ] Network disconnect during download does not block login.
- [ ] Closing the app mid-download does not break the next launch.

## Success Cases

- [ ] New version is detected after manifest version increments.
- [ ] Update downloads resources from OSS HTTPS.
- [ ] App restarts after update success.
- [ ] Log shows `stage=updated` and `needRestart=true`.
- [ ] After restart, local hot update version becomes the new version.
- [ ] The changed TS / resource behavior is visible on the phone.
- [ ] Repeated app launches do not download the same version again.
- [ ] Login still works after update.
- [ ] Main scene still loads after update.

## Failure Recovery

- [ ] Log shows `stage=failed` with a clear reason.
- [ ] Log shows `willContinueLogin=true` after failure.
- [ ] Failure count persists across app launches.
- [ ] 1-2 consecutive failures still allow automatic check on next launch.
- [ ] 3 consecutive failures pause automatic hot update checks.
- [ ] Login still continues when automatic check is paused.
- [ ] Tapping `清热更` clears hot update cache and failure count.
- [ ] Tapping `查热更` manually triggers a new check even after auto pause.
- [ ] Manual check failure still does not block login.

## Do Not Accept

- [ ] App is stuck before login because manifest cannot be fetched.
- [ ] App is stuck before login because resources cannot be downloaded.
- [ ] Hot update deletes APK built-in resources.
- [ ] Test APK contains a prod manifest URL.
- [ ] Phone uses `127.0.0.1` or LAN-only URLs for staging hot update.

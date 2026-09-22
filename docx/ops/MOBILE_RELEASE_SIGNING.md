# Android release signing (MOB-05)

Release builds **must not** use the committed debug keystore.

## Local / CI Gradle properties

Add to `~/.gradle/gradle.properties` or pass as `-P` flags / env vars:

```
RAIYAH_UPLOAD_STORE_FILE=/absolute/path/to/raiyah-upload.keystore
RAIYAH_UPLOAD_STORE_PASSWORD=***
RAIYAH_UPLOAD_KEY_ALIAS=raiyah-upload
RAIYAH_UPLOAD_KEY_PASSWORD=***
```

Or export the same names as environment variables before `./gradlew assembleRelease`.

## EAS

Prefer EAS credentials for Play upload keys. After a release APK/AAB is produced:

```bash
apksigner verify --print-certs app-release.apk
```

Assert the certificate is **not** `CN=Android Debug` and SHA-256 is **not**
`fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

# Park Master - Build Instructions

## Prerequisites
- Node.js & npm
- Java JDK 17+
- Android Studio (for Android build)
- Capacitor CLI

## 1. Web Build
First, compile the Angular application to the `www` folder:
```bash
npm run build
```
*(This uses `ng build` under the hood)*

## 2. Sync with Capacitor
Copy the web assets to the native Android project:
```bash
npx cap sync android
```
*If you haven't added the android platform yet:*
```bash
npx cap add android
```

## 3. Open in Android Studio
Open the native project to build the APK/Bundle:
```bash
npx cap open android
```

## 4. Android Build Configuration
1. Wait for Gradle Sync to complete.
2. Go to **Build > Generate Signed Bundle / APK**.
3. Choose **Android App Bundle** (for Play Store) or **APK** (for testing).
4. Create a new Keystore or use an existing one.
   - **Key Store Path**: `park-master-release.jks`
   - **Password**: (Your secure password)
   - **Key Alias**: `key0` (default)
5. Select **Release** build variant.
6. Click **Finish**.

## Troubleshooting
- **Asset Loading Errors**: Ensure `src/assets` is correctly mapped in `angular.json`.
- **Gradle Errors**: Check your JDK version (must be 17 for recent AGP versions).
- **Missing Plugins**: Run `npm install` and `npx cap sync` again.

## Testing on Device
Enable USB Debugging on your phone, connect via USB, and run from Android Studio (Green Play Button).

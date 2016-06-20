
all: release

release: android desktop

android: android-build android-sign

desktop: desktop-build

build:
	mkdir -p build

android-build: build
	cordova build --release android

android-sign: build
	cd platforms/android/build/outputs/apk && \
		jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore "$$KEYSTORE" -storepass:env KEYPASS -keypass:env KEYPASS android-release-unsigned.apk utadiary && \
	  zipalign -v -f 4 android-release-unsigned.apk UtaDiary.apk && \
	  cp UtaDiary.apk ../../../../../build/

desktop-build: build
	electron-packager www UtaDiary \
	  --platform=darwin,linux,win32 --arch=x64 --out=build \
	  --version=1.2.3

desktop-linux: build
	electron-packager www UtaDiary \
	  --platform=linux --arch=x64 --out=build \
	  --version=1.2.3 --overwrite

clean:
	rm -rf build

.PHONY: all release android desktop android-build android-sign desktop-build clean

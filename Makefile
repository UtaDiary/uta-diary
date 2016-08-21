
all: release

release: android desktop

android: android-build android-sign

desktop: desktop-build desktop-archives

serve:
	ionic-serve

live-reload:
	ionic serve --live-reload

build:
	mkdir -p build

android-build: build
	cordova build --release android

android-sign: build
	cd platforms/android/build/outputs/apk && \
		jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore "$$KEYSTORE" -storepass:env KEYPASS -keypass:env KEYPASS android-release-unsigned.apk utadiary && \
	  zipalign -v -f 4 android-release-unsigned.apk UtaDiary.apk && \
	  cp UtaDiary.apk ../../../../../build/

desktop-build: clean-desktop desktop-mac desktop-linux desktop-win

desktop-mac: build
	electron-packager www UtaDiary \
	  --icon=www/img/icons/icon.icns \
	  --platform=darwin --arch=x64 --out=build \
	  --version=1.2.3 --overwrite

desktop-linux: build
	electron-packager www UtaDiary \
	  --icon=www/img/icons/icon.png \
	  --platform=linux --arch=x64 --out=build \
	  --version=1.2.3 --overwrite

desktop-win: build
	electron-packager www UtaDiary \
	  --icon=www/img/icons/icon.ico \
	  --platform=win32 --arch=x64 --out=build \
	  --version=1.2.3 --overwrite

desktop-archives: clean-zip
	cd build && \
	  zip -r -q UtaDiary-Linux-x64.zip UtaDiary-linux-x64 && \
	  zip -r -q UtaDiary-OSX-x64.zip UtaDiary-darwin-x64 && \
	  zip -r -q UtaDiary-Windows-x64.zip UtaDiary-win32-x64

clean:
	rm -rf build

clean-desktop:
	rm -rf build/UtaDiary-*

clean-zip:
	rm -f build/UtaDiary-*.zip

.PHONY: all release android desktop serve live-reload android-build android-sign desktop-build desktop-mac desktop-linux desktop-win desktop-archives clean clean-desktop clean-zip


all: release

build:
	mkdir -p build

release: build build-android sign-android

build-android: build
	cordova build --release android

sign-android: build
	cd platforms/android/build/outputs/apk && \
	  jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore "$$KEYSTORE" android-release-unsigned.apk utadiary && \
	  zipalign -v -f 4 android-release-unsigned.apk UtaDiary.apk && \
	  cp UtaDiary.apk ../../../../../build/

clean:
	rm -rf build

.PHONY: all build release build-android sign-android clean

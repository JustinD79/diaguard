export default {
  expo: {
    name: "diabetes-care-app",
    slug: "diabetes-care-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    scheme: "diabetes-care-app",
    platforms: ["ios", "android", "web"],
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.diabetescare.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.diabetescare.app"
    },
    web: {
      favicon: "./assets/images/favicon.png",
      bundler: "metro",
      output: "single"
    },
    plugins: [
      "expo-router",
      [
        "expo-camera",
        {
          cameraPermission: "Allow $(PRODUCT_NAME) to access your camera to scan food items for diabetes management."
        }
      ]
    ],
    extra: {
      router: {
        origin: false
      }
    }
  }
};
# 🚀 React Native Starter Template

A powerful and flexible **starter template** for React Native developers, crafted to speed up development and maintain scalability. This template combines modern tools and libraries with an optimized folder structure to help you kick off your next React Native project with confidence.

---

## 🔧 Tech Stack

- ⚡ **Expo SDK 54 + React Native**
- 🎨 **React Native Paper (MUI)**
- 🔁 **Redux Toolkit** (fully integrated)
- 📱 **Expo Router** (file-based routing)
- 🎭 **Lottie Animations**
- 📁 **Optimized Folder Structure**
- 🌙 **Dark Theme System**
- 📶 **Internet Connectivity Monitoring**
- 🍞 **Toast Notifications**
- 🌐 **API Services Setup**

## 📂 Folder Structure

---

The project is structured for clarity, scalability, and modularity. Key folders include:

```plaintext
app/
├── (routes)/
│ ├── splash.tsx
│ ├── onboarding.tsx
├── (tabs)/
│ ├── _layout.tsx
│ ├── index.tsx
│ ├── settings.tsx
├── _layout.tsx
├── index.tsx

assets/
├── animation/
├── fonts/
├── images/

components/
├── Button.tsx
├── Loader.tsx

screens/
├── Home.tsx
├── Settings.tsx
├── Splash.tsx
├── NoInternet.tsx

services/
├── authServices.js
├── sampleServices.js
├── userServices.js

stores/
├── rootStore.js
├── rootReducer.js
├── user/

styles/
├── theme.ts

utils/
├── checkInternetConnection.util.tsx
├── requestPermission.util.tsx

hooks/
├── useShowToast.tsx

constants/
├── appNames.ts

Root files:
├── .env
├── .gitignore
├── app.json
├── eslint.config.js
├── expo-env.d.ts
├── LICENSE
├── package.json
├── README.md
├── tsconfig.json
```

---

## 🧪 API Example

A complete API call example is already integrated in **Home Screen** to demonstrate how to structure your services, handle API responses, and show toast notifications. The example includes:

- **Sample API Call**: Advice API integration
- **Error Handling**: Proper try-catch implementation
- **Toast Notifications**: Success, error, and warning messages
- **Service Structure**: Organized API service files

---

## 🚀 Getting Started

1. **Clone or Fork the Repository**

   ```bash
   git clone https://github.com/moaz-ze69/react-native-starter-template.git
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Start Development Server**

   ```bash
   npx expo start
   ```

4. **Run on specific platforms:**

   ```bash
   # iOS Simulator
   npm run ios

   # Android Emulator
   npm run android

   # Web Browser
   npm run web
   ```

## 🙌 Contributing

Feel free to fork the repo and suggest improvements or raise issues. Contributions are welcome!

## 📝 License

This project is open source and available under the [MIT License](https://github.com/moaz-ze69/react-native-starter-template/blob/main/LICENSE).

## 👨‍💻 Author

Built with ❤️ by [Muhammad Moaz Ahmed](https://www.linkedin.com/in/muhammad-moaz-ahmed).

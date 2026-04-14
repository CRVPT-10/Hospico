import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./index.css";
import App from "./App.tsx";
import { store, persistor } from "./store/store";

const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();

const appContent = (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <App />
    </PersistGate>
  </Provider>
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>{appContent}</GoogleOAuthProvider>
    ) : (
      appContent
    )}
  </StrictMode>
);

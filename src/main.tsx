import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/base.css";
import "./styles/shell.css";

// Dev-only test hook (tree-shaken out of production builds via import.meta.env.DEV)
// — lets automated tests drive the real stores to verify per-user data isolation.
if (import.meta.env.DEV) {
  void Promise.all([import("./store/store"), import("./store/auth")]).then(
    ([store, auth]) => {
      (window as unknown as { __heal?: unknown }).__heal = {
        useHeal: store.useHeal,
        loadUserData: store.loadUserData,
        clearActiveUser: store.clearActiveUser,
        useAuth: auth.useAuth,
      };
    }
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ensureSignedIn } from "./lib/firebase";

// 앱 시작 시 익명 로그인 시작 (백그라운드)
ensureSignedIn().catch((err) => console.error("Auth error:", err));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

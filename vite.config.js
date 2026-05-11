import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 같은 네트워크의 다른 기기에서 접속 가능
  },
});

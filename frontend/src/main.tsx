import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppProviders } from "@/app/providers/AppProviders.tsx";
import { AppRouter } from "@/app/router.tsx";

import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
);

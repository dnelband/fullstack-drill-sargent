import React from "react";
import ReactDOM from "react-dom/client";
import { currentChallenge } from "../../config/current-challenge.ts";
import { loadChallengeApp } from "./load-challenge-app.tsx";
import "./styles.css";

document.title = `${currentChallenge.title} Challenge`;

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
const ChallengeApp = await loadChallengeApp();

root.render(
  <React.StrictMode>
    <ChallengeApp />
  </React.StrictMode>,
);

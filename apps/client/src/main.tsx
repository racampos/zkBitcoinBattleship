/**
 * React entry point for ZK Battleship
 */

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(<App />);

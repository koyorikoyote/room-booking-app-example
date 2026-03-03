import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { renderToPipeableStream } from "react-dom/server";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import authRoutes from "./routes/auth";
import bookingsRoutes from "./routes/bookings";
import departmentsRoutes from "./routes/departments";
import roomsRoutes from "./routes/rooms";
import usersRoutes from "./routes/users";
import prisma from "../shared/lib/prisma";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:3002",
];

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }

  next();
});

// Serve static files in production
let manifest: Record<string, string> = {};
if (process.env.NODE_ENV === "production") {
  const clientDistPath = path.resolve(__dirname, "../client");
  app.use(express.static(clientDistPath));

  try {
    const manifestPath = path.join(clientDistPath, "manifest.json");
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    }
  } catch (err) {
    console.error("Could not load manifest.json", err);
  }
}

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/departments", departmentsRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/users", usersRoutes);

// Fast health endpoint used by load balancer (no DB access)
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is running",
    database: "Connected to MySQL via Prisma",
  });
});

// SSR routes - catch all non-API routes
app.use(async (req: Request, res: Response, next: NextFunction) => {
  // Skip API routes
  if (req.path.startsWith("/api/")) {
    return next();
  }

  // Only handle GET requests for SSR
  if (req.method !== "GET") {
    return next();
  }

  try {
    const App = (await import("../client/App")).default;

    const Html = ({ children }: { children?: React.ReactNode }) => {
      const mainJs = manifest["main.js"] || "/main.js";
      const stylesCss = manifest["main.css"] || "/styles.css";

      return React.createElement(
        "html",
        { lang: "en" },
        React.createElement(
          "head",
          null,
          React.createElement("meta", { charSet: "utf-8" }),
          React.createElement("meta", {
            name: "viewport",
            content: "width=device-width, initial-scale=1",
          }),
          React.createElement("link", {
            rel: "stylesheet",
            href: stylesCss,
          }),
          React.createElement("title", null, "Room Booking System")
        ),
        React.createElement(
          "body",
          null,
          React.createElement("div", { id: "root" }, children),
          React.createElement("script", { src: mainJs, defer: true })
        )
      );
    };

    const reactApp = React.createElement(
      Html,
      null,
      React.createElement(
        MemoryRouter,
        { initialEntries: [req.url] },
        React.createElement(App)
      )
    );

    const { pipe, abort } = renderToPipeableStream(reactApp, {
      onShellReady() {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.write("<!DOCTYPE html>");
        pipe(res);
      },
      onShellError(error) {
        console.error("SSR Shell Error:", error);
        res.status(500);
        res.send(
          "<!doctype html><html><body><h1>Server Error</h1></body></html>"
        );
      },
      onError(error) {
        console.error("SSR Error:", error);
      },
    });

    globalThis.setTimeout(() => {
      abort();
    }, 10000);
  } catch (error) {
    console.error("SSR Error:", error);
    res.status(500);
    res.send("<!doctype html><html><body><h1>Server Error</h1></body></html>");
  }
});

// Error handling middleware (must be last)
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

export default app;

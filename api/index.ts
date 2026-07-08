import express from "express";

const app = express();

// A robust wrapper that dynamically imports the server and catches any startup or import errors.
// This prevents Vercel FUNCTION_INVOCATION_FAILED and instead returns the exact error.
app.all("*", async (req, res) => {
  try {
    const { createExpressApp } = await import("../server.ts");
    const realApp = createExpressApp();
    return realApp(req, res);
  } catch (error: any) {
    console.error("[Vercel API Wrapper] Error loading app:", error);
    res.status(500).json({
      success: false,
      error: "FUNCTION_LOADING_ERROR",
      message: error?.message || String(error),
      stack: error?.stack,
      hint: "This error was captured by the API wrapper on Vercel."
    });
  }
});

export default app;


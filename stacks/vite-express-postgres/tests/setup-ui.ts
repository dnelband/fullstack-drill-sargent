import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined") {
  const { configure } = await import("@testing-library/react");

  configure({
    getElementError(message) {
      const text = message ?? "Unable to find element";
      const shortMessage = text.split("\n\n")[0] ?? text;
      const error = new Error(shortMessage);
      error.name = "TestingLibraryElementError";
      return error;
    },
  });
}

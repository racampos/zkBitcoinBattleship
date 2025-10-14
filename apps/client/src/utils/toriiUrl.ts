/**
 * Utility to get Torii URLs from environment or defaults
 */

// Get base Torii URL (for gRPC, port 8081)
export const getToriiUrl = () => {
  return import.meta.env.VITE_TORII_URL || "http://localhost:8081";
};

// Get Torii GraphQL URL (HTTP endpoint)
export const getToriiGraphQLUrl = () => {
  const baseUrl = import.meta.env.VITE_TORII_URL || "http://localhost:8081";
  
  // If using localhost proxy, use the proxy path
  if (baseUrl.includes("localhost:8081")) {
    return "/torii-graphql"; // Use Vite proxy for local development
  }
  
  // For remote Torii, use the same port but add /graphql path
  const url = new URL(baseUrl);
  url.pathname = "/graphql";
  return url.toString();
};


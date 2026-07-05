import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get-profile";
import listOrders from "./tools/list-orders";
import listProducts from "./tools/list-products";
import listNotifications from "./tools/list-notifications";
import listPointTransactions from "./tools/list-point-transactions";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "kaung-pix-print-mcp",
  title: "Kaung Pix & Print",
  version: "0.1.0",
  instructions:
    "Tools for the Kaung Pix & Print shop. Use these to look up the signed-in user's profile, wallet/points, orders, and notifications, and to browse available products.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfile, listOrders, listProducts, listNotifications, listPointTransactions],
});

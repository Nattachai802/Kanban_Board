import { api } from "./api";
export const listNotifications = () => api.get("/api/notifications/");

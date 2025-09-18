import { api } from "./api";
const PREFIX = "/api";

export function listAssignees(taskId) {
  return api.get(`${PREFIX}/tasks/${taskId}/assignees/`);
}

export function addAssignee(taskId, username) {
  return api.post(`${PREFIX}/tasks/${taskId}/assignees/`, { username });
}

export function removeAssignee(taskId, userId) {
  return api.delete(`${PREFIX}/tasks/${taskId}/assignees/${userId}/`);
}
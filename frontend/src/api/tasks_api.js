import { api } from "./api";
const PREFIX = "/api";

export function listTasks(columnId) {
  return api.get(`${PREFIX}/columns/${columnId}/tasks/`); 
}

export function createTask(columnId, payload) {
  return api.post(`${PREFIX}/columns/${columnId}/tasks/`, payload);
}

export function updateTask(id, payload) {
  return api.patch(`${PREFIX}/tasks/${id}/`, payload);
}
export function deleteTask(id) {
  return api.delete(`${PREFIX}/tasks/${id}/`);
}
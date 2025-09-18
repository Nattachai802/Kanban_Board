import { api } from "./api";
const P = "/api";

export const listBoardTags = (boardId) => api.get(`${P}/boards/${boardId}/tags/`);
export const createBoardTag = (boardId, payload) => api.post(`${P}/boards/${boardId}/tags/`, payload);
export const listTaskTags = (taskId) => api.get(`${P}/tasks/${taskId}/tags/`);
export const addTaskTag = (taskId, tagId) => api.post(`${P}/tasks/${taskId}/tags/`, { tag_id: tagId });
export const removeTaskTag = (taskId, tagId) => api.delete(`${P}/tasks/${taskId}/tags/${tagId}/`);

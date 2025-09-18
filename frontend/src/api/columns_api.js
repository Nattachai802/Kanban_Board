import { api } from "./api";

export async function listColumns(boardId) {
  return await api.get(`/api/boards/${boardId}/columns/`);
}

export async function createColumn(boardId, data) {
  return await api.post(`/api/boards/${boardId}/columns/`, data);
}

export async function updateColumn(columnId, data) {
  // Make sure we're using the correct endpoint and method
  return await api.patch(`/api/columns/${columnId}/`, data);
}

export async function deleteColumn(columnId) {
  // Make sure we're using the correct endpoint
  return await api.delete(`/api/columns/${columnId}/`);
}
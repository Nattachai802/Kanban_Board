import { api } from "./api";

const PREFIX = "/api";

export function listBoards() {
  return api.get(`${PREFIX}/boards/`);
}

export function createBoard(payload) {
  return api.post(`${PREFIX}/boards/`, payload);
}

export function getBoard(boardId) {
  return api.get(`${PREFIX}/boards/${boardId}/`);
}

export async function updateBoard(id, data) {
  return api.patch(`/api/boards/${id}/`, data);
}

export async function deleteBoard(id) {
  return api.delete(`/api/boards/${id}/`);
}
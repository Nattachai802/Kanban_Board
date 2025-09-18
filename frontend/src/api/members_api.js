import { api } from "./api";
const PREFIX = "/api";

export function listMembers(boardId) {
  return api.get(`${PREFIX}/boards/${boardId}/members/`);
}

export function inviteMember(boardId, { username, role }) {
  return api.post(`${PREFIX}/boards/${boardId}/members/`, { username, role });
}

export function updateMemberRole(boardId, memberId, role) {
  return api.patch(`${PREFIX}/boards/${boardId}/members/${memberId}/`, { role });
}

export function removeMember(boardId, memberId) {
  return api.delete(`${PREFIX}/boards/${boardId}/members/${memberId}/`);
}


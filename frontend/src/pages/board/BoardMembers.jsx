import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { listMembers, inviteMember, updateMemberRole, removeMember } from "../../api/members_api";

const ROLES = ["owner", "editor", "viewer"];

// ฟังก์ชั่นช่วยแปลงบทบาทเป็นภาษาไทยและสีที่เหมาะสม
function getRoleBadgeClass(role) {
  switch (role) {
    case 'owner':
      return 'bg-indigo-100 text-indigo-800';
    case 'editor':
      return 'bg-blue-100 text-blue-800';
    case 'viewer':
      return 'bg-sky-50 text-sky-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getRoleTranslation(role) {
  switch (role) {
    case 'owner':
      return 'เจ้าของ';
    case 'editor':
      return 'แก้ไขได้';
    case 'viewer':
      return 'ดูอย่างเดียว';
    default:
      return role;
  }
}

export default function BoardMembers() {
  const { boardId } = useParams();
  const [members, setMembers] = useState([]);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ username: "", role: "viewer" });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true); setErr("");
      const { data } = await listMembers(boardId);
      setMembers(data.results || []);
    } catch (e) {
      setErr(e?.response?.data?.detail || "โหลดสมาชิกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => { 
    load(); 
  }, [load]);

  async function onInvite(e) {
    e.preventDefault();
    try {
      await inviteMember(boardId, form);
      setForm({ username: "", role: "viewer" });
      await load();
    } catch (e) {
      alert(JSON.stringify(e?.response?.data || "เชิญไม่สำเร็จ"));
    }
  }

  async function onChangeRole(memberId, role) {
    try {
      await updateMemberRole(boardId, memberId, role);
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
    } catch (e) {
      alert(e?.response?.data?.detail || "เปลี่ยนบทบาทไม่สำเร็จ");
    }
  }

  async function onRemove(memberId) {
    if (!confirm("เอาสมาชิกคนนี้ออกจากบอร์ด?")) return;
    try {
      await removeMember(boardId, memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (e) {
      alert(e?.response?.data?.detail || "ลบสมาชิกไม่สำเร็จ");
    }
  }

  return (
    <div className="p-6 max-w-[800px] mx-auto bg-white min-h-screen">
      <header className="flex items-center gap-4 mb-6">
        <Link 
          to={`/boards/${boardId}`}
          className="flex items-center gap-1 text-blue-600 hover:text-indigo-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>กลับ</span>
        </Link>
        <h1 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          สมาชิกบอร์ด
        </h1>
      </header>

      <section className="mb-8">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-blue-100">
          <h2 className="text-lg font-medium text-gray-800 mb-3">เชิญสมาชิกใหม่</h2>
          <form onSubmit={onInvite} className="flex flex-col md:flex-row gap-3">
            <input
              placeholder="ชื่อผู้ใช้ (username) ที่มีอยู่ในระบบ"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="flex-1 text-sm border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            <div className="flex gap-2">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="text-sm border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {getRoleTranslation(r)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!form.username.trim()}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  form.username.trim() 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                } transition-colors`}
              >
                เชิญ
              </button>
            </div>
          </form>
        </div>
      </section>

      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 rounded-full border-t-transparent"></div>
        </div>
      )}
      
      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
          <p className="text-sm">{err}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-5">
        <h2 className="text-lg font-medium text-gray-800 mb-4">สมาชิกทั้งหมด ({members.length})</h2>
        
        {members.length === 0 && !loading ? (
          <div className="text-center py-8 text-gray-500">ไม่พบสมาชิก</div>
        ) : (
          <ul className="space-y-3">
            {members.map(m => (
              <li 
                key={m.id} 
                className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row justify-between gap-3 hover:border-blue-200 hover:shadow-sm transition-all duration-200"
              >
                <div>
                  <div className="font-medium text-gray-800">@{m.user.username}</div>
                  <div className="text-sm text-gray-500">{m.user.email}</div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeClass(m.role)}`}>
                    {getRoleTranslation(m.role)}
                  </span>
                  <select 
                    value={m.role} 
                    onChange={e => onChangeRole(m.id, e.target.value)}
                    className="text-xs border border-blue-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{getRoleTranslation(r)}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => onRemove(m.id)}
                    className="ml-1 p-1.5 rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="ลบออกจากบอร์ด"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listBoards, createBoard } from "../../api/boards_api";
import { listNotifications } from "../../api/notification_api"; // เพิ่ม import นี้
import { LogOut } from "lucide-react"; // Import log-out icon

export default function BoardsList() {
  const [boards, setBoards] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [notifs, setNotifs] = useState([]); // เพิ่ม state สำหรับการแจ้งเตือน
  const nav = useNavigate();

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const { data } = await listBoards();
      if (Array.isArray(data)) {
        setBoards(data);
      } else if (Array.isArray(data.results)) {
        setBoards(data.results);
      } else {
        setBoards([]);
      }
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load boards");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // เพิ่ม useEffect สำหรับโหลดการแจ้งเตือน
  useEffect(() => {
    listNotifications()
      .then((res) => {
        // ตรวจสอบโครงสร้างข้อมูลและกำหนดค่าให้ถูกต้อง
        if (Array.isArray(res.data)) {
          setNotifs(res.data);
        } else if (res.data && Array.isArray(res.data.results)) {
          setNotifs(res.data.results);
        } else {
          console.error("ข้อมูลการแจ้งเตือนไม่อยู่ในรูปแบบที่คาดหวัง:", res.data);
          setNotifs([]);
        }
      })
      .catch((error) => {
        console.error("เกิดข้อผิดพลาดในการโหลดการแจ้งเตือน:", error);
        setNotifs([]);
      });
  }, []);

  async function onCreate() {
    if (!name.trim()) return;
    try {
      const { data } = await createBoard({ name });
      setName("");
      setBoards((prev) => [data, ...prev]);
    } catch (e) {
      alert(JSON.stringify(e?.response?.data || "Failed to create board"));
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 opacity-60"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 opacity-60"></div>
      </div>

      {/* Boards List Card */}
      <div className="relative z-10 bg-white/70 backdrop-blur-sm p-8 sm:p-10 rounded-3xl shadow-xl border border-white/20 max-w-4xl w-full mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Boards</h2>
          <button
            onClick={() => {
              localStorage.removeItem("auth");
              location.href = "/login";
            }}
            className="flex items-center gap-2 py-2 px-4 rounded-lg bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold shadow-md hover:from-red-700 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </header>

        {/* เพิ่มส่วนการแจ้งเตือน */}
        <aside className="mb-6 p-4 bg-white/80 rounded-lg border border-indigo-100 shadow-sm">
          <h4 className="text-lg font-semibold text-indigo-800 mb-2">
            การแจ้งเตือน
          </h4>
          {!Array.isArray(notifs) || notifs.length === 0 ? (
            <p className="text-gray-500 text-sm">ไม่มีการแจ้งเตือน</p>
          ) : (
            <ul className="space-y-2">
              {notifs.map((n) => (
                <li
                  key={n.id}
                  className="text-sm px-3 py-2 rounded bg-indigo-50 border-l-2 border-indigo-300"
                >
                  {n.message}
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Create Board Section */}
        <section className="flex gap-4 mb-6">
          <input
            placeholder="New board name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 bg-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
          />
          <button
            onClick={onCreate}
            className="py-2 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold shadow-md hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
          >
            Create
          </button>
        </section>

        {/* Error Message */}
        {err && (
          <p className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {err}
          </p>
        )}

        {/* Loading State */}
        {loading && <p className="text-center text-gray-500">Loading...</p>}

        {/* Boards List */}
        <ul className="grid gap-4 list-none p-0">
          {boards.map((b) => (
            <li
              key={b.id}
              onClick={() => nav(`/boards/${b.id}`)}
              className="p-4 rounded-lg border border-gray-300 bg-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer"
              title={`Owner: ${b.owner} • Created: ${new Date(
                b.created_at
              ).toLocaleString()}`}
            >
              <div className="font-semibold text-gray-900">{b.name}</div>
              <div className="text-sm text-gray-500">
                owner: {b.owner} • created:{" "}
                {new Date(b.created_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

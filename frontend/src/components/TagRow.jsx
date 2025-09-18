import { useState, useEffect } from "react";
import { listBoardTags, addTaskTag, removeTaskTag, listTaskTags, createBoardTag } from "../api/tag_api";
import toast from "react-hot-toast";

// แท็กเริ่มต้นสำหรับกรณีที่ API ส่งข้อมูลว่างกลับมา
// ปรับสีให้เข้ากับธีม Zen Kanban
const DEFAULT_TAGS = [
  { id: -1, name: 'สำคัญ', color: '#6366f1' }, // indigo-500
  { id: -2, name: 'ด่วน', color: '#f97316' }, // orange-500
  { id: -3, name: 'กำลังทำ', color: '#3b82f6' }, // blue-500
  { id: -4, name: 'เสร็จสิ้น', color: '#22c55e' }, // green-500
];

export default function TagRow({ boardId, task }) {
  const [availableTags, setAvailableTags] = useState([]);
  const [taskTags, setTaskTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [pendingTagId, setPendingTagId] = useState(null);

  // โหลดข้อมูลแท็กทั้งหมดของบอร์ดและแท็กของงาน
  useEffect(() => {
    async function loadData() {
      if (!boardId || !task?.id || pending) return;
      
      try {
        setLoading(true);
        
        // โหลดแท็กของบอร์ดและแท็กของงาน
        const [boardTagsRes, taskTagsRes] = await Promise.all([
          listBoardTags(boardId),
          listTaskTags(task.id)
        ]);
        
        console.log("Board Tags Response:", boardTagsRes.data);
        console.log("Task Tags Response:", taskTagsRes.data);
        
        // วิเคราะห์รูปแบบข้อมูลที่ได้รับ
        let boardTags = [];
        if (Array.isArray(boardTagsRes.data)) {
          boardTags = boardTagsRes.data;
        } else if (boardTagsRes.data && boardTagsRes.data.results && Array.isArray(boardTagsRes.data.results)) {
          boardTags = boardTagsRes.data.results;
        }
        
        let currentTaskTags = [];
        if (Array.isArray(taskTagsRes.data)) {
          currentTaskTags = taskTagsRes.data;
        } else if (taskTagsRes.data && taskTagsRes.data.results && Array.isArray(taskTagsRes.data.results)) {
          currentTaskTags = taskTagsRes.data.results;
        }
        
        console.log("Parsed Board Tags:", boardTags);
        console.log("Parsed Task Tags:", currentTaskTags);
        
        // ถ้าไม่พบแท็กของบอร์ด ให้ใช้แท็กเริ่มต้น
        if (boardTags.length === 0) {
          boardTags = [...DEFAULT_TAGS];
        }
        
        // เก็บข้อมูลแท็กของงาน
        setTaskTags(currentTaskTags);
        
        // กรองแท็กที่ยังไม่ได้ใช้กับงาน - แก้ไขเงื่อนไขการเปรียบเทียบ
        const unused = boardTags.filter(boardTag => 
          !currentTaskTags.some(taskTag => 
            String(taskTag.id) === String(boardTag.id) || 
            (taskTag.tag && String(taskTag.tag.id) === String(boardTag.id))
          )
        );
        
        console.log("Available Tags:", unused);
        setAvailableTags(unused);
      } catch (error) {
        console.error("Error loading tags:", error);
        // ถ้าเกิด error ให้ใช้แท็กเริ่มต้น
        setAvailableTags(DEFAULT_TAGS);
        toast.error("ไม่สามารถโหลดข้อมูลแท็กได้ ใช้แท็กเริ่มต้นแทน");
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [boardId, task?.id, pending]);

  // แก้ไขฟังก์ชัน handleAddTag
  async function handleAddTag() {
    const tagId = selectedTag;
    const tag = availableTags.find(t => String(t.id) === String(tagId));
    
    if (!tag || !task?.id || pending) return;
    
    // เก็บ snapshot ของข้อมูลปัจจุบัน
    const prevTaskTags = [...taskTags];
    const prevAvailable = [...availableTags];

    // Optimistic update
    setTaskTags([...taskTags, tag]);
    setAvailableTags(availableTags.filter(t => String(t.id) !== String(tagId)));
    setSelectedTag("");
    setPending(true);
    setPendingTagId(tagId);

    try {
      // ตรวจสอบว่าเป็นแท็กเริ่มต้นหรือไม่
      if (tag.id < 0) {
        // กรณีแท็กเริ่มต้น ให้สร้างแท็กในฐานข้อมูลก่อน
        console.log("Creating default tag:", tag);
        // ต้องเพิ่มฟังก์ชัน createBoardTag ในไฟล์ tag_api.js
        const createResponse = await createBoardTag(boardId, { 
          name: tag.name, 
          color: tag.color 
        });
        
        // ใช้ ID ของแท็กที่เพิ่งสร้างเพื่อเพิ่มให้กับ task
        const newTagId = createResponse.data.id;
        await addTaskTag(task.id, newTagId);
      } else {
        // กรณีแท็กปกติ
        await addTaskTag(task.id, tagId);
      }
      
      toast.success(`เพิ่มแท็ก "${tag.name}" แล้ว`);
    } catch (error) {
      // Revert สถานะเมื่อเกิดข้อผิดพลาด
      setTaskTags(prevTaskTags);
      setAvailableTags(prevAvailable);
      toast.error(error?.response?.data?.detail ?? "เพิ่มแท็กล้มเหลว");
      console.error("Error adding tag:", error);
    } finally {
      setPending(false);
      setPendingTagId(null);
    }
  }

  async function handleRemoveTag(tagId) {
    if (!task?.id || pending) return;
    
    // หา tag ที่จะลบ
    const tag = taskTags.find(t => t.id === tagId);
    if (!tag) return;
    
    // เก็บ snapshot ของข้อมูลปัจจุบัน
    const prevTaskTags = [...taskTags];
    const prevAvailable = [...availableTags];
    
    // Optimistic update
    setTaskTags(taskTags.filter(t => t.id !== tagId));
    
    // เพิ่มกลับไปยัง available tags โดยเรียงตามชื่อ
    const newAvailable = [...availableTags, tag].sort((a, b) => 
      a.name.localeCompare(b.name)
    );
    setAvailableTags(newAvailable);
    setPending(true);
    setPendingTagId(tagId);
    
    try {
      // เรียก API
      await removeTaskTag(task.id, tagId);
      toast.success(`ลบแท็ก "${tag.name}" แล้ว`);
    } catch (error) {
      // Revert สถานะเมื่อเกิดข้อผิดพลาด
      setTaskTags(prevTaskTags);
      setAvailableTags(prevAvailable);
      toast.error(error?.response?.data?.detail ?? "ลบแท็กล้มเหลว");
      console.error("Error removing tag:", error);
    } finally {
      setPending(false);
      setPendingTagId(null);
    }
  }

  return (
    <div className="mt-4 space-y-2">
      {loading && (
        <div className="flex items-center text-xs text-gray-500 gap-1">
          <svg 
            className="animate-spin h-3 w-3 text-gray-500" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            ></circle>
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          กำลังโหลดข้อมูล...
        </div>
      )}
      
      {/* แสดง tags ที่มีใน task */}
      {taskTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {taskTags.map(tag => (
            <span 
              key={tag.id}
              className="text-xs py-1 px-2 rounded-full flex items-center gap-1.5 shadow-sm transition-all duration-200"
              style={{
                backgroundColor: tag.color || "#e5e7eb",
                color: getContrastColor(tag.color || "#e5e7eb"),
                opacity: pendingTagId === tag.id ? 0.5 : 1
              }}
            >
              {tag.name}
              <button 
                onClick={() => handleRemoveTag(tag.id)}
                className={`
                  flex items-center justify-center w-4 h-4 rounded-full
                  opacity-70 hover:opacity-100 hover:bg-black/10 
                  transition-all duration-150 font-bold text-[11px] 
                  focus:outline-none focus:ring-2 focus:ring-white/30
                  ${pending ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
                disabled={pending}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      
      {/* เพิ่ม tag ใหม่ถ้ายังมีให้เลือก */}
      {availableTags.length > 0 && (
        <div className="flex gap-2 items-center">
          <select 
            value={selectedTag} 
            onChange={e => setSelectedTag(e.target.value)}
            className={`
              text-xs py-1.5 px-2 flex-1 rounded-lg border border-gray-200 
              shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200
              focus:outline-none transition-all duration-200 bg-white text-gray-700
              ${(pending || loading) ? 'opacity-60 cursor-not-allowed' : ''}
            `}
            disabled={pending || loading}
          >
            <option value="">-- เลือกแท็ก --</option>
            {availableTags.map(tag => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </select>
          <button 
            onClick={handleAddTag} 
            disabled={!selectedTag || pending || loading}
            className={`
              text-xs py-1.5 px-3 rounded-lg font-medium shadow-sm
              transform transition-all duration-200 focus:outline-none
              ${!selectedTag || pending || loading 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow active:scale-[0.98] focus:ring-2 focus:ring-indigo-300'}
            `}
          >
            {pending ? "กำลังเพิ่ม..." : "เพิ่ม"}
          </button>
        </div>
      )}
    </div>
  );
}

// ฟังก์ชั่นสำหรับคำนวณสีตัวอักษรที่เหมาะสม (ขาว/ดำ) ตามสีพื้นหลัง
function getContrastColor(hexColor) {
  // ตรวจสอบว่า hexColor เป็นค่าที่ถูกต้อง
  if (!hexColor || hexColor.length < 7) {
    return "#000000";
  }

  // แปลง hex color เป็น RGB
  try {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // คำนวณความสว่าง
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // หากความสว่างมากกว่า 128 ให้ใช้สีดำ ไม่เช่นนั้นใช้สีขาว
    return brightness > 128 ? "#1e293b" : "#ffffff";
  } catch (e) {
    console.error("Invalid hex color:", e);
    return "#000000";
  }
}

// src/pages/BoardDetail.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { listColumns, createColumn, updateColumn, deleteColumn } from "../../api/columns_api";
import { listTasks, createTask, updateTask, deleteTask } from "../../api/tasks_api";
import { getBoard, updateBoard, deleteBoard } from "../../api/boards_api"; 
import { listMembers } from "../../api/members_api"; 
import { addAssignee, removeAssignee } from "../../api/assignees_api"; 
import { api } from "../../api/api"; 
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import TagRow from "../../components/TagRow.jsx";

// สีโทนเย็นสำหรับคอลัมน์
const columnColors = [
  { header: "bg-cyan-50", border: "border-cyan-200" },
  { header: "bg-blue-50", border: "border-blue-200" },
  { header: "bg-indigo-50", border: "border-indigo-200" },
  { header: "bg-violet-50", border: "border-violet-200" },
  { header: "bg-purple-50", border: "border-purple-200" },
  { header: "bg-teal-50", border: "border-teal-200" },
];

export default function BoardDetail() {
  const { boardId } = useParams();
  const navigate = useNavigate(); // Add this for navigation after deletion
  
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tasksByCol, setTasksByCol] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [members, setMembers] = useState([]); 
  const [isEditingBoard, setIsEditingBoard] = useState(false);
  const [boardName, setBoardName] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true); setErr("");
        const [bRes, cRes, mRes] = await Promise.all([
          getBoard(boardId).catch(()=>({data:null})),
          listColumns(boardId),
          listMembers(boardId),
        ]);
        setBoard(bRes?.data || null);
        setBoardName(bRes?.data?.name || "");
        setMembers(mRes?.data || []);
        const cols = Array.isArray(cRes.data)
          ? cRes.data
          : Array.isArray(cRes.data?.results)
            ? cRes.data.results
            : [];
        setColumns(cols);

        const taskResList = await Promise.all(cols.map(col => listTasks(col.id)));

        const dict = {};
        cols.forEach((col, idx) => {
          const taskData = taskResList[idx].data;
          
          if (Array.isArray(taskData)) {
            dict[col.id] = taskData;
          } else if (taskData && Array.isArray(taskData.results)) {
            dict[col.id] = taskData.results;
          } else {
            dict[col.id] = [];
          }
        });
        setTasksByCol(dict);
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.detail || "โหลดข้อมูลบอร์ดไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [boardId]);

  async function refreshAssignees(columnId) {
    try {
      const { data } = await listTasks(columnId);
      const tasks = Array.isArray(data) ? data : 
                   Array.isArray(data?.results) ? data.results : [];
      setTasksByCol(prev => ({
        ...prev,
        [columnId]: tasks
      }));
    } catch (e) {
      console.error("Failed to refresh tasks:", e);
    }
  }

  async function onCreateColumn(name) {
    if (!name.trim()) return;
    const { data } = await createColumn(boardId, { name });
    setColumns(prev => [...prev, data].sort((a,b)=>a.order-b.order));
    setTasksByCol(prev => ({ ...prev, [data.id]: [] }));
  }

  async function onRenameColumn(id, name) {
    if (!name.trim()) return;
    try {
      const { data } = await updateColumn(id, { name });
      setColumns(prev => prev.map(c => c.id===id ? { ...c, name: data.name } : c));
    } catch (error) {
      console.error("Failed to rename column:", error);
      setErr(error?.response?.data?.detail || "คุณไม่มีสิทธิ์แก้ไขคอลัมน์นี้");
      // Show error for 3 seconds then clear
      setTimeout(() => setErr(""), 3000);
    }
  }

  async function onDeleteColumn(id) {
    if (!confirm("ลบคอลัมน์นี้และงานทั้งหมดในคอลัมน์?")) return;
    try {
      await deleteColumn(id);
      setColumns(prev => prev.filter(c => c.id !== id));
      setTasksByCol(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (error) {
      console.error("Failed to delete column:", error);
      setErr(error?.response?.data?.detail || "คุณไม่มีสิทธิ์ลบคอลัมน์นี้");
      // Show error for 3 seconds then clear
      setTimeout(() => setErr(""), 3000);
    }
  }

  async function onCreateTask(columnId, title, description="") {
    if (!title.trim()) return;
    const { data } = await createTask(columnId, { title, description });
    setTasksByCol(prev => {
      const next = { ...prev };
      const arr = Array.isArray(next[columnId]) ? next[columnId] : [];
      next[columnId] = [...arr, data].sort((a, b) => a.order - b.order);
      return next;
    });
  }

  async function onUpdateTask(taskId, columnId, patch) {
    const { data } = await updateTask(taskId, patch);
    setTasksByCol(prev => {
      const next = { ...prev };
      next[columnId] = (next[columnId]||[]).map(t => t.id===taskId ? { ...t, ...data } : t);
      return next;
    });
  }

  async function onDeleteTask(taskId, columnId) {
    if (!confirm("ลบงานนี้?")) return;
    await deleteTask(taskId);
    setTasksByCol(prev => {
      const next = { ...prev };
      next[columnId] = (next[columnId]||[]).filter(t => t.id !== taskId);
      return next;
    });
  }

  async function handleUpdateBoard() {
    try {
      await updateBoard(boardId, { name: boardName });
      setBoard(prev => ({ ...prev, name: boardName }));
      setIsEditingBoard(false);
    } catch (error) {
      console.error("Failed to update board:", error);
      setErr("Failed to update board. You may not have permission.");
    }
  }

  async function handleDeleteBoard() {
    if (!confirm("Are you sure you want to delete this board?")) return;
    
    try {
      await deleteBoard(boardId);
      navigate("/boards"); // Redirect to boards list
    } catch (error) {
      console.error("Failed to delete board:", error);
      setErr("Failed to delete board. You may not have permission.");
    }
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 min-h-screen">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link 
            to="/boards" 
            className="flex items-center gap-1 text-blue-600 hover:text-indigo-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>กลับ</span>
          </Link>
          
          {isEditingBoard ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                className="text-xl px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />
              <button
                onClick={handleUpdateBoard}
                className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                title="บันทึก"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setBoardName(board?.name || "");
                  setIsEditingBoard(false);
                }}
                className="p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                title="ยกเลิก"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ) : (
            <h1 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              {board?.name || `Board #${boardId}`}
            </h1>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!isEditingBoard && (
            <button
              onClick={() => setIsEditingBoard(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50"
              title="แก้ไขบอร์ด"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>แก้ไข</span>
            </button>
          )}
          
          <button
            onClick={handleDeleteBoard}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
            title="ลบบอร์ด"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>ลบ</span>
          </button>
          
          <Link
            to={`/boards/${boardId}/members`}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-sm font-medium text-indigo-700
                      border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 hover:shadow-sm
                      transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <span>สมาชิก</span>
          </Link>
        </div>
      </header>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 rounded-full border-t-transparent"></div>
        </div>
      )}
      
      {err && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mt-4">
          <p className="text-sm">{err}</p>
        </div>
      )}

      {!loading && !err && (
        <BoardDetailDnD 
          columns={columns}
          tasksByCol={tasksByCol}
          members={members}
          setColumns={setColumns}
          setTasksByCol={setTasksByCol}
          onCreateTask={onCreateTask}
          onRenameColumn={onRenameColumn}
          onDeleteColumn={onDeleteColumn}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onAddAssignee={addAssignee}
          onRemoveAssignee={removeAssignee}
          refreshAssignees={refreshAssignees}
          onCreate={onCreateColumn}
        />
      )}
    </div>
  );
}

// New DnD wrapper component
function BoardDetailDnD({ 
  columns, 
  tasksByCol, 
  members, 
  setTasksByCol, 
  onCreateTask, 
  onRenameColumn, 
  onDeleteColumn, 
  onUpdateTask, 
  onDeleteTask,
  onAddAssignee,
  onRemoveAssignee,
  refreshAssignees,
  onCreate
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [_active, setActive] = useState(null); 
  const [draggedTask, setDraggedTask] = useState(null);

  async function saveReorder(columnId, ids) {
    try {
      await api.post(`/api/columns/${columnId}/tasks/reorder/`, { ids });
    } catch (error) {
      console.error("Error saving reordered tasks:", error);
    }
  }

  async function saveMove(taskId, toColId, beforeId = null, afterId = null) {
    try {
      await api.post(`/api/tasks/${taskId}/move/`, {
        column_id: toColId,
        before_id: beforeId,
        after_id: afterId,
      });
    } catch (error) {
      console.error("Error moving task:", error);
    }
  }

  function onDragStart(e) {
    const { id } = e.active;
    const fromCol = Object.keys(tasksByCol).find(cid => (tasksByCol[cid] || []).some(t => t.id === id));
    
    if (fromCol) {
      const task = tasksByCol[fromCol].find(t => t.id === id);
      setDraggedTask(task);
      setActive({ id, fromCol });
    }
  }

  async function onDragEnd(e) {
    const { active, over } = e;
    if (!over || !active) {
      setActive(null);
      setDraggedTask(null);
      return;
    }
    
    const taskId = active.id;
    const fromCol = active.data?.current?.columnId || Object.keys(tasksByCol).find(cid => 
      (tasksByCol[cid] || []).some(t => t.id === taskId)
    );
    
    const toCol = over.data?.current?.columnId || 
                  Object.keys(tasksByCol).find(cid => 
                    (tasksByCol[cid] || []).some(t => t.id === over.id)
                  );
                  
    if (!fromCol || !toCol) {
      setActive(null);
      setDraggedTask(null);
      return;
    }

    const fromList = tasksByCol[fromCol] || [];
    const toList = tasksByCol[toCol] || [];
    const fromIdx = fromList.findIndex(t => t.id === taskId);
    const overId = over.id;
    
    let newFrom = [...fromList];
    let newTo = [...toList];

    if (fromCol === toCol) {
      const toIdx = toList.findIndex(t => t.id === overId);
      if (toIdx === -1 || fromIdx === toIdx) {
        setActive(null);
        setDraggedTask(null);
        return;
      }
      
      newTo = arrayMove(toList, fromIdx, toIdx);
      setTasksByCol(prev => ({ ...prev, [toCol]: newTo }));
      await saveReorder(toCol, newTo.map(t => t.id));
    } else {
      const moving = fromList[fromIdx];
      if (!moving) {
        setActive(null);
        setDraggedTask(null);
        return;
      }
      
      newFrom = [...fromList.slice(0, fromIdx), ...fromList.slice(fromIdx + 1)];
      
      const toIdx = toList.findIndex(t => t.id === overId);
      if (toIdx === -1) {
        newTo = [...toList, moving];
      } else {
        newTo = [...toList.slice(0, toIdx), moving, ...toList.slice(toIdx)];
      }
      
      setTasksByCol(prev => ({ ...prev, [fromCol]: newFrom, [toCol]: newTo }));
      
      const before = newTo[Math.min(toIdx + 1, newTo.length - 1)]?.id || null;
      const after = toIdx > 0 ? newTo[toIdx - 1]?.id : null;
      
      await saveMove(taskId, Number(toCol), before, after);
      await saveReorder(toCol, newTo.map(t => t.id));
    }
    
    setActive(null);
    setDraggedTask(null);
  }

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={onDragStart} 
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-8">
        {columns.map((col, index) => (
          <SortableContext 
            key={col.id} 
            items={(tasksByCol[col.id] || []).map(t => t.id)} 
            strategy={verticalListSortingStrategy}
          >
            <DraggableColumnCard
              key={col.id}
              column={col}
              tasks={tasksByCol[col.id] || []}
              members={members} 
              onCreateTask={(title) => onCreateTask(col.id, title)}
              onRename={(name) => onRenameColumn(col.id, name)}
              onDelete={() => onDeleteColumn(col.id)}
              onUpdateTask={(taskId, patch) => onUpdateTask(taskId, col.id, patch)}
              onDeleteTask={(taskId) => onDeleteTask(taskId, col.id)}
              onAddAssignee={(taskId, username) => onAddAssignee(taskId, username).then(() => refreshAssignees(col.id))}
              onRemoveAssignee={(taskId, userId) => onRemoveAssignee(taskId, userId).then(() => refreshAssignees(col.id))}
              colorIndex={index % columnColors.length}
            />
          </SortableContext>
        ))}
        <NewColumnCard onCreate={onCreate} />
      </div>
      
      {createPortal(
        <DragOverlay>
          {draggedTask ? 
            <div className="bg-white border border-indigo-200 rounded-lg p-3 shadow-md w-[280px]">
              <div className="font-medium text-gray-800">{draggedTask.title}</div>
              {draggedTask.description && 
                <div className="text-xs mt-1 text-gray-500">{draggedTask.description}</div>
              }
            </div> 
          : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}

// Draggable version of TaskItem
function DraggableTaskItem(props) {
  const { task } = props;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task
    }
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 'auto'
  };

  return (
    <TaskItem
      {...props}
      dragHandleProps={{
        ref: setNodeRef, 
        style, 
        ...attributes, 
        ...listeners, 
        className: "bg-white border border-blue-100 rounded-lg p-3 hover:shadow-sm hover:border-blue-300 transition-all duration-150 cursor-grab active:cursor-grabbing"
      }}
    />
  );
}

// Draggable version of ColumnCard
function DraggableColumnCard(props) {
  const {column, colorIndex = 0} = props;
  
  return (
    <div 
      data-column-id={column.id}
      className="min-w-[300px] max-w-[300px]"
    >
      <ColumnCard 
        {...props}
        draggableTaskItem={DraggableTaskItem}
        colorClasses={columnColors[colorIndex]}
      />
    </div>
  );
}

function ColumnCard({ column, tasks, members, onCreateTask, onRename, onDelete, onUpdateTask, onDeleteTask, onAddAssignee, onRemoveAssignee, draggableTaskItem, colorClasses }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);
  
  // ดึง boardId จาก URL parameter
  const { boardId } = useParams();
  
  // Use either the draggable task component or the regular one
  const TaskComponent = draggableTaskItem || TaskItem;

  return (
    <div className={`bg-white rounded-xl ${colorClasses?.border || 'border-gray-200'} border shadow-sm`}>
      <div className={`p-3 ${colorClasses?.header || 'bg-white'} rounded-t-xl border-b border-b-blue-100 flex justify-between items-center`}>
        {editing ? (
          <form 
            onSubmit={(e)=>{e.preventDefault(); onRename(name); setEditing(false);}}
            className="flex gap-2 w-full"
          >
            <input 
              value={name} 
              onChange={(e)=>setName(e.target.value)} 
              className="flex-1 text-sm border border-blue-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              autoFocus
            />
            <div className="flex gap-1">
              <button 
                type="submit"
                className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button 
                type="button" 
                onClick={()=>{setName(column.name); setEditing(false);}}
                className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </form>
        ) : (
          <>
            <h3 className="font-medium text-gray-800">{column.name}</h3>
            <div className="flex gap-1">
              <button 
                onClick={()=>setEditing(true)}
                className="p-1.5 rounded-md hover:bg-white/50 text-gray-500 hover:text-blue-700 transition-colors"
                title="เปลี่ยนชื่อ"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button 
                onClick={onDelete}
                className="p-1.5 rounded-md hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                title="ลบคอลัมน์"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      <div className="p-3">
        <NewTaskForm onSubmit={onCreateTask} />

        <ul className="mt-3 space-y-2">
          {tasks.map(task => (
            <TaskComponent
              key={task.id}
              task={task}
              boardId={boardId}
              members={members}
              onUpdate={(patch)=>onUpdateTask(task.id, patch)}
              onDelete={()=>onDeleteTask(task.id)}
              onAddAssignee={(username) => onAddAssignee(task.id, username)}
              onRemoveAssignee={(userId) => onRemoveAssignee(task.id, userId)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function TaskItem({ task, boardId, members, onUpdate, onDelete, onAddAssignee, onRemoveAssignee, dragHandleProps }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ title: task.title, description: task.description || "" });
  const [pick, setPick] = useState("");

  const membersList = Array.isArray(members?.results) ? members.results : [];
  
  return (
    <li {...dragHandleProps}>
      {isEditing ? (
        <form 
          onSubmit={(e)=>{e.preventDefault(); onUpdate(form); setIsEditing(false);}}
          className="space-y-3 p-3"
        >
          <div>
            <input 
              value={form.title} 
              onChange={(e)=>setForm({...form, title:e.target.value})}
              className="w-full text-sm border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              placeholder="หัวข้องาน"
              autoFocus
            />
          </div>
          <div>
            <textarea
              rows={3} 
              value={form.description} 
              onChange={(e)=>setForm({...form, description:e.target.value})}
              className="w-full text-sm border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              placeholder="รายละเอียด (ถ้ามี)"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={()=>{ setForm({ title: task.title, description: task.description || "" }); setIsEditing(false); }}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              บันทึก
            </button>
          </div>
        </form>
      ) : (
        <div className="p-3">
          <div className="font-medium text-gray-800 text-sm">{task.title}</div>
          
          {task.description && (
            <div className="text-xs mt-1.5 text-gray-600 line-clamp-2">{task.description}</div>
          )}
          
          {/* แท็กส่วน */}
          {boardId && <TagRow boardId={boardId} task={task} />}

          {/* ส่วนมอบหมายงาน */}
          <div className="flex items-center gap-2 mt-3">
            <select 
              value={pick} 
              onChange={e=>setPick(e.target.value)}
              className="text-xs py-1 px-2 rounded border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              <option value="">-- มอบหมาย --</option>
              {membersList.map(m => (
                <option key={m.user.id} value={m.user.username}>
                  @{m.user.username} ({m.role})
                </option>
              ))}
            </select>
            <button 
              disabled={!pick} 
              onClick={()=>{ onAddAssignee(pick); setPick(""); }}
              className={`text-xs py-1 px-2 rounded ${pick ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'} transition-colors`}
            >
              เพิ่ม
            </button>
          </div>

          {/* แสดงผู้รับมอบหมาย */}
          {Array.isArray(task.assignees) && task.assignees.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {task.assignees.map(u => (
                <span 
                  key={u.id} 
                  className="flex items-center gap-1 bg-blue-50 text-blue-800 text-xs rounded-full py-0.5 pl-2 pr-1"
                >
                  @{u.username}
                  <button
                    onClick={()=>onRemoveAssignee(u.id)}
                    className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex justify-between">
            <div className="text-[10px] text-blue-400">
              สร้างเมื่อ {new Date(task.created_at).toLocaleString()}
            </div>
            <div className="flex gap-1">
              <button 
                onClick={()=>setIsEditing(true)}
                className="text-xs p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button 
                onClick={onDelete}
                className="text-xs p-1.5 bg-gray-50 text-gray-600 rounded hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

function NewTaskForm({ onSubmit }) {
  const [title, setTitle] = useState("");
  
  return (
    <form 
      onSubmit={(e)=>{e.preventDefault(); onSubmit(title); setTitle("");}} 
      className="flex gap-2"
    >
      <input 
        placeholder="เพิ่มงานใหม่..." 
        value={title} 
        onChange={e=>setTitle(e.target.value)}
        className="flex-1 text-sm border border-blue-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
      />
      <button 
        type="submit"
        disabled={!title.trim()}
        className={`
          flex items-center justify-center p-1.5 rounded-lg text-white
          ${title.trim() ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'}
          transition-colors
        `}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      </button>
    </form>
  );
}

function NewColumnCard({ onCreate }) {
  const [name, setName] = useState("");
  
  return (
    <div className="min-w-[300px] max-w-[300px] bg-white bg-opacity-90 backdrop-blur-sm rounded-xl border border-dashed border-blue-300 p-4 flex flex-col hover:border-blue-400 transition-colors shadow-sm">
      <h3 className="font-medium text-blue-700 mb-3">เพิ่มคอลัมน์ใหม่</h3>
      <form 
        onSubmit={(e)=>{e.preventDefault(); onCreate(name); setName("");}}
        className="flex gap-2"
      >
        <input 
          placeholder="ชื่อคอลัมน์" 
          value={name} 
          onChange={e=>setName(e.target.value)}
          className="flex-1 text-sm border border-blue-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
        <button 
          type="submit"
          disabled={!name.trim()}
          className={`
            flex items-center justify-center py-1.5 px-3 rounded-lg text-white font-medium text-sm
            ${name.trim() ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'}
            transition-colors
          `}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          สร้าง
        </button>
      </form>
    </div>
  );
}

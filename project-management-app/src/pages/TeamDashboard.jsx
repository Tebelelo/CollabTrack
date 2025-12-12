import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// CHANGE TO YOUR BACKEND URL
const API_BASE = "https://collabtrack-oruu.onrender.com/api";

const statusOptions = [
  { value: 'Backlog', label: 'Backlog', color: 'bg-gray-500' },
  { value: 'To-Do', label: 'To Do', color: 'bg-blue-500' },
  { value: 'In-progress', label: 'In Progress', color: 'bg-amber-500' },
  { value: 'Done', label: 'Done', color: 'bg-green-500' },
];

function TaskCard({ task, onStatusChange }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const currentStatus = statusOptions.find(opt => opt.value === task.status) || statusOptions[0];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        group relative bg-white rounded-xl border border-gray-200 p-5
        hover:border-gray-300 hover:shadow-xl cursor-grab active:cursor-grabbing
        transition-all duration-200 select-none
        ${isDragging ? 'opacity-70 rotate-6 scale-110 shadow-2xl z-50' : ''}
      `}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900 flex-1 pr-3">{task.title}</h3>

        {/* Status Dropdown */}
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task._id, e.target.value)}
          className={`px-3 py-1.5 text-xs font-medium text-white rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer transition-all ${currentStatus.color}`}
          style={{ minWidth: '100px' }}
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {task.description && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-4">{task.description}</p>
      )}

      {task.dueDate && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{new Date(task.dueDate).toLocaleDateString()}</span>
        </div>
      )}

      {/* Assigned By */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500">by</span>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white">
            {task.created_by_name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <span className="font-medium text-gray-800">
            {task.created_by_name || 'Unknown'}
          </span>
        </div>
      </div>

      <div className="absolute inset-0 rounded-xl ring-2 ring-transparent group-hover:ring-indigo-400/30 transition-all pointer-events-none" />
    </div>
  );
}

export default function TeamDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const currentUserId = user.id;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const columns = ['Backlog', 'To-Do', 'In-progress', 'Done'];
  const columnStyle = {
    Backlog: 'bg-gray-50/80',
    'To-Do': 'bg-blue-50/80',
    'In-progress': 'bg-amber-50/80',
    Done: 'bg-green-50/80',
  };

  // Fetch tasks
  useEffect(() => {
    const fetchMyTasks = async () => {
      if (!token || !currentUserId) {
        setError('Please log in');
        setLoading(false);
        return;
      }

      try {
        // Use the dedicated endpoint for fetching tasks assigned to the current user
        const res = await fetch(`${API_BASE}/tasks/user-assigned`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) throw new Error(`Failed to load tasks. Status: ${res.status}`);

        const myTasks = await res.json();
        const formattedTasks = myTasks.map(task => ({
          _id: task.id,
          title: task.title,
          description: task.description,
          status: task.status === 'pending' ? 'To-Do' :
            task.status === 'in_progress' ? 'In-progress' :
              task.status === 'done' ? 'Done' : 'Backlog',
          dueDate: task.due_date,
          created_by_name: task.created_by_name || 'Unknown',
        }));

        setTasks(formattedTasks);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Could not load your tasks');
        setTimeout(() => setError(null), 5000);
      } finally {
        setLoading(false);
      }
    };

    fetchMyTasks();
  }, [token, currentUserId]);

  // Handle status change from dropdown
  const handleStatusChange = async (taskId, newStatus) => {
    const oldTask = tasks.find(t => t._id === taskId);
    if (oldTask.status === newStatus) return;

    const statusMap = {
      'To-Do': 'pending',
      'In-progress': 'in_progress',
      'Done': 'done',
      'Backlog': 'backlog'
    };
    const dbStatus = statusMap[newStatus] || 'pending';

    // Optimistic UI update
    setTasks(prev => prev.map(t =>
      t._id === taskId ? { ...t, status: newStatus } : t
    ));

    try {
      await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: dbStatus }),
      });
    } catch (err) {
      setError('Failed to update status');
      // Revert
      setTasks(prev => prev.map(t =>
        t._id === taskId ? { ...t, status: oldTask.status } : t
      ));
    }
  };

  // Optional: Keep drag & drop too!
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const overId = over.id;

    let newStatus = null;
    if (columns.includes(overId)) {
      newStatus = overId;
    } else {
      const overTask = tasks.find(t => t._id === overId);
      newStatus = overTask?.status;
    }

    if (newStatus && newStatus !== tasks.find(t => t._id === taskId)?.status) {
      handleStatusChange(taskId, newStatus);
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading your tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-red-500 text-white p-4 text-center z-50 shadow-lg">
        <p className="font-semibold">Error: {error}</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-6 py-12">

          {/* Header Section */}
          <div className="mb-12">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-white text-xl font-bold">
                    {(user.username || 'M').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                    Task Dashboard
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Welcome back, <span className="font-semibold text-indigo-600">{user.username || 'Team Member'}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                <button
                  onClick={() => navigate('/tasks')}
                  className="inline-flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-xl hover:shadow-purple-500/30 transform hover:scale-105 transition-all duration-300 w-full sm:w-auto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2m-6-6h6m-6 4h6" />
                  </svg>
                  My Tasks
                </button>

                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    navigate('/');
                  }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-xl shadow-xl hover:shadow-red-500/30 transform hover:scale-105 transition-all duration-300 w-full sm:w-auto"
                  title="Logout"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <p className="text-lg text-gray-700 mb-2">
                <span className="font-semibold text-gray-900">Task Overview</span> — Track progress, update status, and manage deadlines.
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span>Backlog: {tasks.filter(t => t.status === 'Backlog').length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>To Do: {tasks.filter(t => t.status === 'To-Do').length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span>In Progress: {tasks.filter(t => t.status === 'In-progress').length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Done: {tasks.filter(t => t.status === 'Done').length}</span>
                </div>
                <div className="ml-auto font-medium">
                  Total: {tasks.length} tasks
                </div>
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {columns.map(column => {
              const columnTasks = tasks.filter(t => t.status === column);
              const taskIds = columnTasks.map(t => t._id);
              const columnInfo = statusOptions.find(opt => opt.value === column);

              return (
                <div
                  key={column}
                  id={column}
                  className={`${columnStyle[column]} rounded-2xl border border-gray-200 transition-all p-5 min-h-[600px]`}
                >
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${columnInfo?.color}`}></div>
                      <h2 className="text-xl font-bold text-gray-800">{column.replace('-', ' ')}</h2>
                    </div>
                    <span className="bg-white px-3 py-1.5 rounded-full font-bold text-gray-700 shadow-sm text-sm">
                      {columnTasks.length}
                    </span>
                  </div>

                  <SortableContext id={column} items={taskIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                      {columnTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2m-6-6h6m-6 4h6" />
                            </svg>
                          </div>
                          <p className="text-gray-500 font-medium">No tasks</p>
                          <p className="text-gray-400 text-sm mt-1">Drag tasks here or create new ones</p>
                        </div>
                      ) : (
                        columnTasks.map(task => (
                          <TaskCard
                            key={task._id}
                            task={task}
                            onStatusChange={handleStatusChange}
                          />
                        ))
                      )}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {tasks.find(t => t._id === activeId) && (
            <div className="rotate-6">
              <TaskCard task={tasks.find(t => t._id === activeId)} onStatusChange={() => { }} />
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
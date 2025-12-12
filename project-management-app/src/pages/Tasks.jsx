import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// CHANGE THIS TO MATCH YOUR BACKEND
const API_BASE = "https://collabtrack-oruu.onrender.com/api";

export default function Tasks() {
  const navigate = useNavigate();
  
  // Get current logged-in user from localStorage (same as your auth)
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const currentUserName = storedUser.username || storedUser.name || 'Team Member';
  const currentUserId = storedUser.id;

  const [myTasks, setMyTasks] = useState([]);
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [editingComment, setEditingComment] = useState(null); // { taskId: commentId, text: '...' }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTasksAndComments = async () => {
      if (!token || !currentUserId) {
        setError('Please log in to see your tasks.');
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch tasks assigned to the current user
        const res = await fetch(`${API_BASE}/tasks/user-assigned`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch tasks');
        const userTasksData = await res.json();

        // 2. Format the user's tasks
        const userTasks = userTasksData.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status === 'pending' ? 'To-Do' : 
                    task.status === 'in_progress' ? 'In-progress' : 
                    task.status === 'done' ? 'Done' : 'Backlog',
            priority: task.priority ? (task.priority.charAt(0).toUpperCase() + task.priority.slice(1)) : 'Medium',
            dueDate: task.due_date,
            created_by_name: task.created_by_name || 'Unknown',
          }));
        setMyTasks(userTasks);

        // 3. Fetch comments for each of the user's tasks
        const commentsData = {};
        for (const task of userTasks) {
          const commentsRes = await fetch(`${API_BASE}/tasks/${task.id}/comments`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (commentsRes.ok) {
            const taskComments = await commentsRes.json();
            commentsData[task.id] = taskComments.map(c => ({
              ...c,
              author: c.username,
              author_id: c.user_id,
              text: c.content,
              timestamp: new Date(c.created_at).toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            }));
          }
        }
        setComments(commentsData);

      } catch (err) {
        setError(err.message);
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasksAndComments();
  }, [token, currentUserId]);

const handleAddComment = async (taskId) => {
  const text = newComment[taskId]?.trim();
  if (!text) return;

  try {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        content: text  // Make sure it's 'content' not 'text'
      }),
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to post comment');
    }
    
    const newCommentData = await res.json();
    console.log('Comment added successfully:', newCommentData);
    
    // Format and add to state
    const formattedComment = { 
      ...newCommentData, 
      author: newCommentData.user_name || newCommentData.username,
      author_id: newCommentData.user_id,
      text: newCommentData.content, 
      timestamp: new Date(newCommentData.created_at).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) 
    };
    
    setComments(prev => ({ 
      ...prev, 
      [taskId]: [...(prev[taskId] || []), formattedComment] 
    }));
    setNewComment(prev => ({ ...prev, [taskId]: '' }));
    
  } catch (err) {
    console.error('Error adding comment:', err);
    alert(`Error: ${err.message}`);
  }
};

  const handleEditComment = async (taskId, commentId, newText) => {
    if (!newText.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/tasks/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newText }),
      });
      
      if (!res.ok) throw new Error('Failed to update comment');
      
      // Update the comment in state
      setComments(prev => ({
        ...prev,
        [taskId]: prev[taskId].map(comment =>
          comment.id === commentId
            ? { ...comment, text: newText }
            : comment
        )
      }));
      
      setEditingComment(null);
    } catch (err) {
      console.error('Error updating comment:', err);
      alert('Could not update comment. Please try again.');
    }
  };

  const handleDeleteComment = async (taskId, commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      const res = await fetch(`${API_BASE}/tasks/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error('Failed to delete comment');
      
      // Remove the comment from state
      setComments(prev => ({
        ...prev,
        [taskId]: prev[taskId].filter(comment => comment.id !== commentId)
      }));
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Could not delete comment. Please try again.');
    }
  };

  const startEditing = (taskId, commentId, currentText) => {
    setEditingComment({ taskId, commentId, text: currentText });
  };

  const cancelEditing = () => {
    setEditingComment(null);
  };

  const getPriorityColor = (p) => {
    switch (p.toLowerCase()) {
      case 'critical': return 'bg-red-50 text-red-700 border-red-200';
      case 'high': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'Done': return 'bg-green-50 text-green-700 border-green-200';
      case 'In-progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'To-Do': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'Backlog': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-lg text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Tasks</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">
                  {(currentUserName || 'M').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                  Task Details
                </h1>
                <p className="text-gray-600 mt-1">
                  Welcome back, <span className="font-semibold text-indigo-600">{currentUserName || 'Team Member'}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              <button
                onClick={() => navigate('/teamDashboard')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-medium rounded-xl border border-gray-300 shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-300 w-full sm:w-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Task Overview</h2>
                <p className="text-gray-600">
                  Review detailed information about your assigned tasks, collaborate with comments, and track progress.
                </p>
              </div>
              <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium">
                {myTasks.length} {myTasks.length === 1 ? 'Task' : 'Tasks'} Assigned
              </div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        {myTasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2m-6-6h6m-6 4h6" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No Tasks Assigned</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              You don't have any tasks assigned to you at the moment. Check back later or contact your manager for new assignments.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {myTasks.map(task => (
              <div key={task.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Task Header */}
                <div className="border-b border-gray-100 p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${getPriorityColor(task.priority)}`}>
                        {task.priority} Priority
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    {task.dueDate && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Due: {new Date(task.dueDate).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Created by: {task.created_by_name}</span>
                    </div>
                  </div>
                </div>

                {/* Task Content */}
                <div className="p-6">
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                    <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {task.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div className="border-t border-gray-100 pt-8">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-900">
                        Comments
                        <span className="ml-2 text-sm font-normal bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {(comments[task.id] || []).length}
                        </span>
                      </h3>
                      <button
                        onClick={() => {
                          const textarea = document.querySelector(`textarea[data-task-id="${task.id}"]`);
                          if (textarea) textarea.focus();
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Comment
                      </button>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-5 mb-8">
                      {(comments[task.id] || []).length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <p className="text-gray-500">No comments yet — start the conversation!</p>
                        </div>
                      ) : (
                        comments[task.id].map(c => {
                          const isEditing = editingComment && 
                                          editingComment.taskId === task.id && 
                                          editingComment.commentId === c.id;
                          const isCurrentUserComment = c.author_id === currentUserId;
                          
                          return (
                            <div key={c.id} className="flex gap-4 group">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {c.author?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div className="flex-1">
                                <div className="bg-gray-50 rounded-xl p-4 relative group-hover:bg-gray-100/80 transition-colors">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className="font-semibold text-gray-900">{c.author}</span>
                                    {isCurrentUserComment && (
                                      <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">
                                        You
                                      </span>
                                    )}
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">•</span>
                                    <span className="text-sm text-gray-500">{c.timestamp}</span>
                                    
                                    {/* Edit/Delete buttons - only show for current user's comments */}
                                    {isCurrentUserComment && (
                                      <div className="ml-auto flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => startEditing(task.id, c.id, c.text)}
                                          className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteComment(task.id, c.id)}
                                          className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {isEditing ? (
                                    <div className="space-y-3">
                                      <textarea
                                        value={editingComment.text}
                                        onChange={(e) => setEditingComment({
                                          ...editingComment,
                                          text: e.target.value
                                        })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                        rows="3"
                                        autoFocus
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleEditComment(task.id, c.id, editingComment.text)}
                                          className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={cancelEditing}
                                          className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-gray-700">{c.text}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Add Comment Form */}
                    <div className="border-t border-gray-100 pt-6">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {currentUserName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1">
                          <textarea
                            data-task-id={task.id}
                            placeholder="Type your comment here..."
                            value={newComment[task.id] || ''}
                            onChange={(e) => setNewComment(prev => ({ ...prev, [task.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment(task.id);
                              }
                            }}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                            rows="3"
                          />
                          <div className="mt-3 flex justify-between items-center">
                            <p className="text-sm text-gray-500">
                              Press <span className="font-medium">Enter</span> to send, <span className="font-medium">Shift+Enter</span> for new line
                            </p>
                            <button
                              onClick={() => handleAddComment(task.id)}
                              disabled={!newComment[task.id]?.trim()}
                              className={`px-5 py-2 font-medium rounded-lg transition-all ${newComment[task.id]?.trim() 
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow' 
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                            >
                              Post Comment
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
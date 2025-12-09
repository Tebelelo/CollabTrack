// comments.js
import express from 'express';
const router = express.Router();
import { supabase } from '../config/database.js';
import auth from '../auth/authmiddleware.js';
import { v4 as uuidv4 } from 'uuid';

// Helper function to fetch usernames for multiple comments
async function fetchUsernamesForComments(comments) {
  if (!comments || comments.length === 0) return {};
  
  const userIds = [...new Set(comments.map(comment => comment.user_id).filter(Boolean))];
  
  if (userIds.length === 0) return {};
  
  const { data: users, error } = await supabase
    .from('users')  // Adjust table name if different
    .select('id, username')
    .in('id', userIds);
  
  if (error) {
    console.error('Error fetching users:', error);
    return {};
  }
  
  // Create a map of user_id -> username
  return users.reduce((acc, user) => {
    acc[user.id] = user.username;
    return acc;
  }, {});
}

// Get comments for a task
router.get('/task/:taskId', auth, async (req, res) => {
  try {
    const { taskId } = req.params;

    // 1. Fetch comments without join
    const { data: comments, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // 2. Fetch usernames separately
    const usernameMap = await fetchUsernamesForComments(comments);

    // 3. Combine data
    const commentsWithUsernames = comments.map(comment => ({
      ...comment,
      username: usernameMap[comment.user_id] || 'Unknown User'
    }));

    res.json(commentsWithUsernames);
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new comment
router.post('/', auth, async (req, res) => {
  const { content, task_id } = req.body;

  if (!content || !task_id) {
    return res.status(400).json({ error: 'Content and task ID are required' });
  }

  try {
    const id = uuidv4();

    // Insert comment
    const { error: insertError } = await supabase
      .from('task_comments')
      .insert([{
        id,
        content,
        task_id,
        user_id: req.user.id
      }]);

    if (insertError) throw insertError;

    // Fetch the newly created comment
    const { data: newComment, error: selectError } = await supabase
      .from('task_comments')
      .select('*')
      .eq('id', id)
      .single();

    if (selectError) throw selectError;

    // Fetch username separately
    const { data: userData } = await supabase
      .from('users')
      .select('username')
      .eq('id', req.user.id)
      .single();

    res.status(201).json({ 
      message: 'Comment created successfully',
      comment: {
        ...newComment,
        username: userData?.username || 'Unknown User'
      }
    });
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a comment (unchanged)
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: comment, error: checkError } = await supabase
      .from('task_comments')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError || !comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
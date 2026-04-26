const { supabase } = require('../supabaseClient');

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) throw error;
    res.json({ ok: true, notifications: data || [] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId);
      
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
      
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};

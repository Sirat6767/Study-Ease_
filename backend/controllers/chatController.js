const { supabase } = require('../supabaseClient');

// Get the chat thread between the current user and the CR (or, if CR, between CR and a specific student)
const getMessages = async (req, res) => {
  try {
    const userId   = req.user.id;
    let { batchId, otherId } = req.params; // otherId = the other person in the chat

    if (otherId === 'CR') {
      const { data: batchRow } = await supabase.from('batches').select('cr_user_id').eq('batch_id', batchId).single();
      if (!batchRow || !batchRow.cr_user_id) return res.status(404).json({ ok: false, error: 'No CR assigned to this batch' });
      otherId = batchRow.cr_user_id;
    }

    // Verify both users belong to this batch
    const { data: myAca } = await supabase
      .from('academic_info')
      .select('batch_id')
      .eq('user_id', userId)
      .single();

    if (!myAca || String(myAca.batch_id) !== String(batchId)) {
      return res.status(403).json({ ok: false, error: 'Not a member of this batch' });
    }

    // Get messages between the two users in this batch
    const { data, error } = await supabase
      .from('batch_messages')
      .select('id, sender_id, recipient_id, message, is_read, created_at')
      .eq('batch_id', batchId)
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`
      )
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Mark unread messages sent to the current user as read
    await supabase
      .from('batch_messages')
      .update({ is_read: true })
      .eq('batch_id', batchId)
      .eq('sender_id', otherId)
      .eq('recipient_id', userId)
      .eq('is_read', false);

    res.json({ ok: true, messages: data || [] });
  } catch (err) {
    console.error('getMessages error:', err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};

// Send a message
const sendMessage = async (req, res) => {
  try {
    const userId          = req.user.id;
    const { batchId }     = req.params;
    let { recipientId, message } = req.body;

    if (!recipientId || !message?.trim()) {
      return res.status(400).json({ ok: false, error: 'recipientId and message are required' });
    }

    if (recipientId === 'CR') {
      const { data: batchRow } = await supabase.from('batches').select('cr_user_id').eq('batch_id', batchId).single();
      if (!batchRow || !batchRow.cr_user_id) return res.status(404).json({ ok: false, error: 'No CR assigned to this batch' });
      recipientId = batchRow.cr_user_id;
    }

    // Verify sender belongs to this batch
    const { data: myAca } = await supabase
      .from('academic_info')
      .select('batch_id')
      .eq('user_id', userId)
      .single();

    if (!myAca || String(myAca.batch_id) !== String(batchId)) {
      return res.status(403).json({ ok: false, error: 'Not a member of this batch' });
    }

    // Verify recipient also belongs to this batch
    const { data: theirAca } = await supabase
      .from('academic_info')
      .select('batch_id')
      .eq('user_id', recipientId)
      .single();

    if (!theirAca || String(theirAca.batch_id) !== String(batchId)) {
      return res.status(403).json({ ok: false, error: 'Recipient is not in this batch' });
    }

    // Enforce CR-only rule: one side must be the CR
    const { data: batchRow } = await supabase
      .from('batches')
      .select('cr_user_id')
      .eq('batch_id', batchId)
      .single();

    const crId = batchRow?.cr_user_id;
    if (userId !== crId && recipientId !== crId) {
      return res.status(403).json({ ok: false, error: 'Chat is only allowed between a student and the CR' });
    }

    const { data, error } = await supabase
      .from('batch_messages')
      .insert({
        batch_id:     parseInt(batchId),
        sender_id:    userId,
        recipient_id: recipientId,
        message:      message.trim()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ ok: true, message: data });
  } catch (err) {
    console.error('sendMessage error:', err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};

// Get all students who have messaged (or been messaged by) the CR in a batch — for the CR's inbox
const getCRInbox = async (req, res) => {
  try {
    const userId     = req.user.id;
    const { batchId } = req.params;

    // Verify this user is the CR
    const { data: batchRow } = await supabase
      .from('batches')
      .select('cr_user_id')
      .eq('batch_id', batchId)
      .single();

    if (batchRow?.cr_user_id !== userId) {
      return res.status(403).json({ ok: false, error: 'Not the CR of this batch' });
    }

    // Get all unique students who have a conversation with the CR
    const { data: sent, error: e1 } = await supabase
      .from('batch_messages')
      .select('recipient_id')
      .eq('batch_id', batchId)
      .eq('sender_id', userId);

    const { data: received, error: e2 } = await supabase
      .from('batch_messages')
      .select('sender_id')
      .eq('batch_id', batchId)
      .eq('recipient_id', userId);

    if (e1 || e2) throw e1 || e2;

    const studentIds = new Set([
      ...(sent     || []).map(r => r.recipient_id),
      ...(received || []).map(r => r.sender_id)
    ]);

    // Also include all batch members (so CR can start a chat with any student)
    const { data: members } = await supabase
      .from('academic_info')
      .select('user_id, reg_no, users!academic_info_user_id_fkey(personal_info(name, avatar_url))')
      .eq('batch_id', batchId)
      .neq('user_id', userId);

    const formattedMembers = (members || []).map(m => {
      const pi = Array.isArray(m.users?.personal_info) ? m.users.personal_info[0] : m.users?.personal_info;
      return {
        userId:    m.user_id,
        name:      pi?.name || 'Unknown',
        avatarUrl: pi?.avatar_url || null,
        regNo:     m.reg_no,
        hasChat:   studentIds.has(m.user_id)
      };
    });

    // Get unread count per student
    const { data: unread } = await supabase
      .from('batch_messages')
      .select('sender_id')
      .eq('batch_id', batchId)
      .eq('recipient_id', userId)
      .eq('is_read', false);

    const unreadMap = {};
    (unread || []).forEach(r => {
      unreadMap[r.sender_id] = (unreadMap[r.sender_id] || 0) + 1;
    });

    const result = formattedMembers.map(m => ({
      ...m,
      unreadCount: unreadMap[m.userId] || 0
    }));

    result.sort((a, b) => (b.hasChat ? 1 : 0) - (a.hasChat ? 1 : 0) || (b.unreadCount - a.unreadCount));

    res.json({ ok: true, students: result });
  } catch (err) {
    console.error('getCRInbox error:', err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};

const getCRInfo = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { data: batchRow } = await supabase.from('batches').select('cr_user_id').eq('batch_id', batchId).single();
    if (!batchRow || !batchRow.cr_user_id) return res.status(404).json({ ok: false, error: 'No CR assigned' });

    const { data: pi } = await supabase.from('personal_info').select('name, avatar_url').eq('user_id', batchRow.cr_user_id).single();
    res.json({ ok: true, crUserId: batchRow.cr_user_id, crName: pi?.name || 'Class Representative', crAvatar: pi?.avatar_url || null });
  } catch (err) {
    console.error('getCRInfo error:', err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
};

module.exports = { getMessages, sendMessage, getCRInbox, getCRInfo };

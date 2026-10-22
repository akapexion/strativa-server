import ChatConversation from "../models/ChatConversation.js";
import ChatMessage from "../models/ChatMessage.js";
import Users from "../models/users.js";

// 1. Get eligible colleagues in the same firm (Strictly excludes Admins)
export const getEligibleParticipants = async (req, res) => {
  try {
    const currentUserId = req.user?.user_id;
    const firmId = req.user?.firm_id;

    if (!firmId) {
      return res.status(400).json({ success: false, message: "Firm association required" });
    }

    // Role check: Admin cannot chat with anyone
    if (req.user?.user_role === "admin" || req.user?.user_role === 0) {
      return res.status(403).json({
        success: false,
        message: "Admins cannot participate in employee chat.",
      });
    }

    // Eligible chat participants: same firm, excluding admins and current user
    const eligibleUsers = await Users.find({
      firm_id: firmId,
      _id: { $ne: currentUserId },
      user_role: { $nin: ["admin", 0] },
    }).select("user_fullname user_email user_code user_designation user_image user_role is_manager");

    res.status(200).json({
      success: true,
      participants: eligibleUsers,
    });
  } catch (err) {
    console.error("Get Eligible Participants Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Get user's active conversations
export const getConversations = async (req, res) => {
  try {
    const currentUserId = req.user?.user_id;
    const firmId = req.user?.firm_id;

    if (req.user?.user_role === "admin" || req.user?.user_role === 0) {
      return res.status(403).json({ success: false, message: "Admins cannot participate in chat." });
    }

    const conversations = await ChatConversation.find({
      firm_id: firmId,
      participants: currentUserId,
    })
      .populate("participants", "user_fullname user_code user_designation user_image user_role")
      .sort({ updatedAt: -1 });

    // Calculate unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (c) => {
        const unreadCount = await ChatMessage.countDocuments({
          conversation_id: c._id,
          recipient_id: currentUserId,
          is_read: false,
        });

        const otherParticipant = c.participants.find(
          (p) => String(p._id) !== String(currentUserId)
        );

        const convObj = c.toObject();
        convObj.unread_count = unreadCount;
        convObj.other_participant = otherParticipant;
        return convObj;
      })
    );

    res.status(200).json({
      success: true,
      conversations: conversationsWithUnread,
    });
  } catch (err) {
    console.error("Get Conversations Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Get messages for a specific conversation
export const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user?.user_id;

    const conversation = await ChatConversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    // Verify user is a participant and firm matches
    const isParticipant = conversation.participants.some(
      (p) => String(p) === String(currentUserId)
    );

    if (!isParticipant || String(conversation.firm_id) !== String(req.user?.firm_id)) {
      return res.status(403).json({ success: false, message: "Unauthorized access to conversation." });
    }

    const messages = await ChatMessage.find({ conversation_id: conversationId })
      .sort({ createdAt: 1 })
      .populate("sender_id", "user_fullname user_code user_image");

    // Automatically mark unread messages sent to me as read
    await ChatMessage.updateMany(
      {
        conversation_id: conversationId,
        recipient_id: currentUserId,
        is_read: false,
      },
      { $set: { is_read: true } }
    );

    res.status(200).json({
      success: true,
      messages,
    });
  } catch (err) {
    console.error("Get Messages Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Send message to another employee
export const sendMessage = async (req, res) => {
  try {
    const { recipient_id, message_text } = req.body;
    const currentUserId = req.user?.user_id;
    const firmId = req.user?.firm_id;

    if (!recipient_id || !message_text || !message_text.trim()) {
      return res.status(400).json({ success: false, message: "Recipient and message text are required" });
    }

    // Role check: Neither sender nor recipient can be an Admin!
    if (req.user?.user_role === "admin" || req.user?.user_role === 0) {
      return res.status(403).json({
        success: false,
        message: "Admins cannot participate in chats or send messages.",
      });
    }

    const recipient = await Users.findById(recipient_id);
    if (!recipient) {
      return res.status(404).json({ success: false, message: "Recipient not found" });
    }

    if (recipient.user_role === "admin" || recipient.user_role === 0) {
      return res.status(403).json({
        success: false,
        message: "Admins cannot participate in chat, and nobody can chat with an Admin.",
      });
    }

    // Firm isolation check: Must belong to same firm
    if (String(recipient.firm_id) !== String(firmId)) {
      return res.status(403).json({
        success: false,
        message: "Cross-firm messaging is prohibited.",
      });
    }

    // Find or create conversation between these two users
    let conversation = await ChatConversation.findOne({
      firm_id: firmId,
      participants: { $all: [currentUserId, recipient_id], $size: 2 },
    });

    if (!conversation) {
      conversation = new ChatConversation({
        firm_id: firmId,
        participants: [currentUserId, recipient_id],
      });
    }

    const text = message_text.trim();

    conversation.last_message = {
      text,
      sender_id: currentUserId,
      sender_name: req.user?.user_fullname || "User",
      timestamp: new Date(),
    };
    await conversation.save();

    const message = new ChatMessage({
      firm_id: firmId,
      conversation_id: conversation._id,
      sender_id: currentUserId,
      recipient_id: recipient._id,
      message_text: text,
      is_read: false,
    });
    await message.save();

    await message.populate("sender_id", "user_fullname user_code user_image");

    res.status(201).json({
      success: true,
      message,
      conversation_id: conversation._id,
    });
  } catch (err) {
    console.error("Send Message Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

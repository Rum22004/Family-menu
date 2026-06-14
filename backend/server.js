import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// ===============================
// REAL ORDER TIME RULE
// ===============================
// 3:00 PM - 3:59 PM = OPEN
// 4:00 PM - 6:59 PM = CLOSED
// 7:00 PM and after = OPEN AGAIN FOR TOMORROW
// Timezone: Asia/Phnom_Penh

function getPhnomPenhTimeParts() {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Phnom_Penh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);

  let hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  if (hour === 24) {
    hour = 0;
  }

  return { hour, minute };
}

function isOrderingOpen() {
  const { hour, minute } = getPhnomPenhTimeParts();
  const totalMinutes = hour * 60 + minute;

  const openStart = 15 * 60 + 0; // 3:00 PM
  const closeStart = 16 * 60 + 0; // 4:00 PM
  const reopenStart = 19 * 60 + 0; // 7:00 PM

  // Open from 3:00 PM until before 4:00 PM
  if (totalMinutes >= openStart && totalMinutes < closeStart) {
    return true;
  }

  // Closed from 4:00 PM until before 7:00 PM
  if (totalMinutes >= closeStart && totalMinutes < reopenStart) {
    return false;
  }

  // Open again after 7:00 PM
  if (totalMinutes >= reopenStart) {
    return true;
  }

  // Before 3:00 PM, still allow ordering.
  // If you want to block before 3 PM, change this to false.
  return true;
}

function getSessionMessage() {
  const { hour, minute } = getPhnomPenhTimeParts();
  const totalMinutes = hour * 60 + minute;

  const openStart = 15 * 60 + 0; // 3:00 PM
  const closeStart = 16 * 60 + 0; // 4:00 PM
  const reopenStart = 19 * 60 + 0; // 7:00 PM

  if (totalMinutes < openStart) {
    return "ការកម្មង់កំពុងបើក។ អ្នកអាចជ្រើសរើសមុខម្ហូបបាន។";
  }

  if (totalMinutes >= openStart && totalMinutes < closeStart) {
    return "ការកម្មង់កំពុងបើក។ សូមកម្មង់មុនម៉ោង 4:00 ល្ងាច។";
  }

  if (totalMinutes >= closeStart && totalMinutes < reopenStart) {
    return "ការកម្មង់បានបិទហើយ។ អ្នកមិនអាចកម្មង់ ផ្លាស់ប្តូរ ឬលុបការកម្មង់បានទេ។ នឹងបើកវិញក្រោយម៉ោង 7:00 យប់ សម្រាប់ថ្ងៃស្អែក។";
  }

  return "ការកម្មង់បានបើកវិញហើយ។ អ្នកអាចកម្មង់មុខម្ហូបសម្រាប់ថ្ងៃស្អែកបាន។";
}

function getOrderTargetText() {
  const { hour, minute } = getPhnomPenhTimeParts();
  const totalMinutes = hour * 60 + minute;

  const reopenStart = 19 * 60 + 0; // 7:00 PM

  if (totalMinutes >= reopenStart) {
    return "សម្រាប់ថ្ងៃស្អែក";
  }

  return "សម្រាប់ថ្ងៃនេះ";
}

// ===============================
// TELEGRAM HELPER
// ===============================

async function sendTelegramMessage(text, chatId) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing");
  }

  if (!chatId) {
    throw new Error("Telegram chat ID is missing");
  }

  const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

  await axios.post(telegramUrl, {
    chat_id: chatId,
    text,
  });
}

// ===============================
// ROUTES
// ===============================

// Small response for Render wake-up cron
app.get("/", (req, res) => {
  res.status(200).type("text/plain").send("OK");
});

// Session status for frontend
app.get("/api/session", (req, res) => {
  res.json({
    success: true,
    isOpen: isOrderingOpen(),
    message: getSessionMessage(),
    orderTarget: getOrderTargetText(),
  });
});

// ALERT ONLY TO FAMILY GROUP
// cron-job.org should call this at 3:00 PM
app.get("/api/alert", async (req, res) => {
  try {
    const alertChatId = process.env.TELEGRAM_ALERT_CHAT_ID;

    const message = `
🔔 Family Menu Alert

ម៉ោង 3:00 ល្ងាចហើយ!

សូមចូលជ្រើសរើសមុខម្ហូបមុនម៉ោង 4:00 ល្ងាច។
ក្រោយម៉ោង 4:00 ល្ងាច អ្នកមិនអាចកម្មង់ ផ្លាស់ប្តូរ ឬលុបការកម្មង់បានទេ។

👉 បើក Menu:
https://family-menu-m73p.onrender.com
`;

    await sendTelegramMessage(message, alertChatId);

    // Small response so cron-job.org will not fail with "output too large"
    res.status(200).type("text/plain").send("OK");
  } catch (error) {
    console.error("Alert error:", error.response?.data || error.message);

    // Small error response for cron-job.org
    res.status(500).type("text/plain").send("ALERT_FAILED");
  }
});

// NEW ORDER / CHANGE ORDER ONLY TO YOUR PRIVATE CHAT
app.post("/api/send-menu", async (req, res) => {
  try {
    const { selectedItems, note, action } = req.body;

    if (!isOrderingOpen()) {
      return res.status(403).json({
        success: false,
        message: getSessionMessage(),
      });
    }

    if (
      !selectedItems ||
      !Array.isArray(selectedItems) ||
      selectedItems.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "No menu selected",
      });
    }

    const orderChatId = process.env.TELEGRAM_ORDER_CHAT_ID;

    const menuList = selectedItems
      .map((item, index) => `${index + 1}. ${item.name}`)
      .join("\n");

    const finalNote = note && note.trim() !== "" ? note.trim() : "មិនមាន";

    const now = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Phnom_Penh",
    });

    const orderTarget = getOrderTargetText();

    const title =
      action === "change"
        ? "♻️ ការកម្មង់ត្រូវបានផ្លាស់ប្តូរ"
        : "🍽️ ការកម្មង់ថ្មី";

    const telegramMessage = `
${title}

📅 កម្មង់: ${orderTarget}

📋 បញ្ជីមុខម្ហូប:
${menuList}

📝 កំណត់ចំណាំ:
${finalNote}

⏰ Time: ${now}
`;

    await sendTelegramMessage(telegramMessage, orderChatId);

    res.status(200).json({
      success: true,
      message:
        action === "change"
          ? "Changed order sent to Telegram"
          : "New order sent to Telegram",
    });
  } catch (error) {
    console.error("Order error:", error.response?.data || error.message);

    res.status(500).json({
      success: false,
      message: "Failed to send Telegram message",
      error: error.response?.data || error.message,
    });
  }
});

// CANCEL ORDER ONLY TO YOUR PRIVATE CHAT
app.post("/api/cancel-order", async (req, res) => {
  try {
    if (!isOrderingOpen()) {
      return res.status(403).json({
        success: false,
        message: getSessionMessage(),
      });
    }

    const orderChatId = process.env.TELEGRAM_ORDER_CHAT_ID;
    const { selectedItems, note } = req.body;

    const menuList =
      selectedItems && selectedItems.length > 0
        ? selectedItems
            .map((item, index) => `${index + 1}. ${item.name}`)
            .join("\n")
        : "មិនមាន";

    const finalNote = note && note.trim() !== "" ? note.trim() : "មិនមាន";

    const now = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Phnom_Penh",
    });

    const telegramMessage = `
❌ ការកម្មង់ត្រូវបានលុប

📋 មុខម្ហូបដែលបានលុប:
${menuList}

📝 កំណត់ចំណាំ:
${finalNote}

⏰ Time: ${now}
`;

    await sendTelegramMessage(telegramMessage, orderChatId);

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel error:", error.response?.data || error.message);

    res.status(500).json({
      success: false,
      message: "Failed to cancel order",
      error: error.response?.data || error.message,
    });
  }
});

// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
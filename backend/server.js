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

  const openStart = 1 * 60 + 50; // 1:50 AM
  const closeStart = 2 * 60 + 0; // 2:00 AM
  const reopenStart = 2 * 60 + 5; // 2:05 AM

  // Open from 1:50 AM until before 2:00 AM
  if (totalMinutes >= openStart && totalMinutes < closeStart) {
    return true;
  }

  // Closed from 2:00 AM until before 2:05 AM
  if (totalMinutes >= closeStart && totalMinutes < reopenStart) {
    return false;
  }

  // Open again after 2:05 AM
  if (totalMinutes >= reopenStart) {
    return true;
  }

  // Before 1:50 AM
  return false;
}

function getSessionMessage() {
  const { hour, minute } = getPhnomPenhTimeParts();
  const totalMinutes = hour * 60 + minute;

  const openStart = 1 * 60 + 50; // 1:50 AM
  const closeStart = 2 * 60 + 0; // 2:00 AM
  const reopenStart = 2 * 60 + 5; // 2:05 AM

  if (totalMinutes < openStart) {
    return "ការកម្មង់មិនទាន់បើកទេ។ នឹងបើកនៅម៉ោង 1:50 AM។";
  }

  if (totalMinutes >= openStart && totalMinutes < closeStart) {
    return "ការកម្មង់កំពុងបើក។ សូមកម្មង់មុនម៉ោង 2:00 AM។";
  }

  if (totalMinutes >= closeStart && totalMinutes < reopenStart) {
    return "ការកម្មង់បានបិទហើយ។ អ្នកមិនអាចកម្មង់ ផ្លាស់ប្តូរ ឬលុបការកម្មង់បានទេ។ នឹងបើកវិញនៅម៉ោង 2:05 AM។";
  }

  return "ការកម្មង់បានបើកវិញហើយ។ អ្នកអាចកម្មង់មុខម្ហូបបាន។";
}

function getOrderTargetText() {
  const { hour, minute } = getPhnomPenhTimeParts();
  const totalMinutes = hour * 60 + minute;

  const reopenStart = 2 * 60 + 5; // 2:05 AM

  if (totalMinutes >= reopenStart) {
    return "សម្រាប់ថ្ងៃស្អែក";
  }

  return "សម្រាប់ថ្ងៃនេះ";
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Family menu backend is running",
  });
});

app.get("/api/session", (req, res) => {
  res.json({
    success: true,
    isOpen: isOrderingOpen(),
    message: getSessionMessage(),
    orderTarget: getOrderTargetText(),
  });
});

// ALERT ONLY TO FAMILY GROUP
app.get("/api/alert", async (req, res) => {
  try {
    const alertChatId = process.env.TELEGRAM_ALERT_CHAT_ID;

    const message = `
🔔 Family Menu Alert

ម៉ោង 3:00 ល្ងាចហើយ!

សូមចូលជ្រើសរើសមុខម្ហូបមុនម៉ោង 4:00 ល្ងាច។
ក្រោយម៉ោង 4:00 ល្ងាច អ្នកមិនអាចកម្មង់ ផ្លាស់ប្តូរ ឬលុបការកម្មង់បានទេ។

👉 បើក Menu:
https://family-menu-mu.vercel.app
`;

    await sendTelegramMessage(message, alertChatId);

    res.json({
      success: true,
      message: "Alert sent to family group",
    });
  } catch (error) {
    console.error("Alert error:", error.response?.data || error.message);

    res.status(500).json({
      success: false,
      message: "Failed to send alert",
      error: error.response?.data || error.message,
    });
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
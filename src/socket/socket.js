export const SOCKET_EVENTS = {
  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_UPDATED: "notification:updated",
  LEDGER_UPDATED: "ledger:updated",
  REQUEST_APPROVED: "request_approved",
};

export const buildNotificationPayload = ({ id, title, message, status, createdAt }) => ({
  id,
  title,
  message,
  status,
  createdAt,
});
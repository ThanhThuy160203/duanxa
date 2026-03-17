export type ZaloNotificationPayload = {
  userId: string;
  userName: string;
  message: string;
  tasks: Array<{ id: string; title: string; dueDate: string }>;
};

export type ZaloNotificationResult = {
  delivered: boolean;
};

const ENDPOINT = import.meta.env.VITE_ZALO_NOTIFY_ENDPOINT;

export const sendZaloNotification = async (
  payload: ZaloNotificationPayload
): Promise<ZaloNotificationResult> => {
  if (!ENDPOINT) {
    console.warn("Missing VITE_ZALO_NOTIFY_ENDPOINT; skipping Zalo notification", payload);
    return { delivered: false };
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || "Failed to send Zalo notification");
  }

  return { delivered: true };
};

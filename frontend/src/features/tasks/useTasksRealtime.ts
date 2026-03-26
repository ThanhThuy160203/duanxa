import { useCallback, useEffect, useState } from "react";
import type { TaskRecord } from "./taskData";
import { subscribeTasks } from "./taskService";

type UseTasksRealtimeResult = {
  tasks: TaskRecord[];
  loading: boolean;
  error: string | null;
};

type UseTasksRealtimeOptions = {
  enabled?: boolean;
  refreshToken?: number;
};

export const useTasksRealtime = (options: UseTasksRealtimeOptions = {}): UseTasksRealtimeResult => {
  const { enabled = true, refreshToken = 0 } = options;
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const markLoading = useCallback(() => setLoading(true), []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setError(null);
    markLoading();
    const unsubscribe = subscribeTasks(
      (records) => {
        setTasks(records);
        setLoading(false);
      },
      (message) => {
        setError(message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [enabled, markLoading, refreshToken]);

  return {
    tasks: enabled ? tasks : [],
    loading: enabled ? loading : false,
    error: enabled ? error : null,
  };
};

import { useEffect, useState } from "react";
import type { TaskRecord } from "./taskData";
import { subscribeTasks } from "./taskService";

type UseTasksRealtimeResult = {
  tasks: TaskRecord[];
  loading: boolean;
  error: string | null;
};

type UseTasksRealtimeOptions = {
  enabled?: boolean;
};

export const useTasksRealtime = (options: UseTasksRealtimeOptions = {}): UseTasksRealtimeResult => {
  const { enabled = true } = options;
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const loadingTimer = setTimeout(() => setLoading(true), 0);
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
    return () => {
      clearTimeout(loadingTimer);
      unsubscribe();
    };
  }, [enabled]);

  return {
    tasks: enabled ? tasks : [],
    loading: enabled ? loading : false,
    error: enabled ? error : null,
  };
};

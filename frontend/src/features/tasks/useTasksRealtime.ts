import { useEffect, useState } from "react";
import type { TaskRecord } from "./taskData";
import { subscribeTasks } from "./taskService";

type UseTasksRealtimeResult = {
  tasks: TaskRecord[];
  loading: boolean;
  error: string | null;
};

export const useTasksRealtime = (): UseTasksRealtimeResult => {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  return { tasks, loading, error };
};

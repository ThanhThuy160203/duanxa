import { useEffect, useState } from "react";
import type { UserProfile } from "../../types/user";
import { subscribeUsers } from "./userService";

export const useUsersRealtime = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeUsers(
      (records) => {
        setUsers(records);
        setLoading(false);
      },
      (message) => {
        setError(message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { users, loading, error } as const;
};

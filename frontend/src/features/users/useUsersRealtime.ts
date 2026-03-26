import { useEffect, useState } from "react";
import type { UserProfile } from "../../types/user";
import { subscribeUsers } from "./userService";

export const useUsersRealtime = (refreshToken = 0) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setLoading(true);
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
  }, [refreshToken]);

  return { users, loading, error } as const;
};

import { useEffect } from "react";
import { useAppDispatch } from "../store/store";
import { fetchMe } from "../features/auth/authSlice";
/**
 * Runs once when the app loads to check if the user
 * is already logged in via HTTP-only cookie session.
 */
export const useAuthInitializer = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);
};

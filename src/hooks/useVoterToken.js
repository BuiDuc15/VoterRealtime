import { useMemo } from "react";
import { v4 as uuidv4 } from "uuid";

export function useVoterToken() {
  return useMemo(() => {
    let token = localStorage.getItem("voter_token");
    if (!token) {
      token = uuidv4();
      localStorage.setItem("voter_token", token);
    }
    return token;
  }, []);
}


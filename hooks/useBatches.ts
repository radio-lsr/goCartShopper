import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { database } from "../constants/firebase";

export function useBatches() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const batchesRef = ref(database, "batches");
    const unsubscribe = onValue(batchesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setBatches(list.filter((b) => b.status === "available"));
      } else {
        setBatches([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { batches, loading };
}

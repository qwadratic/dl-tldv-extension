/**
 * Extract Firebase auth token from the browser's IndexedDB.
 * tldv stores the Firebase session in:
 *   Database: firebaseLocalStorageDb
 *   Store: firebaseLocalStorage
 *   First entry -> value.stsTokenManager.accessToken
 *
 * Returns null if no token found (user not logged in or public meeting).
 */
export async function getFirebaseToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open("firebaseLocalStorageDb");

    request.onerror = () => {
      console.warn("[dl-tldv] Could not open firebaseLocalStorageDb");
      resolve(null);
    };

    request.onsuccess = () => {
      try {
        const db = request.result;
        const tx = db.transaction("firebaseLocalStorage", "readonly");
        const store = tx.objectStore("firebaseLocalStorage");
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const entries = getAllRequest.result;
          if (entries && entries.length > 0) {
            const token =
              entries[0]?.value?.stsTokenManager?.accessToken;
            if (token && typeof token === "string") {
              console.log("[dl-tldv] Firebase token found");
              resolve(token);
            } else {
              console.warn(
                "[dl-tldv] Firebase entry found but no accessToken"
              );
              resolve(null);
            }
          } else {
            console.warn("[dl-tldv] No entries in firebaseLocalStorage");
            resolve(null);
          }
        };

        getAllRequest.onerror = () => {
          console.warn("[dl-tldv] Failed to read firebaseLocalStorage");
          resolve(null);
        };
      } catch (err) {
        console.warn("[dl-tldv] Error reading IndexedDB:", err);
        resolve(null);
      }
    };
  });
}

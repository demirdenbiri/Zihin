import React, { createContext, useContext, useEffect, useState } from "react";
import { db, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, OperationType, handleFirestoreError } from "../firebase";
import { Note } from "../types";
import { useAuth } from "./AuthContext";

interface NoteContextType {
  notes: Note[];
  loading: boolean;
  addNote: (note: Omit<Note, "id" | "userId" | "createdAt" | "updatedAt">) => Promise<void>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

const NoteContext = createContext<NoteContextType | undefined>(undefined);

export function NoteProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "notes"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Note[];
      setNotes(notesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "notes");
    });

    return () => unsubscribe();
  }, [user]);

  const addNote = async (noteData: Omit<Note, "id" | "userId" | "createdAt" | "updatedAt">) => {
    if (!user) return;
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, "notes"), {
        ...noteData,
        userId: user.uid,
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "notes");
    }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    try {
      const noteRef = doc(db, "notes", id);
      await updateDoc(noteRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notes/${id}`);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notes", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notes/${id}`);
    }
  };

  return (
    <NoteContext.Provider value={{ notes, loading, addNote, updateNote, deleteNote }}>
      {children}
    </NoteContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NoteContext);
  if (context === undefined) {
    throw new Error("useNotes must be used within a NoteProvider");
  }
  return context;
}

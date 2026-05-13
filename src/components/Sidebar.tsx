"use client";

import { useState, useEffect } from "react";
import { useAcademic } from "@/lib/context";
import Modal from "./Modal";
import styles from "./Sidebar.module.css";
import { syncToGoogle, initGoogleApi } from "@/lib/googleApi";

export default function Sidebar() {
  const { classes, addClass, events } = useAcademic();
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassColor, setNewClassColor] = useState("#8b5cf6");

  useEffect(() => {
    initGoogleApi();
  }, []);

  const handleSync = async () => {
    await syncToGoogle(events);
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName.trim()) {
      addClass({ name: newClassName, color: newClassColor });
      setNewClassName("");
      setIsClassModalOpen(false);
    }
  };

  return (
    <>
      <aside className={`${styles.sidebar} glass`}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>A</span>
            <h1>AcaSync</h1>
          </div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Classes</h2>
            <div className={styles.classList}>
              {classes.map((cls) => (
                <button key={cls.id} className={`${styles.classItem} glass-interactive`}>
                  <span className={styles.classColor} style={{ backgroundColor: cls.color }}></span>
                  {cls.name}
                </button>
              ))}
              {classes.length === 0 && (
                <p className={styles.emptyMsg}>No classes added yet.</p>
              )}
            </div>
            <button className={styles.addBtn} onClick={() => setIsClassModalOpen(true)}>
              + Add Class
            </button>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Upcoming</h2>
            <div className={styles.eventList}>
              {events.slice(0, 5).map((event) => (
                <div key={event.id} className={styles.eventItem}>
                  <span className={styles.eventDate}>
                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                  </span>
                  <p className={styles.eventTitle}>{event.title}</p>
                </div>
              ))}
              {events.length === 0 && (
                <p className={styles.emptyMsg}>No upcoming events.</p>
              )}
            </div>
          </div>
        </nav>

        <div className={styles.footer}>
          <button className={`${styles.syncBtn} glass-interactive`} onClick={handleSync}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16" />
            </svg>
            Sync Google Cal
          </button>
        </div>
      </aside>

      <Modal 
        isOpen={isClassModalOpen} 
        onClose={() => setIsClassModalOpen(false)} 
        title="Add New Class"
      >
        <form onSubmit={handleAddClass} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Class Name</label>
            <input 
              type="text" 
              value={newClassName} 
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="e.g. Advanced Physics"
              className={styles.input}
              autoFocus
            />
          </div>
          <div className={styles.formGroup}>
            <label>Color</label>
            <input 
              type="color" 
              value={newClassColor} 
              onChange={(e) => setNewClassColor(e.target.value)}
              className={styles.colorInput}
            />
          </div>
          <button type="submit" className="btn-primary">Add Class</button>
        </form>
      </Modal>
    </>
  );
}

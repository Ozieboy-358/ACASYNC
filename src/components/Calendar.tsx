"use client";

import { useState } from "react";
import { useAcademic } from "@/lib/context";
import Modal from "./Modal";
import styles from "./Calendar.module.css";

export default function Calendar() {
  const { events, addEvent, classes } = useAcademic();
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>("");
  
  // Form state
  const [eventTitle, setEventTitle] = useState("");
  const [eventClassId, setEventClassId] = useState("");
  const [eventType, setEventType] = useState<'assignment' | 'exam' | 'quiz' | 'material'>('assignment');

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const currentMonth = viewDate.toLocaleString('default', { month: 'long' });
  const currentYear = viewDate.getFullYear();

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const numDays = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const firstDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
  
  const calendarDays = [];
  // Padding for first week
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= numDays; i++) {
    calendarDays.push(i);
  }

  const handleDayClick = (day: number | null) => {
    if (!day) return;
    const dateStr = `${viewDate.getFullYear()}-${(viewDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    setSelectedDateStr(dateStr);
    setIsEventModalOpen(true);
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (eventTitle.trim() && eventClassId) {
      addEvent({
        title: eventTitle,
        classId: eventClassId,
        date: selectedDateStr,
        type: eventType
      });
      setEventTitle("");
      setIsEventModalOpen(false);
    }
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${viewDate.getFullYear()}-${(viewDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(viewDate.getMonth() + offset);
    setViewDate(newDate);
  };

  return (
    <>
      <div className={`${styles.calendarContainer} glass`}>
        <header className={styles.header}>
          <div className={styles.monthInfo}>
            <h2>{currentMonth} <span>{currentYear}</span></h2>
          </div>
          <div className={styles.controls}>
            <button className={`${styles.controlBtn} glass-interactive`}>Month</button>
            <button className={`${styles.controlBtn} glass-interactive`}>Week</button>
            <div className={styles.navBtns}>
              <button className={`${styles.navBtn} glass-interactive`} onClick={() => changeMonth(-1)}>&lt;</button>
              <button className={`${styles.navBtn} glass-interactive`} onClick={() => changeMonth(1)}>&gt;</button>
            </div>
          </div>
        </header>

        <div className={styles.grid}>
          {daysOfWeek.map(day => (
            <div key={day} className={styles.dayHeader}>{day}</div>
          ))}
          {calendarDays.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className={styles.dayCellEmpty}></div>;
            
            const dayEvents = getEventsForDay(day);
            const today = new Date();
            const isToday = day === today.getDate() && 
                            viewDate.getMonth() === today.getMonth() && 
                            viewDate.getFullYear() === today.getFullYear();
            
            return (
              <div 
                key={day} 
                className={`${styles.dayCell} ${isToday ? styles.active : ""}`}
                onClick={() => handleDayClick(day)}
              >
                <span className={styles.dayNumber}>{day}</span>
                <div className={styles.eventContainer}>
                  {dayEvents.map(event => {
                    const cls = classes.find(c => c.id === event.classId);
                    return (
                      <div 
                        key={event.id} 
                        className={styles.eventPill} 
                        style={{ backgroundColor: cls?.color || "#8b5cf6" }}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal 
        isOpen={isEventModalOpen} 
        onClose={() => setIsEventModalOpen(false)} 
        title={`Add Event for ${selectedDateStr}`}
      >
        <form onSubmit={handleAddEvent} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Event Title</label>
            <input 
              type="text" 
              value={eventTitle} 
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="e.g. Midterm Exam"
              className={styles.input}
              autoFocus
            />
          </div>
          <div className={styles.formGroup}>
            <label>Class</label>
            <select 
              value={eventClassId} 
              onChange={(e) => setEventClassId(e.target.value)}
              className={styles.select}
            >
              <option value="">Select a class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Type</label>
            <select 
              value={eventType} 
              onChange={(e) => setEventType(e.target.value as any)}
              className={styles.select}
            >
              <option value="assignment">Assignment</option>
              <option value="exam">Exam</option>
              <option value="quiz">Quiz</option>
              <option value="material">Material</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={!eventClassId}>
            Add Event
          </button>
        </form>
      </Modal>
    </>
  );
}

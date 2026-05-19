"use client";

import { useState } from "react";
import { useAcademic } from "@/lib/context";
import { AcademicEvent } from "@/lib/types";
import Modal from "./Modal";
import styles from "./Calendar.module.css";

export default function Calendar() {
  const { events, addEvent, updateEvent, deleteEvent, classes } = useAcademic();
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');
  
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<AcademicEvent | null>(null);
  const [draggedOverDay, setDraggedOverDay] = useState<string | null>(null);

  // Add event form state
  const [eventTitle, setEventTitle] = useState("");
  const [eventClassId, setEventClassId] = useState("");
  const [eventType, setEventType] = useState<'assignment' | 'exam' | 'quiz' | 'material'>('assignment');
  const [materialUrl, setMaterialUrl] = useState("");
  const [score, setScore] = useState("");
  const [totalScore, setTotalScore] = useState("");
  const [weight, setWeight] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [autoStudyPlan, setAutoStudyPlan] = useState(false);

  // Edit event form state
  const [editTitle, setEditTitle] = useState("");
  const [editClassId, setEditClassId] = useState("");
  const [editType, setEditType] = useState<'assignment' | 'exam' | 'quiz' | 'material'>('assignment');
  const [editMaterialUrl, setEditMaterialUrl] = useState("");
  const [editScore, setEditScore] = useState("");
  const [editTotalScore, setEditTotalScore] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCompleted, setEditCompleted] = useState(false);

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
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= numDays; i++) calendarDays.push(i);

  const getWeekDays = (date: Date) => {
    const current = new Date(date);
    const day = current.getDay(); // 0 (Sun) to 6 (Sat)
    const sunday = new Date(current);
    sunday.setDate(current.getDate() - day);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      weekDays.push(d);
    }
    return weekDays;
  };

  const handleDayClick = (day: number | null) => {
    if (!day) return;
    const dateStr = `${viewDate.getFullYear()}-${(viewDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    setSelectedDateStr(dateStr);
    setIsEventModalOpen(true);
  };

  const handleWeekDayClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDateStr(dateStr);
    setIsEventModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, event: AcademicEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setEditTitle(event.title);
    setEditClassId(event.classId);
    setEditType(event.type);
    setEditMaterialUrl(event.materialUrl || "");
    setEditScore(event.score !== undefined ? event.score.toString() : "");
    setEditTotalScore(event.totalScore !== undefined ? event.totalScore.toString() : "");
    setEditWeight(event.weight !== undefined ? event.weight.toString() : "");
    setEditStartTime(event.startTime || "");
    setEditEndTime(event.endTime || "");
    setEditDescription(event.description || "");
    setEditCompleted(!!event.completed);
    setIsEditModalOpen(true);
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (eventTitle.trim() && eventClassId) {
      const baseEvent = {
        title: eventTitle,
        classId: eventClassId,
        type: eventType,
        materialUrl: eventType === 'material' ? materialUrl : undefined,
        score: score ? parseFloat(score) : undefined,
        totalScore: totalScore ? parseFloat(totalScore) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        description: eventDescription || undefined,
        completed: false
      };

      if (isRecurring) {
        for (let i = 0; i < 12; i++) {
          const d = new Date(selectedDateStr + "T12:00:00");
          d.setDate(d.getDate() + (i * 7));
          addEvent({
            ...baseEvent,
            date: d.toISOString().split('T')[0]
          });
        }
      } else {
        addEvent({
          ...baseEvent,
          date: selectedDateStr
        });

        // Auto study generator
        if (autoStudyPlan && (eventType === 'exam' || eventType === 'quiz')) {
          const daysToSchedule = [3, 2, 1];
          daysToSchedule.forEach(daysBefore => {
            const examDate = new Date(selectedDateStr + "T12:00:00");
            examDate.setDate(examDate.getDate() - daysBefore);
            const dateStr = examDate.toISOString().split('T')[0];

            addEvent({
              title: `Study Session: ${eventTitle}`,
              classId: eventClassId,
              type: 'material', // Create study material/block
              date: dateStr,
              startTime: "16:00", // Default study hours
              endTime: "17:00",
              description: `Prepare for upcoming ${eventType}: ${eventTitle}. Review syllabus and class notes.`,
              completed: false
            });
          });
        }
      }

      resetForm();
      setIsEventModalOpen(false);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEvent && editTitle.trim() && editClassId) {
      updateEvent({
        id: selectedEvent.id,
        date: selectedEvent.date,
        title: editTitle,
        classId: editClassId,
        type: editType,
        materialUrl: editType === 'material' ? editMaterialUrl : undefined,
        score: editScore ? parseFloat(editScore) : undefined,
        totalScore: editTotalScore ? parseFloat(editTotalScore) : undefined,
        weight: editWeight ? parseFloat(editWeight) : undefined,
        startTime: editStartTime || undefined,
        endTime: editEndTime || undefined,
        description: editDescription || undefined,
        completed: editCompleted
      });
      setIsEditModalOpen(false);
      setSelectedEvent(null);
    }
  };

  const handleDelete = () => {
    if (selectedEvent) {
      deleteEvent(selectedEvent.id);
      setIsEditModalOpen(false);
      setSelectedEvent(null);
    }
  };

  const resetForm = () => {
    setEventTitle("");
    setMaterialUrl("");
    setScore("");
    setTotalScore("");
    setWeight("");
    setStartTime("");
    setEndTime("");
    setEventDescription("");
    setIsRecurring(false);
    setAutoStudyPlan(false);
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${viewDate.getFullYear()}-${(viewDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  };

  const getEventsForDateStr = (dateStr: string) => {
    return events.filter(e => e.date === dateStr).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewDate);
    if (viewMode === 'week') {
      newDate.setDate(viewDate.getDate() + (offset * 7));
    } else {
      newDate.setMonth(viewDate.getMonth() + offset);
    }
    setViewDate(newDate);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData("text/plain", eventId);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDraggedOverDay(dateStr);
  };

  const handleDragLeave = () => {
    setDraggedOverDay(null);
  };

  const handleDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDraggedOverDay(null);
    const eventId = e.dataTransfer.getData("text/plain");
    const targetEvent = events.find(ev => ev.id === eventId);
    if (targetEvent) {
      updateEvent({
        ...targetEvent,
        date: dateStr
      });
    }
  };

  return (
    <>
      <div className={`${styles.calendarContainer} glass`}>
        <header className={styles.header}>
          <div className={styles.monthInfo}>
            <h2>
              {viewMode === 'week' ? "Week of " : ""}
              {currentMonth} <span>{currentYear}</span>
            </h2>
          </div>
          <div className={styles.controls}>
            {/* View Switcher */}
            <div className={styles.viewSwitcher}>
              <button 
                className={`${styles.viewTab} ${viewMode === 'month' ? styles.viewTabActive : ""}`}
                onClick={() => setViewMode('month')}
              >
                Month
              </button>
              <button 
                className={`${styles.viewTab} ${viewMode === 'week' ? styles.viewTabActive : ""}`}
                onClick={() => setViewMode('week')}
              >
                Week
              </button>
              <button 
                className={`${styles.viewTab} ${viewMode === 'agenda' ? styles.viewTabActive : ""}`}
                onClick={() => setViewMode('agenda')}
              >
                Agenda
              </button>
            </div>

            <div className={styles.navBtns}>
              <button className={`${styles.navBtn} glass-interactive`} onClick={() => changeMonth(-1)}>&lt;</button>
              <button className={`${styles.navBtn} glass-interactive`} onClick={() => changeMonth(1)}>&gt;</button>
            </div>
          </div>
        </header>

        {viewMode === 'month' && (
          <div className={styles.grid}>
            {daysOfWeek.map(day => (
              <div key={day} className={styles.dayHeader}>{day}</div>
            ))}
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className={styles.dayCellEmpty}></div>;
              
              const dateStr = `${viewDate.getFullYear()}-${(viewDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              const dayEvents = getEventsForDay(day);
              const today = new Date();
              const isToday = day === today.getDate() && 
                              viewDate.getMonth() === today.getMonth() && 
                              viewDate.getFullYear() === today.getFullYear();
              
              const isDragOver = draggedOverDay === dateStr;

              return (
                <div 
                  key={day} 
                  className={`${styles.dayCell} ${isToday ? styles.active : ""} ${isDragOver ? styles.dragOver : ""}`}
                  onClick={() => handleDayClick(day)}
                  onDragOver={(e) => handleDragOver(e, dateStr)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dateStr)}
                >
                  <span className={styles.dayNumber}>{day}</span>
                  <div className={styles.eventContainer}>
                    {dayEvents.map(event => {
                      const cls = classes.find(c => c.id === event.classId);
                      return (
                        <div 
                          key={event.id} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, event.id)}
                          onClick={(e) => handleEventClick(e, event)}
                          className={`${styles.eventPill} ${event.completed ? styles.eventPillCompleted : ""}`} 
                          style={{ backgroundColor: event.completed ? undefined : (cls?.color || "#8b5cf6") }}
                          title={`${event.type.toUpperCase()}: ${event.title}`}
                        >
                          {event.startTime && <span style={{ fontSize: '9px', opacity: 0.8, marginRight: '3px' }}>{event.startTime}</span>}
                          {event.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'week' && (
          <div className={styles.weekGrid}>
            {getWeekDays(viewDate).map((dateVal, idx) => {
              const dateStr = dateVal.toISOString().split('T')[0];
              const weekEvents = getEventsForDateStr(dateStr);
              const today = new Date();
              const isToday = dateVal.getDate() === today.getDate() && 
                              dateVal.getMonth() === today.getMonth() && 
                              dateVal.getFullYear() === today.getFullYear();
              
              const isDragOver = draggedOverDay === dateStr;

              return (
                <div 
                  key={idx} 
                  className={`${styles.weekCol} ${isToday ? styles.weekColActive : ""} ${isDragOver ? styles.dragOver : ""}`}
                  onClick={() => handleWeekDayClick(dateVal)}
                  onDragOver={(e) => handleDragOver(e, dateStr)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dateStr)}
                >
                  <div className={styles.weekColHeader}>
                    <span className={styles.weekDayLabel}>{daysOfWeek[idx]}</span>
                    <span className={styles.weekDayNum}>{dateVal.getDate()}</span>
                  </div>
                  <div className={styles.weekEvents}>
                    {weekEvents.map(event => {
                      const cls = classes.find(c => c.id === event.classId);
                      return (
                        <div 
                          key={event.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, event.id)}
                          onClick={(e) => handleEventClick(e, event)}
                          className={`${styles.eventPill} ${event.completed ? styles.eventPillCompleted : ""}`}
                          style={{ 
                            backgroundColor: event.completed ? undefined : (cls?.color || "#8b5cf6"),
                            whiteSpace: 'normal',
                            padding: '8px'
                          }}
                        >
                          <div style={{ fontSize: '9px', textTransform: 'uppercase', opacity: 0.8, fontWeight: 700, marginBottom: '2px' }}>
                            {event.startTime ? `${event.startTime} ${event.endTime ? ` - ${event.endTime}` : ''}` : 'All Day'}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 600 }}>{event.title}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'agenda' && (
          <div className={styles.agendaList}>
            {events.length === 0 ? (
              <p className={styles.emptyMsg} style={{ textAlign: 'center', padding: '40px' }}>No events scheduled.</p>
            ) : (
              // Group events by date
              Object.entries(
                events.reduce((acc: { [key: string]: AcademicEvent[] }, event) => {
                  if (!acc[event.date]) acc[event.date] = [];
                  acc[event.date].push(event);
                  return acc;
                }, {})
              )
              .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
              .map(([dateString, dateEvents]) => (
                <div key={dateString} className={styles.agendaGroup}>
                  <div className={styles.agendaDate}>
                    {new Date(dateString + "T12:00:00").toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                  {dateEvents
                    .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
                    .map(event => {
                      const cls = classes.find(c => c.id === event.classId);
                      return (
                        <div key={event.id} className={styles.agendaItem} onClick={(e) => handleEventClick(e, event)}>
                          <input 
                            type="checkbox" 
                            className={styles.agendaCheckbox} 
                            checked={!!event.completed} 
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              updateEvent({
                                ...event,
                                completed: e.target.checked
                              });
                            }}
                          />
                          <div className={styles.agendaBody}>
                            <div className={styles.agendaMeta}>
                              <span 
                                className={styles.agendaClassBadge} 
                                style={{ backgroundColor: cls?.color || "#8b5cf6" }}
                              >
                                {cls?.name || "N/A"}
                              </span>
                              <span className={styles.agendaTypeBadge}>{event.type}</span>
                              {event.startTime && (
                                <span className={styles.agendaTime}>
                                  🕒 {event.startTime} {event.endTime ? ` - ${event.endTime}` : ''}
                                </span>
                              )}
                            </div>
                            <div 
                              className={styles.agendaTitle}
                              style={{ textDecoration: event.completed ? 'line-through' : 'none', opacity: event.completed ? 0.6 : 1 }}
                            >
                              {event.title}
                            </div>
                            {event.description && <div className={styles.agendaDesc}>{event.description}</div>}
                          </div>
                          <div className={styles.agendaRight}>
                            {event.score !== undefined && (
                              <span style={{ fontSize: '13px', fontWeight: 600 }}>
                                Grade: {event.score}/{event.totalScore} ({event.weight}%)
                              </span>
                            )}
                            {event.materialUrl && (
                              <a 
                                href={event.materialUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="btn-primary"
                                style={{ fontSize: '11px', padding: '6px 12px' }}
                                onClick={e => e.stopPropagation()}
                              >
                                Open PDF
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      <Modal 
        isOpen={isEventModalOpen} 
        onClose={() => setIsEventModalOpen(false)} 
        title={`Add Event for ${selectedDateStr}`}
      >
        <form onSubmit={handleAddEvent} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Title</label>
            <input 
              type="text" 
              value={eventTitle} 
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="e.g. Chemistry Midterm, Reading assignment, etc."
              className={styles.input}
              required
              autoFocus
            />
          </div>
          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Class</label>
              <select value={eventClassId} onChange={(e) => setEventClassId(e.target.value)} className={styles.select} required>
                <option value="">Select Class</option>
                {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Type</label>
              <select value={eventType} onChange={(e) => setEventType(e.target.value as any)} className={styles.select}>
                <option value="assignment">Assignment</option>
                <option value="exam">Exam</option>
                <option value="quiz">Quiz</option>
                <option value="material">Material</option>
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Start Time (Optional)</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>End Time (Optional)</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={styles.input} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea 
              value={eventDescription} 
              onChange={(e) => setEventDescription(e.target.value)}
              placeholder="Add study goals, syllabus topics, or general reminders..."
              className={styles.input}
              rows={2}
              style={{ resize: 'none', fontFamily: 'inherit' }}
            />
          </div>

          {eventType === 'material' ? (
            <div className={styles.formGroup}>
              <label>Link (Google Drive/PDF)</label>
              <input 
                type="url" 
                value={materialUrl} 
                onChange={(e) => setMaterialUrl(e.target.value)}
                placeholder="https://..."
                className={styles.input}
              />
            </div>
          ) : (
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label>Score</label>
                <input type="number" step="any" value={score} onChange={(e) => setScore(e.target.value)} placeholder="0" className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>Total</label>
                <input type="number" step="any" value={totalScore} onChange={(e) => setTotalScore(e.target.value)} placeholder="100" className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>Weight %</label>
                <input type="number" step="any" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="10" className={styles.input} />
              </div>
            </div>
          )}

          <div className={styles.checkboxGroup}>
            <input 
              type="checkbox" 
              id="recurring" 
              checked={isRecurring} 
              onChange={(e) => setIsRecurring(e.target.checked)} 
            />
            <label htmlFor="recurring">Repeat weekly for 12 weeks</label>
          </div>

          {(eventType === 'exam' || eventType === 'quiz') && (
            <div className={styles.checkboxGroup} style={{ borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
              <input 
                type="checkbox" 
                id="autoStudy" 
                checked={autoStudyPlan} 
                onChange={(e) => setAutoStudyPlan(e.target.checked)} 
              />
              <label htmlFor="autoStudy" style={{ fontWeight: 600, color: 'var(--accent)' }}>
                ✨ Auto-schedule 1-hour study sessions (1, 2, and 3 days before)
              </label>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={!eventClassId}>
            Create Event
          </button>
        </form>
      </Modal>

      {/* Edit/View Event Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="Edit Event Details"
      >
        <form onSubmit={handleSaveEdit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Title</label>
            <input 
              type="text" 
              value={editTitle} 
              onChange={(e) => setEditTitle(e.target.value)}
              className={styles.input}
              required
            />
          </div>
          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Class</label>
              <select value={editClassId} onChange={(e) => setEditClassId(e.target.value)} className={styles.select} required>
                {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Type</label>
              <select value={editType} onChange={(e) => setEditType(e.target.value as any)} className={styles.select}>
                <option value="assignment">Assignment</option>
                <option value="exam">Exam</option>
                <option value="quiz">Quiz</option>
                <option value="material">Material</option>
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Start Time</label>
              <input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>End Time</label>
              <input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} className={styles.input} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea 
              value={editDescription} 
              onChange={(e) => setEditDescription(e.target.value)}
              className={styles.input}
              rows={2}
              style={{ resize: 'none', fontFamily: 'inherit' }}
            />
          </div>

          {editType === 'material' ? (
            <div className={styles.formGroup}>
              <label>Link (Google Drive/PDF)</label>
              <input 
                type="url" 
                value={editMaterialUrl} 
                onChange={(e) => setEditMaterialUrl(e.target.value)}
                className={styles.input}
              />
            </div>
          ) : (
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label>Score</label>
                <input type="number" step="any" value={editScore} onChange={(e) => setEditScore(e.target.value)} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>Total</label>
                <input type="number" step="any" value={editTotalScore} onChange={(e) => setEditTotalScore(e.target.value)} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label>Weight %</label>
                <input type="number" step="any" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} className={styles.input} />
              </div>
            </div>
          )}

          <div className={styles.checkboxGroup} style={{ borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
            <input 
              type="checkbox" 
              id="completed" 
              checked={editCompleted} 
              onChange={(e) => setEditCompleted(e.target.checked)} 
            />
            <label htmlFor="completed" style={{ fontWeight: 600 }}>Mark as Completed</label>
          </div>

          <div className={styles.row}>
            <button type="button" onClick={handleDelete} className={styles.deleteBtn} style={{ flex: 1 }}>
              Delete Event
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 2 }}>
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}


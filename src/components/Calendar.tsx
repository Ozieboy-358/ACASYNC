"use client";

import { useState } from "react";
import { useAcademic } from "@/lib/context";
import { AcademicEvent } from "@/lib/types";
import Modal from "./Modal";
import styles from "./Calendar.module.css";

export default function Calendar() {
  const { events, addEvent, updateEvent, deleteEvent, classes, objectives, toggleObjectiveStep } = useAcademic();
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');
  
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");

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

  // Filter events by class and type
  const filteredEvents = events.filter(e => {
    if (selectedClassFilter !== "all" && e.classId !== selectedClassFilter) return false;
    if (selectedTypeFilter !== "all" && e.type !== selectedTypeFilter) return false;
    return true;
  });

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
    const day = current.getDay();
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

  const resetForm = () => {
    setEventTitle("");
    setEventClassId("");
    setEventType('assignment');
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

        // Auto study plan generator
        if (autoStudyPlan && (eventType === 'exam' || eventType === 'quiz')) {
          const daysToSchedule = [3, 2, 1];
          daysToSchedule.forEach(daysBefore => {
            const examDate = new Date(selectedDateStr + "T12:00:00");
            examDate.setDate(examDate.getDate() - daysBefore);
            const dateStr = examDate.toISOString().split('T')[0];

            addEvent({
              title: `Study Session: ${eventTitle}`,
              classId: eventClassId,
              type: 'material',
              date: dateStr,
              startTime: "16:00",
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

  const getEventsForDay = (day: number) => {
    const dateStr = `${viewDate.getFullYear()}-${(viewDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return filteredEvents.filter(e => e.date === dateStr).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  };

  const getEventsForDateStr = (dateStr: string) => {
    return filteredEvents.filter(e => e.date === dateStr).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
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

  // Objective matching selected event
  const currentEventObjective = selectedEvent 
    ? objectives.find(o => o.classId === selectedEvent.classId && o.title.toLowerCase().includes(selectedEvent.title.toLowerCase())) ||
      objectives.find(o => o.classId === selectedEvent.classId)
    : null;

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

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Class filter */}
            <select 
              value={selectedClassFilter} 
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className={styles.filterSelect}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px' }}
            >
              <option value="all">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Type filter */}
            <select 
              value={selectedTypeFilter} 
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className={styles.filterSelect}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px' }}
            >
              <option value="all">All Types</option>
              <option value="assignment">Assignments</option>
              <option value="exam">Exams</option>
              <option value="quiz">Quizzes</option>
              <option value="material">Materials</option>
            </select>

            <div className={styles.controls}>
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
            {filteredEvents.length === 0 ? (
              <p className={styles.emptyMsg} style={{ textAlign: 'center', padding: '40px' }}>No assignments or events matching filter.</p>
            ) : (
              Object.entries(
                filteredEvents.reduce((acc: { [key: string]: AcademicEvent[] }, event) => {
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
                                {cls?.name || "General"}
                              </span>
                              <span className={styles.agendaTypeBadge}>{event.type.toUpperCase()}</span>
                              {event.startTime && (
                                <span className={styles.agendaTime}>
                                  {event.startTime} {event.endTime ? `- ${event.endTime}` : ""}
                                </span>
                              )}
                            </div>
                            <h4 className={styles.agendaTitle} style={{ textDecoration: event.completed ? 'line-through' : 'none' }}>
                              {event.title}
                            </h4>
                            {event.description && <p className={styles.agendaDesc}>{event.description}</p>}
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
        onClose={() => {
          setIsEventModalOpen(false);
          resetForm();
        }} 
        title={`Add Assignment / Event for ${selectedDateStr}`}
      >
        <form onSubmit={handleAddEvent} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Title</label>
            <input 
              type="text" 
              value={eventTitle} 
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="e.g. Homework 1 - Kinematics"
              className={styles.input}
              required
              autoFocus
            />
          </div>
          
          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Class</label>
              <select 
                value={eventClassId} 
                onChange={(e) => setEventClassId(e.target.value)}
                className={styles.input}
                required
              >
                <option value="" disabled>Select Class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Type</label>
              <select 
                value={eventType} 
                onChange={(e) => setEventType(e.target.value as any)}
                className={styles.input}
              >
                <option value="assignment">Assignment</option>
                <option value="exam">Exam</option>
                <option value="quiz">Quiz</option>
                <option value="material">Material / Note</option>
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Start Time (Optional)</label>
              <input 
                type="time" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>End Time (Optional)</label>
              <input 
                type="time" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          {eventType === 'material' ? (
            <div className={styles.formGroup}>
              <label>Material / Document Link</label>
              <input 
                type="url" 
                value={materialUrl} 
                onChange={(e) => setMaterialUrl(e.target.value)}
                placeholder="https://... PDF or D2L link"
                className={styles.input}
              />
            </div>
          ) : (
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label>Weight (% of grade)</label>
                <input 
                  type="number" 
                  value={weight} 
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 10"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Score (Received)</label>
                <input 
                  type="number" 
                  value={score} 
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="e.g. 95"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Total Score</label>
                <input 
                  type="number" 
                  value={totalScore} 
                  onChange={(e) => setTotalScore(e.target.value)}
                  placeholder="e.g. 100"
                  className={styles.input}
                />
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Description / D2L Notes</label>
            <textarea 
              value={eventDescription} 
              onChange={(e) => setEventDescription(e.target.value)}
              placeholder="Add details, instructions, or assignment guidelines..."
              className={styles.input}
              style={{ minHeight: '80px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '20px' }}>
            <label className={styles.checkboxLabel} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input 
                type="checkbox" 
                checked={isRecurring} 
                onChange={(e) => setIsRecurring(e.target.checked)} 
              />
              Repeat weekly (12 weeks)
            </label>

            {(eventType === 'exam' || eventType === 'quiz') && (
              <label className={styles.checkboxLabel} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--accent)' }}>
                <input 
                  type="checkbox" 
                  checked={autoStudyPlan} 
                  onChange={(e) => setAutoStudyPlan(e.target.checked)} 
                />
                Auto-generate study sessions
              </label>
            )}
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>Create Assignment</button>
        </form>
      </Modal>

      {/* Edit Event & Completion Guide Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedEvent(null);
        }} 
        title="Assignment Details & Completion Guide"
      >
        {selectedEvent && (
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
                <select 
                  value={editClassId} 
                  onChange={(e) => setEditClassId(e.target.value)}
                  className={styles.input}
                  required
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Type</label>
                <select 
                  value={editType} 
                  onChange={(e) => setEditType(e.target.value as any)}
                  className={styles.input}
                >
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
                <input 
                  type="time" 
                  value={editStartTime} 
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>End Time</label>
                <input 
                  type="time" 
                  value={editEndTime} 
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            {editType !== 'material' && (
              <div className={styles.row}>
                <div className={styles.formGroup}>
                  <label>Weight (%)</label>
                  <input 
                    type="number" 
                    value={editWeight} 
                    onChange={(e) => setEditWeight(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Score</label>
                  <input 
                    type="number" 
                    value={editScore} 
                    onChange={(e) => setEditScore(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Total Score</label>
                  <input 
                    type="number" 
                    value={editTotalScore} 
                    onChange={(e) => setEditTotalScore(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>
            )}

            {/* Core Objective & Guide Steps for this assignment */}
            {currentEventObjective && (
              <div className="glass" style={{ padding: '14px', borderRadius: '10px', marginTop: '10px', border: '1px solid var(--accent-glow)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)', marginBottom: '6px' }}>
                  🎯 Core Objective Guide
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {currentEventObjective.title}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {currentEventObjective.guides.map(g => (
                    <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox"
                        checked={g.completed}
                        onChange={() => toggleObjectiveStep(currentEventObjective.id, g.id)}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span style={{ textDecoration: g.completed ? 'line-through' : 'none', color: g.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                        {g.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.formGroup} style={{ marginTop: '10px' }}>
              <label>Description / D2L Notes</label>
              <textarea 
                value={editDescription} 
                onChange={(e) => setEditDescription(e.target.value)}
                className={styles.input}
                style={{ minHeight: '70px', resize: 'vertical' }}
              />
            </div>

            <label className={styles.checkboxLabel} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
              <input 
                type="checkbox" 
                checked={editCompleted} 
                onChange={(e) => setEditCompleted(e.target.checked)} 
              />
              Mark as Completed
            </label>

            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button 
                type="button" 
                onClick={handleDelete}
                style={{ flex: 1, background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}
              >
                Delete Task
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 2 }}>
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

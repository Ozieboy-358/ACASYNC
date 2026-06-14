"use client";

import { useState, useEffect } from "react";
import { useAcademic } from "@/lib/context";
import Modal from "./Modal";
import styles from "./Sidebar.module.css";
import { syncToGoogle, initGoogleApi } from "@/lib/googleApi";
import { Class } from "@/lib/types";
import axios from "axios";

export default function Sidebar() {
  const { 
    classes, 
    addClass, 
    updateClass, 
    deleteClass, 
    events, 
    addEvent, 
    currentView, 
    setCurrentView,
    theme,
    setTheme,
    geminiKey
  } = useAcademic();

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isD2LModalOpen, setIsD2LModalOpen] = useState(false);
  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [activeTab, setActiveTab] = useState<'materials' | 'grades' | 'notebook'>('materials');
  const [syllabusText, setSyllabusText] = useState("");
  const [isParsingSyllabus, setIsParsingSyllabus] = useState(false);
  
  // Class add form state
  const [newClassName, setNewClassName] = useState("");
  const [newClassColor, setNewClassColor] = useState("#8b5cf6");
  const [newNotebookUrl, setNewNotebookUrl] = useState("");
  const [newClassCredits, setNewClassCredits] = useState(3);

  // Class edit form state
  const [editClassName, setEditClassName] = useState("");
  const [editClassColor, setEditClassColor] = useState("#8b5cf6");
  const [editNotebookUrl, setEditNotebookUrl] = useState("");
  const [editClassCredits, setEditClassCredits] = useState(3);

  const [d2lUrl, setD2lUrl] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    initGoogleApi();
  }, []);

  const handleSync = async () => {
    await syncToGoogle(events);
  };

  const handleD2LSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d2lUrl.trim()) return;

    setIsSyncing(true);
    try {
      const response = await axios.get(`/api/d2l?url=${encodeURIComponent(d2lUrl)}`);
      const newEvents = response.data.events;

      newEvents.forEach((event: any) => {
        const exists = events.find(e => e.title === event.title && e.date === event.date);
        if (!exists) {
          addEvent({
            ...event,
            classId: "d2l-sync"
          });
        }
      });

      if (!classes.find(c => c.name === "D2L Sync")) {
        addClass({ name: "D2L Sync", color: "#ff8c00", credits: 0 });
      }

      setD2lUrl("");
      setIsD2LModalOpen(false);
      alert(`Synced ${newEvents.length} events from D2L!`);
    } catch (err) {
      console.error(err);
      alert("Failed to sync D2L. Please check the URL.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyllabusSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syllabusText.trim()) return;

    setIsParsingSyllabus(true);
    try {
      if (geminiKey) {
        const prompt = `You are an academic syllabus parser. Analyze the syllabus text below and extract:
1. Course Name (e.g. "Linear Algebra", "Introduction to Biology")
2. Course Credits (as a number, e.g. 3 or 4. If not found, guess 3)
3. Course Color (a hexadecimal color code, e.g. "#8b5cf6", "#3b82f6", "#10b981", "#ff8c00". Choose a distinct, premium-looking color)
4. All assignments, exams, quizzes, or materials, with their respective dates. Convert dates into YYYY-MM-DD format (use current year 2026 if not specified).
For each event, also extract:
- Type: "assignment", "exam", "quiz", or "material"
- Weight (as a percentage, e.g. 10. If not specified, choose standard: homeworks 5%, quizzes 10%, midterm 25%, final exam 30%-40%)
- Description: details about the event
- TotalScore: e.g. 100

Format your reply strictly as a JSON object of this structure:
{
  "className": "...",
  "credits": 3,
  "color": "#...",
  "events": [
    {
      "title": "Assignment 1",
      "type": "assignment",
      "date": "2026-09-20",
      "startTime": "23:59",
      "weight": 5,
      "totalScore": 100,
      "description": "..."
    }
  ]
}

No markdown tags or formatting outside the JSON block.

Syllabus Text:
${syllabusText}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) throw new Error("Gemini API call failed");
        
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);

        const classId = addClass({
          name: parsed.className || "Syllabus Import",
          color: parsed.color || "#8b5cf6",
          credits: parsed.credits || 3
        });

        if (parsed.events && Array.isArray(parsed.events)) {
          parsed.events.forEach((ev: any) => {
            addEvent({
              classId,
              title: ev.title,
              date: ev.date,
              type: ev.type || "assignment",
              description: ev.description || "",
              weight: ev.weight || 5,
              totalScore: ev.totalScore || 100,
              startTime: ev.startTime || undefined,
              endTime: ev.endTime || undefined,
              completed: false
            });
          });
        }

        alert(`Successfully imported "${parsed.className}" with ${parsed.events?.length || 0} events!`);
        setIsSyllabusModalOpen(false);
        setSyllabusText("");
      } else {
        // Fallback offline generator
        alert("Gemini Developer Key is not configured. Creating a mock class based on key syllabus elements.");
        
        // Let's create a basic class
        const classId = addClass({
          name: "Syllabus Class (Offline)",
          color: "#0ea5e9",
          credits: 3
        });

        const today = new Date();
        const dates = [7, 14, 21, 30];
        const types: Array<'assignment'|'exam'|'quiz'> = ['assignment', 'quiz', 'assignment', 'exam'];
        const titles = ["Homework 1", "Syllabus Quiz", "Homework 2", "Midterm Exam"];
        const weights = [5, 10, 5, 25];

        dates.forEach((dOffset, idx) => {
          const date = new Date();
          date.setDate(today.getDate() + dOffset);
          addEvent({
            classId,
            title: titles[idx],
            date: date.toISOString().split('T')[0],
            type: types[idx],
            weight: weights[idx],
            totalScore: 100,
            completed: false
          });
        });

        alert("Successfully imported mock class and schedule!");
        setIsSyllabusModalOpen(false);
        setSyllabusText("");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to parse syllabus. Make sure it is clear or check your Gemini Key.");
    } finally {
      setIsParsingSyllabus(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setSyllabusText(text);
    };
    reader.readAsText(file);
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName.trim()) {
      addClass({ 
        name: newClassName, 
        color: newClassColor,
        notebookUrl: newNotebookUrl,
        credits: newClassCredits 
      });
      setNewClassName("");
      setNewNotebookUrl("");
      setNewClassCredits(3);
      setIsClassModalOpen(false);
    }
  };

  const handleEditClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClass && editClassName.trim()) {
      const updatedClass = {
        id: selectedClass.id,
        name: editClassName,
        color: editClassColor,
        notebookUrl: editNotebookUrl,
        credits: editClassCredits
      };
      updateClass(updatedClass);
      setSelectedClass(updatedClass);
      setIsEditClassModalOpen(false);
    }
  };

  const classMaterials = events.filter(e => e.classId === selectedClass?.id && e.type === 'material');
  const classAssignments = events.filter(e => e.classId === selectedClass?.id && e.score !== undefined);

  const calculateGrade = () => {
    if (classAssignments.length === 0) return "N/A";
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    classAssignments.forEach(a => {
      if (a.score !== undefined && a.totalScore !== undefined && a.weight !== undefined) {
        totalWeightedScore += (a.score / a.totalScore) * a.weight;
        totalWeight += a.weight;
      }
    });

    if (totalWeight === 0) return "N/A";
    return Math.round((totalWeightedScore / totalWeight) * 100) + "%";
  };

  const getRelativeTimeString = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr);
    eventDate.setHours(0, 0, 0, 0);
    
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays > 1) return `${diffDays} days left`;
    if (diffDays === -1) return "Yesterday";
    return `${Math.abs(diffDays)} days ago`;
  };

  return (
    <>
      <aside className={`${styles.sidebar} glass`}>
        {selectedClass ? (
          <div className={styles.detailView}>
            <header className={styles.detailHeader}>
              <button className={styles.backBtn} onClick={() => setSelectedClass(null)}>&larr;</button>
              <h2 style={{ color: selectedClass.color }}>{selectedClass.name}</h2>
              <div className={styles.classActions}>
                <button 
                  className={styles.actionIconBtn} 
                  title="Edit Class" 
                  onClick={() => {
                    setEditClassName(selectedClass.name);
                    setEditClassColor(selectedClass.color);
                    setEditNotebookUrl(selectedClass.notebookUrl || "");
                    setEditClassCredits(selectedClass.credits || 3);
                    setIsEditClassModalOpen(true);
                  }}
                >
                  ✏️
                </button>
                <button 
                  className={`${styles.actionIconBtn} ${styles.actionIconBtnDelete}`} 
                  title="Delete Class" 
                  onClick={() => {
                    if (confirm(`Delete "${selectedClass.name}" and all its tasks/grades?`)) {
                      deleteClass(selectedClass.id);
                      setSelectedClass(null);
                    }
                  }}
                >
                  🗑️
                </button>
              </div>
            </header>

            <div className={styles.tabs}>
              <button 
                className={`${styles.tab} ${activeTab === 'materials' ? styles.tabActive : ""}`}
                onClick={() => setActiveTab('materials')}
              >
                Materials
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'grades' ? styles.tabActive : ""}`}
                onClick={() => setActiveTab('grades')}
              >
                Grades
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'notebook' ? styles.tabActive : ""}`}
                onClick={() => setActiveTab('notebook')}
              >
                Notebook
              </button>
            </div>

            {activeTab === 'materials' && (
              <div className={styles.materialsList}>
                {classMaterials.map(m => (
                  <div key={m.id} className={`${styles.materialCard} glass`}>
                    <span className={styles.materialName}>{m.title}</span>
                    {m.materialUrl && (
                      <a href={m.materialUrl} target="_blank" className={styles.materialLink} rel="noreferrer">
                        Open Link
                      </a>
                    )}
                  </div>
                ))}
                {classMaterials.length === 0 && <p className={styles.emptyMsg}>No materials yet.</p>}
              </div>
            )}

            {activeTab === 'grades' && (
              <div className={styles.gradeView}>
                <div className={`${styles.gradeInfo} glass`}>
                  <p className={styles.gradeLabel}>Current Grade</p>
                  <h3 className={styles.gradeValue}>{calculateGrade()}</h3>
                  <p className={styles.emptyMsg} style={{ fontSize: '11px', marginTop: '4px' }}>
                    Credits: {selectedClass.credits || 3}
                  </p>
                </div>
                <div className={styles.eventList} style={{ marginTop: '20px' }}>
                  {classAssignments.map(a => (
                    <div key={a.id} className={styles.eventItem} style={{ opacity: a.completed ? 0.6 : 1 }}>
                      <span className={styles.eventDate}>
                        {a.score}/{a.totalScore} {a.completed && "✓"}
                      </span>
                      <p className={styles.eventTitle} style={{ textDecoration: a.completed ? 'line-through' : 'none' }}>
                        {a.title} ({a.weight}%)
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'notebook' && (
              <div className={styles.notebookView}>
                <div className={`${styles.notebookInfo} glass`}>
                  <div className={styles.notebookIcon}>📓</div>
                  <p className={styles.notebookText}>
                    Analyze your syllabus, lecture notes, and materials using our built-in NotebookLM workspace, or open the external application.
                  </p>
                  <button 
                    onClick={() => {
                      localStorage.setItem('aca_notebook_class_id', selectedClass.id);
                      setCurrentView('notebook');
                    }}
                    className="btn-primary"
                    style={{ marginTop: '16px', display: 'block', width: '100%', cursor: 'pointer' }}
                  >
                    Enter Local Workspace
                  </button>
                  <a 
                    href={selectedClass.notebookUrl || "https://notebooklm.google.com/"} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn-primary"
                    style={{ 
                      marginTop: '10px', 
                      display: 'block', 
                      textAlign: 'center', 
                      backgroundColor: 'transparent', 
                      border: '1px solid var(--accent)', 
                      color: 'var(--foreground)', 
                      boxShadow: 'none' 
                    }}
                  >
                    Open External Link
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <div className={styles.logo}>
                <span className={styles.logoIcon}>A</span>
                <h1>AcaSync</h1>
              </div>
              <button 
                className={styles.mobileMenuToggle} 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle Menu"
              >
                {isMobileMenuOpen ? "✕" : "☰"}
              </button>
            </div>

            {/* View switcher buttons */}
            <div className={styles.viewSelector}>
              <button 
                className={`${styles.viewTab} ${currentView === 'calendar' ? styles.viewTabActive : ""}`} 
                onClick={() => {
                  setCurrentView('calendar');
                  setIsMobileMenuOpen(false);
                }}
              >
                📅 Calendar
              </button>
              <button 
                className={`${styles.viewTab} ${currentView === 'dashboard' ? styles.viewTabActive : ""}`} 
                onClick={() => {
                  setCurrentView('dashboard');
                  setIsMobileMenuOpen(false);
                }}
              >
                📊 Dashboard
              </button>
              <button 
                className={`${styles.viewTab} ${currentView === 'notebook' ? styles.viewTabActive : ""}`} 
                onClick={() => {
                  setCurrentView('notebook');
                  setIsMobileMenuOpen(false);
                }}
              >
                📓 NotebookLM
              </button>
            </div>

            <div className={`${styles.sidebarContent} ${isMobileMenuOpen ? styles.mobileOpen : ""}`}>
              <nav className={styles.nav}>
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Classes</h2>
                  <div className={styles.classList}>
                    {classes.map((cls) => (
                      <button 
                        key={cls.id} 
                        className={`${styles.classItem} glass-interactive`}
                        onClick={() => {
                          setSelectedClass(cls);
                          setIsMobileMenuOpen(false);
                        }}
                      >
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
                    {events
                      .filter(e => e.type !== 'material' && !e.completed)
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .slice(0, 5)
                      .map((event) => {
                        const relTime = getRelativeTimeString(event.date);
                        const isUrgent = relTime === "Today" || relTime === "Tomorrow" || relTime.includes("1 days left");
                        return (
                          <div key={event.id} className={styles.eventItem}>
                            <span className={styles.eventDate}>
                              {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                            </span>
                            <p className={styles.eventTitle}>{event.title}</p>
                            <span className={`${styles.countdownBadge} ${isUrgent ? styles.countdownBadgeUrgent : ""}`}>
                              {relTime}
                            </span>
                          </div>
                        );
                      })}
                    {events.filter(e => e.type !== 'material' && !e.completed).length === 0 && (
                      <p className={styles.emptyMsg}>No upcoming events.</p>
                    )}
                  </div>
                </div>
              </nav>

              <div className={styles.footer}>
                <button className={`${styles.syncBtn} glass-interactive`} onClick={() => setIsSyllabusModalOpen(true)} style={{ marginBottom: '10px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  AI Syllabus Import
                </button>
                <button className={`${styles.syncBtn} glass-interactive`} onClick={() => setIsD2LModalOpen(true)} style={{ marginBottom: '10px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20m10-10H2" />
                  </svg>
                  Import from D2L
                </button>
                <button className={`${styles.syncBtn} glass-interactive`} onClick={handleSync} style={{ marginBottom: '16px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16" />
                  </svg>
                  Sync Google Cal
                </button>

                {/* Theme selector dots */}
                <div className={styles.themeContainer}>
                  <span className={styles.themeLabel}>Theme Accent</span>
                  <div className={styles.themeSelector}>
                    <div 
                      className={`${styles.themeDot} ${styles.themeDotMidnight} ${theme === 'midnight' ? styles.themeDotActive : ''}`} 
                      onClick={() => setTheme('midnight')}
                      title="Midnight Purple"
                    />
                    <div 
                      className={`${styles.themeDot} ${styles.themeDotCyberpunk} ${theme === 'cyberpunk' ? styles.themeDotActive : ''}`} 
                      onClick={() => setTheme('cyberpunk')}
                      title="Neon Cyberpunk"
                    />
                    <div 
                      className={`${styles.themeDot} ${styles.themeDotSakura} ${theme === 'sakura' ? styles.themeDotActive : ''}`} 
                      onClick={() => setTheme('sakura')}
                      title="Sakura Rose"
                    />
                    <div 
                      className={`${styles.themeDot} ${styles.themeDotOcean} ${theme === 'ocean' ? styles.themeDotActive : ''}`} 
                      onClick={() => setTheme('ocean')}
                      title="Deep Ocean"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </aside>

      <Modal 
        isOpen={isSyllabusModalOpen} 
        onClose={() => setIsSyllabusModalOpen(false)} 
        title="AI Syllabus Scheduler"
      >
        <form onSubmit={handleSyllabusSync} className={styles.form}>
          <p className={styles.instructionText}>
            Upload a syllabus document or paste its text. We'll use Gemini to automatically create the course, configure grade weights, and schedule all tests and assignments on your calendar.
          </p>
          <div className={styles.formGroup}>
            <label>Upload Syllabus file (.txt, .md)</label>
            <input 
              type="file" 
              accept=".txt,.md,.html" 
              onChange={handleFileUpload}
              className={styles.input}
              style={{ padding: '8px 0' }}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Or Paste Syllabus Text</label>
            <textarea 
              value={syllabusText} 
              onChange={(e) => setSyllabusText(e.target.value)}
              placeholder="Paste the syllabus outline, course schedule, and grading weights here..."
              className={styles.input}
              style={{ minHeight: '180px', resize: 'vertical', fontFamily: 'inherit', padding: '10px' }}
              required
            />
          </div>
          <div className={styles.modalActions} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button 
              type="button" 
              className={styles.cancelBtn} 
              onClick={() => setIsSyllabusModalOpen(false)}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'none', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isParsingSyllabus || !syllabusText.trim()}
              style={{ flex: 1 }}
            >
              {isParsingSyllabus ? "Processing via AI..." : "Build Schedule"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isD2LModalOpen} 
        onClose={() => setIsD2LModalOpen(false)} 
        title="Sync with D2L Brightspace"
      >
        <form onSubmit={handleD2LSync} className={styles.form}>
          <p className={styles.instructionText}>
            Paste your D2L iCal subscription URL below. You can find this in your D2L Calendar Settings.
          </p>
          <div className={styles.formGroup}>
            <label>iCal URL</label>
            <input 
              type="url" 
              value={d2lUrl} 
              onChange={(e) => setD2lUrl(e.target.value)}
              placeholder="https://.../feed.ics"
              className={styles.input}
              autoFocus
            />
          </div>
          <button type="submit" className="btn-primary" disabled={isSyncing}>
            {isSyncing ? "Syncing..." : "Sync Assignments"}
          </button>
        </form>
      </Modal>

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
              required
              autoFocus
            />
          </div>
          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Credits (GPA)</label>
              <input 
                type="number" 
                value={newClassCredits} 
                min={0}
                max={6}
                onChange={(e) => setNewClassCredits(parseFloat(e.target.value) || 0)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label>Color</label>
              <input 
                type="color" 
                value={newClassColor} 
                onChange={(e) => setNewClassColor(e.target.value)}
                className={styles.colorInput}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>NotebookLM URL (Optional)</label>
            <input 
              type="url" 
              value={newNotebookUrl} 
              onChange={(e) => setNewNotebookUrl(e.target.value)}
              placeholder="Link to your specific notebook"
              className={styles.input}
            />
          </div>
          <button type="submit" className="btn-primary">Add Class</button>
        </form>
      </Modal>

      <Modal 
        isOpen={isEditClassModalOpen} 
        onClose={() => setIsEditClassModalOpen(false)} 
        title="Edit Class Details"
      >
        <form onSubmit={handleEditClass} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Class Name</label>
            <input 
              type="text" 
              value={editClassName} 
              onChange={(e) => setEditClassName(e.target.value)}
              className={styles.input}
              required
              autoFocus
            />
          </div>
          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label>Credits (GPA)</label>
              <input 
                type="number" 
                value={editClassCredits} 
                min={0}
                max={6}
                onChange={(e) => setEditClassCredits(parseFloat(e.target.value) || 0)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label>Color</label>
              <input 
                type="color" 
                value={editClassColor} 
                onChange={(e) => setEditClassColor(e.target.value)}
                className={styles.colorInput}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>NotebookLM URL (Optional)</label>
            <input 
              type="url" 
              value={editNotebookUrl} 
              onChange={(e) => setEditNotebookUrl(e.target.value)}
              className={styles.input}
            />
          </div>
          <button type="submit" className="btn-primary">Save Changes</button>
        </form>
      </Modal>
    </>
  );
}


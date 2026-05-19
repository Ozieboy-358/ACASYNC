"use client";

import { useAcademic } from "@/lib/context";
import { Class, AcademicEvent } from "@/lib/types";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const { classes, events, updateEvent, updateClass } = useAcademic();

  const getClassGradeData = (classId: string) => {
    const classEvents = events.filter(e => e.classId === classId && e.score !== undefined);
    if (classEvents.length === 0) return { percent: null, letter: "N/A", points: null, weightGraded: 0 };
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    classEvents.forEach(a => {
      if (a.score !== undefined && a.totalScore !== undefined && a.weight !== undefined) {
        totalWeightedScore += (a.score / a.totalScore) * a.weight;
        totalWeight += a.weight;
      }
    });
    
    if (totalWeight === 0) return { percent: null, letter: "N/A", points: null, weightGraded: 0 };
    const percent = (totalWeightedScore / totalWeight) * 100;
    
    let points = 0.0;
    let letter = "F";
    if (percent >= 93) { points = 4.0; letter = "A"; }
    else if (percent >= 90) { points = 3.7; letter = "A-"; }
    else if (percent >= 87) { points = 3.3; letter = "B+"; }
    else if (percent >= 83) { points = 3.0; letter = "B"; }
    else if (percent >= 80) { points = 2.7; letter = "B-"; }
    else if (percent >= 77) { points = 2.3; letter = "C+"; }
    else if (percent >= 73) { points = 2.0; letter = "C"; }
    else if (percent >= 70) { points = 1.7; letter = "C-"; }
    else if (percent >= 67) { points = 1.3; letter = "D+"; }
    else if (percent >= 60) { points = 1.0; letter = "D"; }
    
    return { percent, letter, points, weightGraded: totalWeight };
  };

  // Projected GPA
  let totalGradePoints = 0;
  let totalCredits = 0;
  
  classes.forEach(cls => {
    const { points } = getClassGradeData(cls.id);
    if (points !== null) {
      const credits = cls.credits !== undefined ? cls.credits : 3;
      totalGradePoints += points * credits;
      totalCredits += credits;
    }
  });
  
  const projectedGPA = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : "N/A";

  // Study session statistics
  const studySessions = events.filter(e => 
    e.title.toLowerCase().includes("study session") || 
    (e.description && e.description.toLowerCase().includes("prepare for upcoming"))
  );
  const completedStudy = studySessions.filter(e => e.completed).length;
  const totalStudy = studySessions.length;

  // General tasks completion
  const totalTasks = events.filter(e => e.type !== 'material');
  const completedTasks = totalTasks.filter(e => e.completed).length;
  const taskCompletionRate = totalTasks.length > 0 ? Math.round((completedTasks / totalTasks.length) * 100) : 0;

  // Next upcoming tasks (excluding completed and study materials)
  const outstandingTasks = events
    .filter(e => e.type !== 'material' && !e.completed)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const handleCreditChange = (cls: Class, val: string) => {
    const credits = parseFloat(val);
    if (!isNaN(credits) && credits >= 0) {
      updateClass({
        ...cls,
        credits: credits
      });
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Academic Dashboard</h1>
        <p>Real-time projections, course progression, and deliverables.</p>
      </header>

      {/* Analytics stats row */}
      <section className={styles.statsRow}>
        <div className={`${styles.statCard} glass`}>
          <div className={styles.statIcon} style={{ color: 'var(--accent)' }}>🎓</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{projectedGPA}</span>
            <span className={styles.statLabel}>Projected GPA</span>
          </div>
        </div>

        <div className={`${styles.statCard} glass`}>
          <div className={styles.statIcon} style={{ color: '#fda4af' }}>📓</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{completedStudy} / {totalStudy}</span>
            <span className={styles.statLabel}>Study Sessions</span>
          </div>
        </div>

        <div className={`${styles.statCard} glass`}>
          <div className={styles.statIcon} style={{ color: '#10b981' }}>✓</div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{taskCompletionRate}%</span>
            <span className={styles.statLabel}>Task Progress</span>
          </div>
        </div>
      </section>

      {/* Main split grid */}
      <div className={styles.mainGrid}>
        {/* Classes progression grid */}
        <section>
          <h2 className={styles.sectionTitle}>📚 Class Progression</h2>
          {classes.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📓</span>
              <p className={styles.emptyText}>Add some classes in the sidebar to start tracking grades!</p>
            </div>
          ) : (
            <div className={styles.classesGrid}>
              {classes.map(cls => {
                const gradeData = getClassGradeData(cls.id);
                const upcomingForClass = events
                  .filter(e => e.classId === cls.id && e.type !== 'material' && !e.completed)
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .slice(0, 2);

                return (
                  <div key={cls.id} className={`${styles.classCard} glass`}>
                    <div className={styles.classHeader}>
                      <span className={styles.className} style={{ color: cls.color }}>{cls.name}</span>
                      <div className={styles.classCredits}>
                        <span>Credits:</span>
                        <input 
                          type="number" 
                          className={styles.creditsInput} 
                          value={cls.credits !== undefined ? cls.credits : 3} 
                          onChange={(e) => handleCreditChange(cls, e.target.value)}
                          min="0"
                          max="6"
                        />
                      </div>
                    </div>

                    <div className={styles.gradeContainer}>
                      <span className={styles.gradeValue}>
                        {gradeData.percent !== null ? `${Math.round(gradeData.percent)}%` : "—"}
                      </span>
                      <span className={styles.gradeLabel}>
                        Current Grade ({gradeData.letter})
                      </span>
                    </div>

                    {/* Syllabus progress weight indicator */}
                    <div className={styles.progressContainer}>
                      <div className={styles.progressLabelRow}>
                        <span>Grades Graded</span>
                        <span>{gradeData.weightGraded}% Weight</span>
                      </div>
                      <div className={styles.progressBarOuter}>
                        <div 
                          className={styles.progressBarInner} 
                          style={{ 
                            width: `${Math.min(gradeData.weightGraded, 100)}%`,
                            backgroundColor: cls.color 
                          }}
                        />
                      </div>
                    </div>

                    {/* Upcoming tasks specific to this class */}
                    <div className={styles.upcomingEventsList}>
                      <span className={styles.upcomingTitle}>Upcoming Tasks</span>
                      {upcomingForClass.map(event => (
                        <div key={event.id} className={styles.upcomingItem}>
                          <span className={styles.upcomingName}>{event.title}</span>
                          <span className={styles.upcomingDate}>
                            {new Date(event.date + "T12:00:00").toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))}
                      {upcomingForClass.length === 0 && (
                        <p className={styles.emptyMsg} style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          No upcoming tasks.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Deliverables checklist section */}
        <section className={`${styles.feedPanel} glass`}>
          <h2 className={styles.sectionTitle}>📋 Priority Deliverables</h2>
          {outstandingTasks.length === 0 ? (
            <div className={styles.emptyState} style={{ border: 'none', padding: '20px' }}>
              <span className={styles.emptyIcon}>🎉</span>
              <p className={styles.emptyText}>All assignments are completed!</p>
            </div>
          ) : (
            <div className={styles.checklist}>
              {outstandingTasks.map(event => {
                const cls = classes.find(c => c.id === event.classId);
                return (
                  <div key={event.id} className={styles.checkItem}>
                    <input 
                      type="checkbox" 
                      className={styles.checkCheckbox} 
                      checked={!!event.completed}
                      onChange={(e) => {
                        updateEvent({
                          ...event,
                          completed: e.target.checked
                        });
                      }}
                    />
                    <div className={styles.checkTextContainer}>
                      <span className={styles.checkTitle}>{event.title}</span>
                      <span className={styles.checkClass} style={{ color: cls?.color || "var(--accent)" }}>
                        {cls?.name || "D2L Sync"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

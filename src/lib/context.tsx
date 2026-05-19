"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Class, AcademicEvent } from './types';

interface AcademicContextType {
  classes: Class[];
  events: AcademicEvent[];
  addClass: (cls: Omit<Class, 'id'>) => void;
  addEvent: (event: Omit<AcademicEvent, 'id'>) => void;
  updateEvent: (event: AcademicEvent) => void;
  deleteEvent: (id: string) => void;
  updateClass: (cls: Class) => void;
  deleteClass: (id: string) => void;
  currentView: 'calendar' | 'dashboard';
  setCurrentView: (view: 'calendar' | 'dashboard') => void;
  theme: string;
  setTheme: (theme: string) => void;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export function AcademicProvider({ children }: { children: React.ReactNode }) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [currentView, setCurrentView] = useState<'calendar' | 'dashboard'>('calendar');
  const [theme, setTheme] = useState<string>('midnight');

  useEffect(() => {
    const savedClasses = localStorage.getItem('aca_classes');
    const savedEvents = localStorage.getItem('aca_events');
    const savedTheme = localStorage.getItem('aca_theme') || 'midnight';
    if (savedClasses) setClasses(JSON.parse(savedClasses));
    if (savedEvents) setEvents(JSON.parse(savedEvents));
    setTheme(savedTheme);
    document.body.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('aca_classes', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem('aca_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('aca_theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const addClass = (cls: Omit<Class, 'id'>) => {
    const newClass = { ...cls, id: Math.random().toString(36).substr(2, 9) };
    setClasses([...classes, newClass]);
  };

  const addEvent = (event: Omit<AcademicEvent, 'id'>) => {
    const newEvent = { ...event, id: Math.random().toString(36).substr(2, 9) };
    setEvents([...events, newEvent]);
  };

  const updateEvent = (updated: AcademicEvent) => {
    setEvents(events.map(e => e.id === updated.id ? updated : e));
  };

  const deleteEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  const updateClass = (updated: Class) => {
    setClasses(classes.map(c => c.id === updated.id ? updated : c));
  };

  const deleteClass = (id: string) => {
    setClasses(classes.filter(c => c.id !== id));
    setEvents(events.filter(e => e.classId !== id)); // Clean up events for deleted class
  };

  return (
    <AcademicContext.Provider value={{ 
      classes, 
      events, 
      addClass, 
      addEvent,
      updateEvent,
      deleteEvent,
      updateClass,
      deleteClass,
      currentView,
      setCurrentView,
      theme,
      setTheme
    }}>
      {children}
    </AcademicContext.Provider>
  );
}

export function useAcademic() {
  const context = useContext(AcademicContext);
  if (context === undefined) {
    throw new Error('useAcademic must be used within an AcademicProvider');
  }
  return context;
}


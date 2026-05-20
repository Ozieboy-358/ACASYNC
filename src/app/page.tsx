"use client";

import Sidebar from "@/components/Sidebar";
import Calendar from "@/components/Calendar";
import Dashboard from "@/components/Dashboard";
import NotebookLM from "@/components/NotebookLM";
import { useAcademic } from "@/lib/context";
import styles from "./page.module.css";

export default function Home() {
  const { currentView } = useAcademic();

  return (
    <main className={styles.main}>
      <Sidebar />
      {currentView === 'calendar' ? (
        <Calendar />
      ) : currentView === 'dashboard' ? (
        <Dashboard />
      ) : (
        <NotebookLM />
      )}
    </main>
  );
}



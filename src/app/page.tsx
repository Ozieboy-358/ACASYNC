import Sidebar from "@/components/Sidebar";
import Calendar from "@/components/Calendar";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <Sidebar />
      <Calendar />
    </main>
  );
}

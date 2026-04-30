import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import s from './AppLayout.module.css';

export function AppLayout() {
  return (
    <div className={s.shell}>
      <Sidebar />
      <main className={s.main}>
        <Outlet />
      </main>
    </div>
  );
}

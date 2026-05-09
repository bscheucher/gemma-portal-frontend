import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import '../App.css';

export const Route = createRootRoute({
  component: () => (
    <div className="layout">
      <header className="header">
        <span className="header-title">Gemma Portal</span>
        <nav className="header-nav">
          <Link to="/" className="nav-link" activeProps={{ className: 'nav-link active' }}>
            Chat
          </Link>
          <Link to="/history" className="nav-link" activeProps={{ className: 'nav-link active' }}>
            History
          </Link>
        </nav>
      </header>
      <Outlet />
    </div>
  ),
});

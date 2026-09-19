import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Project = { _id: string; name: string; initials: string; description: string; status: 'On track' | 'At risk' | 'Planning'; progress: number; members: number; due: string; tone: string }
type Task = { _id: string; label: string; project: string; checked: boolean; due: string }
type Activity = { _id: string; initials: string; tone: string; actor: string; action: string; subject: string; detail: string }

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const apiUrl = (path: string) => `${apiBaseUrl}${path}`

const initialProjects: Project[] = [
  { _id: 'demo-WR', name: 'Website redesign', initials: 'WR', description: 'Refresh the marketing site and docs', status: 'On track', progress: 72, members: 8, due: 'Oct 24', tone: 'blue' },
  { _id: 'demo-MA', name: 'Mobile app v2', initials: 'MA', description: 'A faster, more personal mobile experience', status: 'At risk', progress: 48, members: 12, due: 'Nov 02', tone: 'orange' },
  { _id: 'demo-QC', name: 'Q4 campaign', initials: 'QC', description: 'Launch plan for the holiday campaign', status: 'Planning', progress: 18, members: 5, due: 'Nov 18', tone: 'green' },
]
const navItems = [['Overview', '⌂'], ['My work', '✓'], ['Projects', '▦'], ['Calendar', '□'], ['Reports', '↗']]
const initialTasks: Task[] = [
  { _id: 'task-1', label: 'Review homepage concepts', project: 'Website redesign', checked: false, due: 'Today' },
  { _id: 'task-2', label: 'Share research notes with team', project: 'Mobile app v2', checked: true, due: 'Tomorrow' },
  { _id: 'task-3', label: 'Approve campaign budget', project: 'Q4 campaign', checked: false, due: 'Oct 20' },
]

function App() {
  const [activeNav, setActiveNav] = useState('Overview')
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [tasks, setTasks] = useState(initialTasks)
  const [activity, setActivity] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [newProject, setNewProject] = useState('')
  const [toast, setToast] = useState('')
  const filteredProjects = projects.filter((project) => `${project.name} ${project.description}`.toLowerCase().includes(search.toLowerCase()))
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2800) }
  const refreshDashboard = async () => {
    const response = await fetch(apiUrl('/api/dashboard'))
    if (!response.ok) throw new Error('Unable to load dashboard')
    const data: { projects: Project[]; tasks: Task[]; activity: Activity[] } = await response.json()
    setProjects(data.projects); setTasks(data.tasks); setActivity(data.activity); setIsLoading(false)
  }
  useEffect(() => {
    queueMicrotask(() => { refreshDashboard().catch(() => { setIsLoading(false); notify('Using local demo data while the API reconnects') }) })
    const events = new EventSource(apiUrl('/api/events'))
    events.addEventListener('project.created', () => { refreshDashboard().catch(() => undefined) })
    events.addEventListener('task.updated', () => { refreshDashboard().catch(() => undefined) })
    return () => events.close()
  }, [])
  const createProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newProject.trim()) return
    fetch(apiUrl('/api/projects'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newProject }) }).then(async (response) => {
      if (!response.ok) throw new Error('Unable to create project')
      const project: Project = await response.json()
      setProjects((current) => [...current, project]); setNewProject(''); setShowProjectForm(false); notify('Project created successfully')
    }).catch(() => notify('Could not create project'))
  }
  const toggleTask = (task: Task) => {
    const checked = !task.checked
    setTasks((current) => current.map((item) => item._id === task._id ? { ...item, checked } : item))
    fetch(apiUrl(`/api/tasks/${task._id}`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checked }) }).then((response) => {
      if (!response.ok) throw new Error('Unable to save task')
    }).catch(() => {
      setTasks((current) => current.map((item) => item._id === task._id ? { ...item, checked: task.checked } : item))
      notify('Could not save task update')
    })
  }
  const sendInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    fetch(apiUrl('/api/invitations'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email') }) }).then((response) => {
      if (!response.ok) throw new Error('Unable to send invite')
      setShowInvite(false); notify('Invitation sent')
    }).catch(() => notify('Could not send invitation'))
  }

  return (
    <div className="app-shell">
      <aside className="sidebar"><div className="brand"><span className="brand-mark">N</span><span>northstar</span></div><div className="workspace-switcher"><span className="workspace-avatar">A</span><span><b>Acme Inc.</b><small>Growth workspace</small></span><span className="chevron">⌄</span></div><nav className="main-nav" aria-label="Main navigation"><p className="nav-label">Workspace</p>{navItems.map(([label, icon]) => <button key={label} className={activeNav === label ? 'nav-item active' : 'nav-item'} onClick={() => setActiveNav(label)}><span className="nav-icon">{icon}</span>{label}{label === 'My work' && <span className="nav-count">3</span>}</button>)}<p className="nav-label space-top">Manage</p><button className="nav-item" onClick={() => notify('Team settings opened')}><span className="nav-icon">⚙</span>Settings</button><button className="nav-item" onClick={() => notify('Help center opened')}><span className="nav-icon">?</span>Help center</button></nav><div className="sidebar-bottom"><div className="upgrade-card"><span className="spark">✦</span><b>Unlock your potential</b><p>Get more from your workspace with Pro.</p><button onClick={() => notify('Upgrade flow started')}>Explore Pro <span>→</span></button></div><div className="user-row"><span className="user-avatar">JD</span><span><b>Jordan Davis</b><small>Admin</small></span><button aria-label="Open user menu" onClick={() => notify('Profile menu opened')}>•••</button></div></div></aside>
      <main className="main-content"><header className="topbar"><div className="breadcrumb"><span>Workspace</span><span>/</span><b>{activeNav}</b></div><div className="top-actions"><label className="search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything..." /><kbd>⌘ K</kbd></label><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setShowNotifications((current) => !current)}>♧<i></i></button><button className="invite-button" onClick={() => setShowInvite(true)}><span>+</span> Invite</button></div>{showNotifications && <div className="notification-popover"><b>Notifications</b><p><span className="dot blue-dot"></span>Mia commented on Website redesign</p><p><span className="dot green-dot"></span>Your weekly report is ready</p><button onClick={() => setShowNotifications(false)}>Mark all as read</button></div>}</header>
        <div className="content-wrap"><div className="page-heading"><div><p className="eyebrow">Monday, October 16, 2024</p><h1>Good morning, Jordan <span>✦</span></h1><p className="subheading">{isLoading ? 'Syncing your workspace...' : 'Here is what is happening across your workspace today.'}</p></div><button className="primary-button" onClick={() => setShowProjectForm(true)}><span>+</span> New project</button></div>
          <section className="metric-grid" aria-label="Workspace metrics"><div className="metric-card"><div className="metric-top"><span>Active projects</span><span className="metric-icon blue-icon">▦</span></div><strong>{projects.length}</strong><small><em className="up">↗ 12%</em> vs last month</small></div><div className="metric-card"><div className="metric-top"><span>Tasks completed</span><span className="metric-icon green-icon">✓</span></div><strong>84</strong><small><em className="up">↗ 8.4%</em> vs last month</small></div><div className="metric-card"><div className="metric-top"><span>Team members</span><span className="metric-icon purple-icon">♙</span></div><strong>24</strong><small><em className="up">↗ 2</em> new this month</small></div><div className="metric-card"><div className="metric-top"><span>Hours tracked</span><span className="metric-icon orange-icon">◷</span></div><strong>312<span className="metric-unit">h</span></strong><small><em className="down">↘ 3.2%</em> vs last month</small></div></section>
          <div className="section-heading"><div><h2>Project overview</h2><p>Keep an eye on your team's progress.</p></div><button className="text-button" onClick={() => setActiveNav('Projects')}>View all projects <span>→</span></button></div><section className="project-table"><div className="table-head"><span>Project</span><span>Status</span><span>Progress</span><span>Members</span><span>Due date</span><span></span></div>{filteredProjects.length ? filteredProjects.map((project) => <div className="project-row" key={project.name}><div className="project-name"><span className={`project-avatar ${project.tone}`}>{project.initials}</span><span><b>{project.name}</b><small>{project.description}</small></span></div><span className={`status ${project.status.toLowerCase().replace(' ', '-')}`}><i></i>{project.status}</span><div className="progress-wrap"><div className="progress-bar"><span style={{ width: `${project.progress}%` }}></span></div><small>{project.progress}%</small></div><div className="member-stack"><span>JD</span><span className="member-two">MK</span><small>+{project.members - 2}</small></div><span className="due-date">{project.due}</span><button className="row-menu" aria-label={`Actions for ${project.name}`} onClick={() => notify(`${project.name} actions opened`)}>•••</button></div>) : <div className="empty-state">No projects match “{search}”.</div>}</section>
          <div className="lower-grid"><section className="panel tasks-panel"><div className="panel-heading"><div><h2>My tasks</h2><p>Tasks that need your attention</p></div><button className="more-button" aria-label="More task options" onClick={() => notify('Task options opened')}>•••</button></div><div className="task-list">{tasks.map((task) => <label className={task.checked ? 'task checked' : 'task'} key={task._id}><input type="checkbox" checked={task.checked} onChange={() => toggleTask(task)} /><span className="checkmark">✓</span><span><b>{task.label}</b><small>{task.project}</small></span><time>{task.due}</time></label>)}</div><button className="panel-link" onClick={() => setActiveNav('My work')}>View all tasks <span>→</span></button></section><section className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Updates from your team</p></div><button className="more-button" aria-label="More activity options" onClick={() => notify('Activity options opened')}>•••</button></div><div className="activity-list">{activity.map((item) => <div className="activity-item" key={item._id}><span className={`activity-avatar ${item.tone}`}>{item.initials}</span><p><b>{item.actor}</b> {item.action} <strong>{item.subject}</strong><small>Recently · {item.detail}</small></p></div>)}</div><button className="panel-link" onClick={() => notify('All activity loaded')}>View all activity <span>→</span></button></section></div>
        </div></main>
      {showProjectForm && <div className="modal-backdrop" onClick={() => setShowProjectForm(false)}><form className="modal" onSubmit={createProject} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" aria-label="Close" onClick={() => setShowProjectForm(false)}>×</button><span className="modal-kicker">NEW PROJECT</span><h2>Start something great</h2><p>Give your new project a name. You can customize the details later.</p><label>Project name<input autoFocus value={newProject} onChange={(event) => setNewProject(event.target.value)} placeholder="e.g. Product launch" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowProjectForm(false)}>Cancel</button><button type="submit" className="primary-button">Create project</button></div></form></div>}
      {showInvite && <div className="modal-backdrop" onClick={() => setShowInvite(false)}><form className="modal invite-modal" onSubmit={sendInvite} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" aria-label="Close" onClick={() => setShowInvite(false)}>×</button><span className="modal-kicker">GROW TOGETHER</span><h2>Invite your team</h2><p>Bring the right people into your workspace.</p><label>Email address<input name="email" type="email" autoFocus required placeholder="name@company.com" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowInvite(false)}>Cancel</button><button type="submit" className="primary-button">Send invite</button></div></form></div>}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </div>
  )
}

export default App

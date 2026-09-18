import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { MongoClient, ObjectId } from 'mongodb'

const app = express()
const port = Number(process.env.PORT || 4000)
const databaseName = process.env.MONGODB_DB || 'northstar'
const mongoUri = process.env.MONGODB_URI
const clients = new Set()
const memory = { projects: [], tasks: [], activity: [] }

const seedProjects = [
  { name: 'Website redesign', initials: 'WR', description: 'Refresh the marketing site and docs', status: 'On track', progress: 72, members: 8, due: '2024-10-24', tone: 'blue' },
  { name: 'Mobile app v2', initials: 'MA', description: 'A faster, more personal mobile experience', status: 'At risk', progress: 48, members: 12, due: '2024-11-02', tone: 'orange' },
  { name: 'Q4 campaign', initials: 'QC', description: 'Launch plan for the holiday campaign', status: 'Planning', progress: 18, members: 5, due: '2024-11-18', tone: 'green' },
]
const seedTasks = [
  { label: 'Review homepage concepts', project: 'Website redesign', checked: false, due: 'Today' },
  { label: 'Share research notes with team', project: 'Mobile app v2', checked: true, due: 'Tomorrow' },
  { label: 'Approve campaign budget', project: 'Q4 campaign', checked: false, due: 'Oct 20' },
]
const seedActivity = [
  { initials: 'MC', tone: 'teal', actor: 'Mia Chen', action: 'completed', subject: 'Design system audit', detail: 'Website redesign' },
  { initials: 'AR', tone: 'coral', actor: 'Alex Rivera', action: 'added a comment to', subject: 'Onboarding flow', detail: 'Mobile app v2' },
  { initials: 'SK', tone: 'yellow', actor: 'Sam Kim', action: 'created a new project', subject: 'Q4 campaign', detail: 'Workspace' },
]

let database = null
let mongoClient = null
const useMemory = !mongoUri

function cleanProject(project) {
  return { ...project, _id: project._id?.toString(), due: project.due instanceof Date ? project.due.toISOString().slice(0, 10) : project.due }
}

async function getCollections() {
  if (!database) return null
  return { projects: database.collection('projects'), tasks: database.collection('tasks'), activity: database.collection('activity') }
}

async function listData() {
  const collections = await getCollections()
  if (!collections) return { projects: memory.projects, tasks: memory.tasks, activity: memory.activity }
  const [projects, tasks, activity] = await Promise.all([
    collections.projects.find({}).sort({ createdAt: 1 }).toArray(),
    collections.tasks.find({}).sort({ createdAt: 1 }).toArray(),
    collections.activity.find({}).sort({ createdAt: -1 }).limit(10).toArray(),
  ])
  return { projects: projects.map(cleanProject), tasks, activity }
}

async function seedDatabase() {
  const collections = await getCollections()
  if (!collections) {
    memory.projects = seedProjects.map((item) => ({ ...item, _id: `demo-${item.initials}` }))
    memory.tasks = seedTasks.map((item, index) => ({ ...item, _id: `task-${index + 1}` }))
    memory.activity = seedActivity.map((item, index) => ({ ...item, _id: `activity-${index + 1}`, createdAt: new Date() }))
    return
  }
  if (await collections.projects.countDocuments() === 0) await collections.projects.insertMany(seedProjects.map((item) => ({ ...item, createdAt: new Date() })))
  if (await collections.tasks.countDocuments() === 0) await collections.tasks.insertMany(seedTasks.map((item) => ({ ...item, createdAt: new Date() })))
  if (await collections.activity.countDocuments() === 0) await collections.activity.insertMany(seedActivity.map((item) => ({ ...item, createdAt: new Date() })))
}

async function broadcast(event, payload) {
  const message = `event: ${event}\\ndata: ${JSON.stringify(payload)}\\n\\n`
  clients.forEach((client) => client.write(message))
}

async function createProject(input) {
  const name = String(input.name || '').trim()
  if (!name) throw new Error('Project name is required')
  const project = { name, initials: name.slice(0, 2).toUpperCase(), description: 'A new space for your team to do great work', status: 'Planning', progress: 0, members: 1, due: 'Set a due date', tone: 'purple', createdAt: new Date() }
  const collections = await getCollections()
  if (collections) { const result = await collections.projects.insertOne(project); return cleanProject({ ...project, _id: result.insertedId }) }
  const saved = { ...project, _id: `project-${Date.now()}` }; memory.projects.push(saved); return saved
}

app.use(cors())
app.use(express.json())
app.get('/api/health', (_request, response) => response.json({ ok: true, database: database ? 'mongodb' : 'memory', timestamp: new Date().toISOString() }))
app.get('/api/dashboard', async (_request, response, next) => { try { response.json(await listData()) } catch (error) { next(error) } })
app.post('/api/projects', async (request, response, next) => { try { const project = await createProject(request.body); await broadcast('project.created', project); response.status(201).json(project) } catch (error) { next(error) } })
app.patch('/api/tasks/:id', async (request, response, next) => {
  try {
    const checked = Boolean(request.body.checked)
    const collections = await getCollections()
    let task
    if (collections && ObjectId.isValid(request.params.id)) { await collections.tasks.updateOne({ _id: new ObjectId(request.params.id) }, { $set: { checked } }); task = await collections.tasks.findOne({ _id: new ObjectId(request.params.id) }) }
    else { task = memory.tasks.find((item) => item._id === request.params.id); if (task) task.checked = checked }
    if (!task) return response.status(404).json({ message: 'Task not found' })
    await broadcast('task.updated', task)
    response.json(task)
  } catch (error) { next(error) }
})
app.post('/api/invitations', async (request, response) => { const email = String(request.body.email || '').trim(); if (!email) return response.status(400).json({ message: 'Email is required' }); await broadcast('invitation.sent', { email }); response.status(201).json({ email, status: 'sent' }) })
app.get('/api/events', async (request, response) => { response.setHeader('Content-Type', 'text/event-stream'); response.setHeader('Cache-Control', 'no-cache'); response.setHeader('Connection', 'keep-alive'); response.flushHeaders?.(); response.write(`event: connected\\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\\n\\n`); clients.add(response); request.on('close', () => clients.delete(response)) })
app.use((error, _request, response, _next) => { console.error(error); response.status(400).json({ message: error instanceof Error ? error.message : 'Request failed' }) })

async function start() {
  if (mongoUri) {
    mongoClient = new MongoClient(mongoUri, { maxPoolSize: 20, minPoolSize: 0, maxIdleTimeMS: 300000, connectTimeoutMS: 10000, serverSelectionTimeoutMS: 5000, socketTimeoutMS: 30000 })
    await mongoClient.connect()
    database = mongoClient.db(databaseName)
  }
  await seedDatabase()
  app.listen(port, () => console.log(`Northstar API listening on http://localhost:${port} (${database ? 'MongoDB' : 'memory'} mode)`))
}
start().catch((error) => { console.error('Unable to start API', error); process.exit(1) })

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5000;
const DB_PATH = path.join(__dirname, 'db.json');

// Safely load local .env file variables manually if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    if (!line || line.trim().startsWith('#')) return;
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

// Initialize Firebase Admin SDK if service account key is present
let firestoreDb = null;
const serviceAccountPath = path.join(__dirname, 'firebase-credentials.json');

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firestoreDb = admin.firestore();
    console.log('Firebase Admin SDK initialized successfully with Cloud Firestore from environment variable!');
  } catch (err) {
    console.error('Failed to initialize Firebase Admin SDK from environment variable:', err);
  }
} else if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firestoreDb = admin.firestore();
    console.log('Firebase Admin SDK initialized successfully with Cloud Firestore from file!');
  } catch (err) {
    console.error('Failed to initialize Firebase Admin SDK from file:', err);
  }
} else {
  console.warn('WARNING: Neither FIREBASE_SERVICE_ACCOUNT environment variable nor firebase-credentials.json was found. Falling back to local db.json.');
}

// Robust Default Seed Jobs List
const defaultJobs = [
  {
    id: 'job-1',
    title: 'Frontend Engineer (React / Next.js)',
    department: 'Frontend',
    location: 'Remote',
    type: 'Full-time',
    experience: '1-3 Years',
    skills: ['React', 'Next.js', 'CSS', 'Tailwind CSS', 'Git'],
    description: 'We are looking for a sharp Frontend Engineer who loves building fast, responsive, and gorgeous web applications. You will own client-facing features from day one.'
  },
  {
    id: 'job-2',
    title: 'Backend Engineer (Node.js / Express)',
    department: 'Backend',
    location: 'Remote',
    type: 'Full-time',
    experience: '2-4 Years',
    skills: ['Node.js', 'Express', 'PostgreSQL', 'MongoDB', 'REST APIs'],
    description: 'Join our team to build scalable APIs, solid databases, and reliable background systems. You will work on real-world integrations and optimize server performances.'
  },
  {
    id: 'job-3',
    title: 'Mobile App Developer (Flutter / React Native)',
    department: 'Mobile',
    location: 'Remote',
    type: 'Full-time',
    experience: '1-3 Years',
    skills: ['Flutter', 'Dart', 'React Native', 'Firebase', 'App Store Deployment'],
    description: 'Build cross-platform mobile apps for iOS and Android. From simple client MVPs to heavy-duty consumer applications, you will handle the entire mobile lifecycle.'
  },
  {
    id: 'job-4',
    title: 'UI/UX Designer & Builder',
    department: 'Design',
    location: 'Remote',
    type: 'Internship',
    experience: 'Freshers / Portfolio Required',
    skills: ['Figma', 'Prototyping', 'Tailwind CSS', 'HTML/CSS'],
    description: 'We need a creative designer who also understands code. You will design clean, high-fidelity prototypes in Figma and help translate them into beautiful frontend interfaces.'
  }
];

const defaultApplications = [];

// Seed local db.json file structure on startup if missing
function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ jobs: defaultJobs, applications: defaultApplications }, null, 2));
    console.log('Local fallback database db.json initialized successfully!');
  }
}

initDB();

function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB:', err);
    return { jobs: defaultJobs, applications: defaultApplications };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing DB:', err);
  }
}

// ─── ROBUST GMAIL SMTP EMAIL DISPATCHER ───
async function sendSmtpEmail(to, subject, text, htmlContent) {
  const smtpPassword = process.env.SMTP_PASSWORD;
  const fromEmail = 'admin.lastbench@gmail.com';

  if (!smtpPassword) {
    console.warn('WARNING: SMTP_PASSWORD is not set in environment variables (.env file). Skipping actual dispatch.');
    console.log('------------------------------------');
    console.log(`[SIMULATED EMAIL DISPATCH]\nTo: ${to}\nSubject: ${subject}\nBody:\n${text}`);
    console.log('------------------------------------');
    return false;
  }

  // Clean the SMTP app password by removing any whitespace
  const cleanPassword = smtpPassword.replace(/\s+/g, '');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: fromEmail,
      pass: cleanPassword
    },
    tls: {
      rejectUnauthorized: false // Bypasses self-signed certificate issues in local Windows environments
    }
  });

  const mailOptions = {
    from: `"Last Bench Software" <${fromEmail}>`,
    to: to,
    subject: subject,
    text: text,
    html: htmlContent || text.replace(/\n/g, '<br>')
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email dispatched successfully via Gmail SMTP to: ${to} (MessageID: ${info.messageId})`);
    return true;
  } catch (emailErr) {
    console.error(`Gmail SMTP email dispatch failed to: ${to}`, emailErr);
    return false;
  }
}

// ─── DATABASE ABSTRACTIONS (Firestore with fully robust db.json fallback) ───
async function getJobs() {
  if (firestoreDb) {
    try {
      const snapshot = await firestoreDb.collection('jobs').get();
      const jobs = [];
      snapshot.forEach(doc => {
        jobs.push({ ...doc.data(), id: doc.id });
      });
      // Sort jobs so that newest are first
      jobs.sort((a, b) => b.id.localeCompare(a.id));
      return jobs;
    } catch (err) {
      console.error('Error fetching jobs from Firestore, falling back to local database:', err.message);
    }
  }
  const db = readDB();
  return db.jobs;
}

async function addJob(newJob) {
  if (!newJob.id) {
    newJob.id = 'job-' + Date.now();
  }
  if (!newJob.skills) newJob.skills = [];
  if (firestoreDb) {
    try {
      await firestoreDb.collection('jobs').doc(newJob.id).set(newJob);
      return newJob;
    } catch (err) {
      console.error('Error saving job to Firestore, falling back to local database:', err.message);
    }
  }
  const db = readDB();
  // Avoid duplicate seeded IDs if already present
  const index = db.jobs.findIndex(j => j.id === newJob.id);
  if (index !== -1) {
    db.jobs[index] = newJob;
  } else {
    db.jobs.unshift(newJob);
  }
  writeDB(db);
  return newJob;
}

async function updateJob(id, updates) {
  let updatedJob = null;
  if (firestoreDb) {
    try {
      const docRef = firestoreDb.collection('jobs').doc(id);
      const doc = await docRef.get();
      if (doc.exists) {
        await docRef.update(updates);
        const updatedDoc = await docRef.get();
        updatedJob = { ...updatedDoc.data(), id };
      }
    } catch (err) {
      console.error('Error updating job in Firestore, falling back to local database:', err.message);
    }
  }

  if (!updatedJob) {
    const db = readDB();
    const index = db.jobs.findIndex(j => j.id === id);
    if (index !== -1) {
      db.jobs[index] = { ...db.jobs[index], ...updates };
      writeDB(db);
      updatedJob = db.jobs[index];
    }
  }
  return updatedJob;
}

async function getUsers() {
  if (firestoreDb) {
    try {
      const snapshot = await firestoreDb.collection('users').get();
      const users = [];
      snapshot.forEach(doc => {
        users.push({ ...doc.data(), id: doc.id });
      });
      return users;
    } catch (err) {
      console.error('Error fetching users from Firestore, falling back to local database:', err.message);
    }
  }
  const db = readDB();
  return db.users || [];
}

async function addUser(user) {
  if (!user.id) {
    user.id = 'user-' + Date.now();
  }
  if (firestoreDb) {
    try {
      await firestoreDb.collection('users').doc(user.id).set(user);
      return user;
    } catch (err) {
      console.error('Error saving user to Firestore, falling back to local database:', err.message);
    }
  }
  const db = readDB();
  if (!db.users) db.users = [];
  db.users.push(user);
  writeDB(db);
  return user;
}


async function getApplications() {
  if (firestoreDb) {
    try {
      const snapshot = await firestoreDb.collection('applications').get();
      const applications = [];
      snapshot.forEach(doc => {
        applications.push({ ...doc.data(), id: doc.id });
      });
      applications.sort((a, b) => (b.appliedDate || b.id).localeCompare(a.appliedDate || a.id));
      return applications;
    } catch (err) {
      console.error('Error fetching applications from Firestore, falling back to local database:', err.message);
    }
  }
  const db = readDB();
  return db.applications;
}

async function addApplication(app) {
  app.id = 'app-' + Date.now();
  app.appliedDate = new Date().toISOString();
  app.status = 'Pending';
  if (!app.resumeName) app.resumeName = 'Resume.pdf';

  // Resolve job title
  const jobs = await getJobs();
  const job = jobs.find(j => j.id === app.jobId);
  app.jobTitle = job ? job.title : 'Speculative Builder Application';

  if (firestoreDb) {
    try {
      await firestoreDb.collection('applications').doc(app.id).set(app);
    } catch (err) {
      console.error('Error saving application to Firestore, falling back to local database:', err.message);
      // Fallback save to local db
      const db = readDB();
      db.applications.unshift(app);
      writeDB(db);
    }
  } else {
    const db = readDB();
    db.applications.unshift(app);
    writeDB(db);
  }

  // ─── Automated Applicant Notification Emails ───
  // 1. Notify Company Admin
  const adminSubject = `New Job Application: ${app.candidateName} - ${app.jobTitle}`;
  const adminText = `Hello Founders,\n\nYou have received a new candidate application on the Last Bench Careers Portal:\n\n` +
                    `Candidate Name: ${app.candidateName}\n` +
                    `Email: ${app.email}\n` +
                    `Mobile Number: ${app.mobile}\n` +
                    `Applied For Role: ${app.jobTitle}\n` +
                    `Resume Filename: ${app.resumeName}\n\n` +
                    `Please log in to the Recruiter Dashboard to review their full profile and download their resume.\n\n` +
                    `Best regards,\nAutomated Recruitment System`;
  
  // 2. Acknowledge Candidate
  const candidateSubject = `We have received your application! - Last Bench Software`;
  const candidateText = `Hello ${app.candidateName},\n\n` +
                        `Thank you for applying for the ${app.jobTitle} position at Last Bench Software!\n\n` +
                        `We wanted to let you know that our engineering founders review all applicant profiles and codebases manually. We do not use automated keyword screeners — we believe in actual code and builders.\n\n` +
                        `If there is a match with our requirements, one of our founders will contact you directly on WhatsApp (+${app.mobile}) or via this email address within 24 hours.\n\n` +
                        `We appreciate your interest in joining the bench!\n\n` +
                        `Best regards,\n` +
                        `Last Bench Engineering Team\n` +
                        `https://lastbench.in`;

  // Dispatch emails asynchronously so HTTP call finishes immediately
  sendSmtpEmail('admin.lastbench@gmail.com', adminSubject, adminText);
  sendSmtpEmail(app.email, candidateSubject, candidateText);

  return app;
}

async function updateApplication(id, updates) {
  let updatedApp = null;
  if (firestoreDb) {
    try {
      const docRef = firestoreDb.collection('applications').doc(id);
      const doc = await docRef.get();
      if (doc.exists) {
        await docRef.update(updates);
        const updatedDoc = await docRef.get();
        updatedApp = { ...updatedDoc.data(), id };
      }
    } catch (err) {
      console.error('Error updating application in Firestore, falling back to local database:', err.message);
    }
  }

  if (!updatedApp) {
    const db = readDB();
    const index = db.applications.findIndex(a => a.id === id);
    if (index !== -1) {
      db.applications[index] = { ...db.applications[index], ...updates };
      writeDB(db);
      updatedApp = db.applications[index];
    }
  }

  // ─── Automated Candidate Status Change Emails ───
  if (updatedApp && updates.status) {
    const status = updates.status;
    let candidateSubject = '';
    let candidateText = '';

    if (status === 'Shortlisted') {
      candidateSubject = `Great News! You have been shortlisted - Last Bench Software`;
      candidateText = `Hello ${updatedApp.candidateName},\n\n` +
                      `Congratulations! Our engineering founders have reviewed your application and shortlisted your profile for the ${updatedApp.jobTitle} position.\n\n` +
                      `One of our founders will reach out to you directly on WhatsApp (${updatedApp.mobile}) or via email within 24 hours to schedule a brief, friendly technical chat.\n\n` +
                      `We are excited to learn more about the code and systems you have built!\n\n` +
                      `Best regards,\n` +
                      `Last Bench Engineering Team`;
    } else if (status === 'Reviewed') {
      candidateSubject = `Application Status Update - Last Bench Software`;
      candidateText = `Hello ${updatedApp.candidateName},\n\n` +
                      `We have successfully reviewed your application for the ${updatedApp.jobTitle} position.\n\n` +
                      `We are currently aligning all qualified developer profiles and our upcoming product release schedule. We will reach out to you within 24-48 hours to inform you of the next steps.\n\n` +
                      `Thank you so much for your patience!\n\n` +
                      `Best regards,\n` +
                      `Last Bench Engineering Team`;
    }

    if (candidateSubject && candidateText) {
      sendSmtpEmail(updatedApp.email, candidateSubject, candidateText);
    }
  }

  return updatedApp;
}

// ─── Automatic Seed Database Trigger ───
async function seedJobsIfEmpty() {
  try {
    const jobs = await getJobs();
    if (!jobs || jobs.length === 0) {
      console.log('Jobs collection empty. Seeding default high-fidelity Last Bench opportunities...');
      for (const job of defaultJobs) {
        await addJob(job);
      }
      console.log('Database successfully seeded with 4 default developer/designer opportunities.');
    } else {
      console.log(`Database seeded already. Found ${jobs.length} active jobs in data layer.`);
    }
  } catch (err) {
    console.error('Failed to trigger database seeding:', err.message);
  }
}

// ─── HTTP ROUTING CONTROLLER ───
export function handleRequest(req, res) {
  // Setup standard headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  console.log(`Incoming request: ${req.method} ${pathname}`);

  if (pathname === '/api/jobs' && req.method === 'GET') {
    getJobs()
      .then(jobs => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(jobs));
      })
      .catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to fetch jobs', details: err.message }));
      });
  } 
  
  else if (pathname === '/api/jobs' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const newJob = JSON.parse(body);
        if (!newJob.title || !newJob.department || !newJob.type) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required fields: title, department, type' }));
          return;
        }
        
        const savedJob = await addJob(newJob);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(savedJob));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload or save error', details: err.message }));
      }
    });
  } 
  
  else if (pathname.startsWith('/api/jobs/') && req.method === 'PUT') {
    const id = pathname.split('/').pop();
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const updates = JSON.parse(body);
        const updatedJob = await updateJob(id, updates);
        
        if (!updatedJob) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Job not found' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(updatedJob));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload or update error', details: err.message }));
      }
    });
  }
  
  else if (pathname === '/api/applications' && req.method === 'GET') {
    getApplications()
      .then(apps => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(apps));
      })
      .catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to fetch applications', details: err.message }));
      });
  } 
  
  else if (pathname === '/api/applications' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const app = JSON.parse(body);
        if (!app.candidateName || !app.email || !app.mobile || !app.jobId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required fields: candidateName, email, mobile, jobId' }));
          return;
        }

        const savedApp = await addApplication(app);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(savedApp));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload or save error', details: err.message }));
      }
    });
  } 
  
  else if (pathname.startsWith('/api/applications/') && req.method === 'PUT') {
    const id = pathname.split('/').pop();
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const updates = JSON.parse(body);
        const updatedApp = await updateApplication(id, updates);
        
        if (!updatedApp) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Application not found' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(updatedApp));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload or update error', details: err.message }));
      }
    });
  } 
  
  else if (pathname === '/api/auth/register' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const user = JSON.parse(body);
        if (!user.email || !user.password || !user.fullName || !user.mobile) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required fields: email, password, fullName, mobile' }));
          return;
        }

        const users = await getUsers();
        const exists = users.some(u => u.email.toLowerCase() === user.email.toLowerCase());
        if (exists) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'An account with this email already exists' }));
          return;
        }

        const savedUser = await addUser(user);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(savedUser));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload or registration error', details: err.message }));
      }
    });
  }

  else if (pathname === '/api/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const credentials = JSON.parse(body);
        if (!credentials.email || !credentials.password) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing email or password' }));
          return;
        }

        const users = await getUsers();
        const matchedUser = users.find(u => 
          u.email.toLowerCase() === credentials.email.toLowerCase() && 
          u.password === credentials.password
        );

        if (!matchedUser) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid email or password' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(matchedUser));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload or login error', details: err.message }));
      }
    });
  }

  else if (pathname === '/api/contact' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const contactReq = JSON.parse(body);
        if (!contactReq.fullName || !contactReq.workEmail) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required fields: fullName, workEmail' }));
          return;
        }

        console.log('--- New Contact Inquiry Received ---');
        console.log('Name:', contactReq.fullName);
        console.log('Email:', contactReq.workEmail);
        console.log('Service Needed:', contactReq.serviceNeeded);
        console.log('Details:', contactReq.projectDetails);
        console.log('------------------------------------');

        const adminSubject = `New Website Inquiry from ${contactReq.fullName}`;
        const adminText = `You have received a new business contact inquiry from Last Bench Website:\n\n` +
                          `Name: ${contactReq.fullName}\n` +
                          `Email: ${contactReq.workEmail}\n` +
                          `Service Needed: ${contactReq.serviceNeeded}\n\n` +
                          `Project Details:\n${contactReq.projectDetails}`;

        const success = await sendSmtpEmail('admin.lastbench@gmail.com', adminSubject, adminText);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (success) {
          res.end(JSON.stringify({ status: 'success', message: 'Inquiry received and email sent successfully via SMTP!' }));
        } else {
          res.end(JSON.stringify({ 
            status: 'success', 
            message: 'Inquiry received successfully! (SMTP skipped in local mode as SMTP_PASSWORD is not set or failing)' 
          }));
        }
      } catch (err) {
        console.error('Contact handler error:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload or handler failure', details: err.message }));
      }
    });
  }

  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }
}

const server = http.createServer(handleRequest);

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`Mock API Server running at http://localhost:${PORT}`);
    // Run automatic seeding logic immediately after startup
    seedJobsIfEmpty();
  });
}

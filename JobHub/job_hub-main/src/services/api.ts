import { createClient } from '@supabase/supabase-js';

// Supabase credentials — MUST be set in .env (see .env.example)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env file. Copy .env.example to .env and fill in your values.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = "/api";

// --- Landing Page Stats (public, cached per browser session) ---
export interface LandingStats {
  studentsPlaced: number;
  companies: number;
  universities: number;
  avgPackageLPA: string;
}

let cachedStats: LandingStats | null = null;

export async function fetchLandingStats(): Promise<LandingStats> {
  // Return cached stats if available (refreshes only on full page reload / new tab)
  if (cachedStats) return cachedStats;

  // Use SECURITY DEFINER RPC functions — no row data is exposed to anon
  const [placedRes, compRes, uniRes, salaryRes] = await Promise.all([
    supabase.rpc('get_placed_students_count'),
    supabase.rpc('get_verified_companies_count'),
    supabase.rpc('get_verified_universities_count'),
    supabase.rpc('get_average_salary_lpa'),
  ]);

  cachedStats = {
    studentsPlaced: Number(placedRes.data) || 0,
    companies: Number(compRes.data) || 0,
    universities: Number(uniRes.data) || 0,
    avgPackageLPA: String(salaryRes.data || "0"),
  };
  return cachedStats;
}

// --- Accept Candidate (company accepts → is_placed = true) ---
export async function acceptCandidate(applicationId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/candidates/${applicationId}/accept`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to accept candidate");
}

export async function rejectCandidate(applicationId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/candidates/${applicationId}/reject`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to reject candidate");
}

// --- Types & Interfaces ---
export type UserRole = "student" | "company" | "university_admin" | "super_admin";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  description: string;
  postedAt: string;
  tags: string[];
  required_skills?: string[];
  department?: string;
  is_off_campus?: boolean;
  target_university_id?: number;
  min_cgpa?: number;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: "applied" | "interviewing" | "selected" | "rejected";
  appliedAt: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  university: string;
  resumeUrl: string;
  appliedAt: string;
  status: "applied" | "pending" | "shortlisted" | "interviewing" | "offered" | "accepted" | "rejected";
  jobId: string;
  jobTitle: string;
  cgpa: number | null;
  skills: string[];
  isOnCampus: boolean | null;
  matchScore: number | null;
}

export interface UniversityDomain {
  id: string;
  domain: string;
  universityName: string;
  verified: boolean;
}

export interface StudentVerification {
  id: string;
  name: string;
  email: string;
  university: string;
  status: "pending" | "verified" | "rejected";
  submittedAt: string;
  resumeUrl?: string;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "banned";
  createdAt: string;
}

export interface AdminVerificationRequest {
  id: string;
  type: "company" | "university";
  name: string;
  email: string;
  domain: string;
  status: "pending" | "approved" | "rejected";
  risk: "Low" | "Medium" | "High";
  createdAt: string;
}

// --- Notifications ---
export interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export async function fetchNotifications(): Promise<Notification[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
}

export async function markNotificationsAsRead(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('profile_id', session.user.id)
    .eq('is_read', false);

  if (error) throw error;
}

// --- Helper: Attach JWT Token to Requests ---
async function getAuthHeaders(includeContentType = true): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: HeadersInit = {};

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return headers;
}

// --- Auth (Supabase Direct) ---
export async function registerUser(email: string, password: string, name: string, role: string, personalEmail?: string, captchaToken?: string) {
  // We pass 'name', 'role', and 'personal_email' as metadata so the database trigger can read them!
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role, personal_email: personalEmail },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      captchaToken,
    },
  });
  if (error) throw error;

  // If a secondary personal email is provided, trigger the backend servlet to send a Welcome Note
  if (personalEmail && personalEmail !== email) {
    try {
      await fetch(`${BASE_URL}/auth/welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryEmail: email, secondaryEmail: personalEmail, name })
      });
    } catch (e) {
      console.error("Failed to ping welcome email servlet:", e);
    }
  }

  return data;
}

export async function loginUser(email: string, password: string, captchaToken?: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: {
      captchaToken,
    },
  });
  if (error) throw error;
  return data;
}

export async function sendPasswordResetEmail(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    // 🚀 CRITICAL: Tell Supabase exactly which page handles the new password!
    redirectTo: `${window.location.origin}/update-password`,
  });

  if (error) throw error;
  return data;
}

// New Helper: Gets the user's role from the database after login
export async function getUserProfile() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No active session");

  // Fetch the role from the profiles table
  // Use .maybeSingle() — RLS may block access for brand-new OAuth users
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profileData) throw new Error("Profile not found");

  // Fetch the name from either students or companies table
  let name = profileData.name || session.user.email?.split('@')[0] || "User";
  const profileNameMissing = !profileData.name || profileData.name.trim() === '';

  if (profileData.role === 'student') {
    const { data } = await supabase.from('students').select('name').eq('profile_id', session.user.id).maybeSingle();
    if (data?.name) name = data.name;

    // Backfill profiles.name for students so public_reviews VIEW shows real names
    if (profileNameMissing && name && name !== session.user.email?.split('@')[0]) {
      supabase.from('profiles').update({ name }).eq('id', session.user.id).then(() => {});
    }
  } else if (profileData.role === 'company') {
    try {
      const { data } = await supabase.from('companies').select('name').eq('profile_id', session.user.id).maybeSingle();
      if (data?.name) name = data.name;
    } catch {
      // Companies table may be blocked by MFA RLS — use profiles.name fallback
    }
  }

  return { ...profileData, name };
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/update-password`,
  });
  if (error) throw error;
}

// Used in-dashboard: re-authenticates with old password before setting new one
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.email) throw new Error("No active session");

  // Step 1: Re-authenticate with the old password to verify identity
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: session.user.email,
    password: oldPassword,
  });
  if (signInError) throw new Error("Old password is incorrect. Please try again.");

  // Step 2: Now update to the new password
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) throw updateError;
}

// Add this new function right below it! We need this to actually save the new password.
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });
  if (error) throw error;
}

export async function updateUserEmail(newEmail: string) {
  const { error } = await supabase.auth.updateUser({
    email: newEmail,
  });
  if (error) throw error;
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// --- Jobs (Backend via Proxy) ---
export async function fetchJobs(): Promise<Job[]> {
  try {
    const res = await fetch(`${BASE_URL}/jobs`, { headers: await getAuthHeaders() });
    if (!res.ok) throw new Error("Backend unavailable");
    return res.json();
  } catch {
    // Fallback: read directly from Supabase when backend is down
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('[fetchJobs] Supabase fallback error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('[fetchJobs] No jobs returned (check RLS policies)');
      return [];
    }

    // Resolve company names from company_id
    const companyIds = [...new Set(data.map(j => j.company_id).filter(Boolean))];
    let companyMap: Record<number, string> = {};
    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds);
      if (companies) {
        companyMap = Object.fromEntries(companies.map(c => [c.id, c.name]));
      }
    }

    return data.map((j: any) => ({
      ...j,
      tags: j.required_skills || j.tags || [],
      company: companyMap[j.company_id] || "Unknown Company",
    }));
  }
}

export async function postJob(data: Partial<Job>): Promise<Job> {
  const res = await fetch(`${BASE_URL}/jobs`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let errorMsg = "Failed to post job";
    try {
      const errBody = await res.json();
      errorMsg = errBody.message || errBody.error || errorMsg;
    } catch {
      const errText = await res.text().catch(() => "");
      if (errText) errorMsg = errText;
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export async function fetchMyPostedJobs(): Promise<Job[]> {
  const res = await fetch(`${BASE_URL}/jobs?my_jobs=true`, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch your jobs");
  return res.json();
}

export async function deleteJob(jobId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });
  if (!res.ok) {
    let errorMsg = "Failed to delete job";
    try {
      const errBody = await res.json();
      errorMsg = errBody.error || errBody.message || errorMsg;
    } catch {
      const errText = await res.text().catch(() => "");
      if (errText) errorMsg = errText;
    }
    throw new Error(errorMsg);
  }
}

export async function applyToJob(jobId: string): Promise<{ message: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No active session");

  // Get student_id from students table
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!student) throw new Error("Student profile not found. Please set up your profile first.");

  // Always check for duplicate BEFORE calling any backend
  const { data: existing } = await supabase
    .from('applications')
    .select('id')
    .eq('job_id', jobId)
    .eq('student_id', student.id)
    .maybeSingle();
  if (existing) throw new Error("You have already applied to this job.");

  try {
    const res = await fetch(`${BASE_URL}/jobs/${jobId}/apply`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Backend unavailable");
    return res.json();
  } catch {
    // Fallback: insert directly via Supabase
    const { error } = await supabase.from('applications').insert({
      job_id: jobId,
      student_id: student.id,
      status: 'Applied',
      applied_via: 'off_campus',
    });
    if (error) throw error;
    return { message: "Application submitted successfully!" };
  }
}

// --- Applications ---
export async function fetchApplications(): Promise<Application[]> {
  try {
    const res = await fetch(`${BASE_URL}/applications`, { headers: await getAuthHeaders() });
    if (!res.ok) throw new Error("Backend unavailable");
    return res.json();
  } catch {
    // Fallback: read from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return [];

    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('profile_id', session.user.id)
      .maybeSingle();
    if (!student) return [];

    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('student_id', student.id)
      .order('applied_at', { ascending: false });
    if (error) return [];

    // Resolve job info + company names
    const jobIds = [...new Set((data || []).map(a => a.job_id).filter(Boolean))];
    let jobMap: Record<number, any> = {};
    if (jobIds.length > 0) {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, company_id, location, type')
        .in('id', jobIds);
      if (jobs) {
        // Also resolve company names
        const companyIds = [...new Set(jobs.map(j => j.company_id).filter(Boolean))];
        let companyMap: Record<number, string> = {};
        if (companyIds.length > 0) {
          const { data: companies } = await supabase.from('companies').select('id, name').in('id', companyIds);
          if (companies) companyMap = Object.fromEntries(companies.map(c => [c.id, c.name]));
        }
        jobMap = Object.fromEntries(jobs.map(j => [j.id, { ...j, companyName: companyMap[j.company_id] || "Unknown Company" }]));
      }
    }

    return (data || []).map((a: any) => ({
      id: String(a.id),
      jobId: String(a.job_id),
      job_id: a.job_id,
      jobTitle: jobMap[a.job_id]?.title || "Unknown Job",
      company: jobMap[a.job_id]?.companyName || "Unknown Company",
      status: a.status?.toLowerCase() || "applied",
      appliedAt: a.applied_at ? new Date(a.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "",
    }));
  }
}

// --- Candidates ---
export async function fetchCandidates(): Promise<Candidate[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.error("[CANDIDATE LOG] No active session.");
      return [];
    }

    const { data: company, error: coErr } = await supabase.from('companies').select('id').eq('profile_id', session.user.id).single();
    if (coErr || !company) {
      console.error("[CANDIDATE LOG] Failed to fetch company profile for user:", session.user.id, coErr);
      return [];
    }

    const { data: companyJobs, error: jobErr } = await supabase.from('jobs').select('id').eq('company_id', company.id);
    if (jobErr) {
      console.error("[CANDIDATE LOG] Failed to fetch jobs for company id:", company.id, jobErr);
    }
    
    const jobIds = companyJobs?.map(j => j.id) || [];
    console.error("[CANDIDATE LOG] Found job IDs for company:", jobIds);
    
    if (jobIds.length === 0) {
      console.error("[CANDIDATE LOG] Company has no jobs, so no candidates can exist.");
      return [];
    }

    const { data, error } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        applied_at,
        match_score,
        jobs (
          id,
          title,
          company_id
        ),
        students (
          id,
          name,
          cgpa,
          skills,
          resume_url,
          is_on_campus,
          profiles (email)
        )
      `)
      .in('job_id', jobIds)
      .order('applied_at', { ascending: false });

    if (error) {
      console.error("[CANDIDATE LOG] Failed to fetch applications:", error);
      throw error;
    }

    console.error("[CANDIDATE LOG] Raw applications data returned:", data);

    return (data || []).map((r: any) => ({
      id: r.id,
      name: r.students?.name || "Unknown",
      email: r.students?.profiles?.email || "",
      university: "Institution",
      resumeUrl: r.students?.resume_url || "",
      appliedAt: new Date(r.applied_at).toLocaleDateString(),
      status: r.status,
      jobId: r.jobs?.id,
      jobTitle: r.jobs?.title,
      cgpa: r.students?.cgpa,
      skills: r.students?.skills || [],
      isOnCampus: r.students?.is_on_campus,
      matchScore: r.match_score
    }));
  } catch (err: any) {
    console.error("[CANDIDATE LOG] Uncaught error in fetchCandidates:", err);
    throw err;
  }
}

export async function updateCandidateStatus(id: string, status: Candidate["status"]): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/candidates/${id}/status`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update candidate");
  return res.json();
}

// --- Company Features ---

export async function sendInterviewEmail(candidateId: string, details: {
  date: string;
  time: string;
  mode: string;
  meetLink?: string;
  venue?: string;
  level: string;
  description: string;
  message: string;
}) {
  const res = await fetch(`${BASE_URL}/company/schedule-interview`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      candidateId,
      ...details
    }),
  });
  if (!res.ok) throw new Error("Failed to send interview email");
  return res.json();
}

// --- University ---
export async function fetchDomains(): Promise<UniversityDomain[]> {
  const res = await fetch(`${BASE_URL}/university/domains`, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch domains");
  return res.json();
}

export async function fetchStudentVerifications(): Promise<StudentVerification[]> {
  const res = await fetch(`${BASE_URL}/university/verifications`, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch verifications");
  return res.json();
}

export async function fetchPlacementAnalytics(): Promise<any> {
  const res = await fetch(`${BASE_URL}/university/analytics`, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

export async function addDomain(domain: string, universityName: string): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/university/domains`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ domain, universityName }),
  });
  if (!res.ok) throw new Error("Failed to add domain");
  return res.json();
}

// --- Admin ---
export interface AdminVerificationRequest {
  id: string;
  type: "company" | "university";
  name: string;
  email: string;
  domain: string;
  status: "pending" | "approved" | "rejected";
  risk: "Low" | "Medium" | "High";
  createdAt: string;
}

export async function fetchUsers(): Promise<SystemUser[]> {
  const res = await fetch(`${BASE_URL}/admin/users`, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function fetchAdminVerificationRequests(): Promise<AdminVerificationRequest[]> {
  try {
    const res = await fetch(`${BASE_URL}/admin/verifications`, { headers: await getAuthHeaders() });
    if (!res.ok) throw new Error("Failed to fetch verification requests");
    return await res.json();
  } catch (error) {
    // Fallback directly to Supabase since backend API seems to be unavailable
    const { data: companies, error: compErr } = await supabase
      .from('companies')
      .select('id, name, risk_level, is_verified_by_admin, profiles(email, created_at)');

    const { data: universities, error: uniErr } = await supabase
      .from('university_domains')
      .select('id, university_name, domain_name, risk_level, is_verified');

    if (compErr || uniErr) throw new Error("Failed to fetch verifications");

    const requests: AdminVerificationRequest[] = [];

    (companies || []).forEach((c: any) => {
      requests.push({
        id: `c_${c.id}`,
        type: "company",
        name: c.name || "Unknown Company",
        email: c.profiles?.email || "No Email",
        domain: "N/A", // Domain is usually not natively stored cleanly per company in this schema, so we fallback
        status: c.is_verified_by_admin ? "approved" : "pending",
        risk: c.risk_level || "Medium",
        createdAt: c.profiles?.created_at || new Date().toISOString(),
      });
    });

    (universities || []).forEach((u: any) => {
      requests.push({
        id: `u_${u.id}`,
        type: "university",
        name: u.university_name || "Unknown University",
        email: "admin@" + (u.domain_name || "university.edu"),
        domain: u.domain_name || "N/A",
        status: u.is_verified ? "approved" : "pending",
        risk: u.risk_level || "Low",
        createdAt: new Date().toISOString(),
      });
    });

    return requests;
  }
}

export async function updateAdminVerificationStatus(id: string, status: "approved" | "rejected" | "pending"): Promise<{ message: string }> {
  try {
    const res = await fetch(`${BASE_URL}/admin/verifications/${id}/status`, {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update status");
    return await res.json();
  } catch (error) {
    // Fallback direct update to Supabase
    const isCompany = id.startsWith('c_');
    const realId = parseInt(id.substring(2));
    const isVerified = status === 'approved';

    if (isCompany) {
      const { error: err } = await supabase.from('companies').update({ is_verified_by_admin: isVerified }).eq('id', realId);
      if (err) throw err;
    } else {
      const { error: err } = await supabase.from('university_domains').update({ is_verified: isVerified }).eq('id', realId);
      if (err) throw err;
    }
    return { message: "Updated successfully" };
  }
}

export async function runAdminAutoVerify(): Promise<{ message: string }> {
  try {
    const res = await fetch(`${BASE_URL}/admin/verifications/auto-verify`, {
      method: "POST",
      headers: await getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to run auto-verify algorithm");
    return await res.json();
  } catch (error) {
    console.warn("Auto-verify API failed, simulating auto-verify fallback");
    // Pseudo auto-verify logic for fallback: Verify all low-risk items
    const { data: companies } = await supabase.from('companies').select('id, risk_level').eq('is_verified_by_admin', false);
    if (companies) {
      const toApprove = companies.filter(c => c.risk_level === 'Low').map(c => c.id);
      if (toApprove.length > 0) {
        await supabase.from('companies').update({ is_verified_by_admin: true }).in('id', toApprove);
      }
    }
    const { data: domains } = await supabase.from('university_domains').select('id, risk_level').eq('is_verified', false);
    if (domains) {
      const toApprove = domains.filter(d => d.risk_level === 'Low').map(d => d.id);
      if (toApprove.length > 0) {
        await supabase.from('university_domains').update({ is_verified: true }).in('id', toApprove);
      }
    }
    return { message: "Simulated auto-verify algorithm applied" };
  }
}

export async function banUser(id: string): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/admin/users/${id}/ban`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to ban user");
  return res.json();
}

export async function deleteUser(id: string): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/admin/users/${id}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete user");
  return res.json();
}

export async function fetchSystemLogs(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/admin/logs`, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch logs");
  return res.json();
}

export async function toggleRegistration(enabled: boolean): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL} / admin / settings / registration`, {
    method: "PATCH",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error("Failed to toggle registration");
  return res.json();
}

export async function fetchAdminAnalytics(): Promise<any> {
  const res = await fetch(`${BASE_URL}/admin/analytics`, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

// Fetch pending approvals
export async function fetchPendingVerifications() {
  // Get high-risk or pending companies
  const { data: companies, error: compErr } = await supabase
    .from('companies')
    .select('id, name, risk_level, risk_reason, profiles(email, created_at)')
    .eq('is_verified_by_admin', false);


  const { data: universities, error: uniErr } = await supabase
    .from('university_domains')
    .select('id, university_name, domain_name, risk_level')
    .eq('is_verified', false);

  if (compErr || uniErr) throw new Error("Failed to fetch verifications");
  return { companies: companies || [], universities: universities || [] };
}

export async function approveEntity(type: 'company' | 'university', id: number) {
  if (type === 'company') {
    const { error } = await supabase.from('companies').update({ is_verified_by_admin: true }).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('university_domains').update({ is_verified: true }).eq('id', id);
    if (error) throw error;
  }
}


export async function uploadResume(file: File): Promise<{ url: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No active session");
  const userId = session.user.id;
  const ext = file.name.split('.').pop();
  const filePath = `${userId}/resume.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('resumes')
    .upload(filePath, file, { upsert: true });
  if (uploadError) throw uploadError;


  const { data } = await supabase.storage
    .from('resumes')
    .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10);

  if (!data?.signedUrl) throw new Error("Failed to generate access URL");


  const res = await fetch(`${BASE_URL}/profile/resume`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ url: data.signedUrl })
  });

  return { url: data.signedUrl };
}


export async function updateUserName(name: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No active session");
  const userId = session.user.id;


  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (!profile) throw new Error("Profile not found");

  const tableMap: Record<string, string> = {
    student: 'students',
    company: 'companies',
    university_admin: 'universities',
  };
  const table = tableMap[profile.role];
  if (table) {
    const { error } = await supabase.from(table).update({ name }).eq('profile_id', userId);

  }

  const { error: profileError } = await supabase.from('profiles').update({ name }).eq('id', userId);
  if (profileError) console.error("Could not update name in profiles table:", profileError);


  await supabase.auth.updateUser({ data: { name } });
}

export async function uploadProfileAvatar(file: File): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No active session");
  const userId = session.user.id;
  const ext = file.name.split('.').pop();
  const filePath = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

  const { error: dbError } = await supabase
    .from('profiles')
    .update({ avatar_url: data.publicUrl })
    .eq('id', userId);

  if (dbError) throw dbError;
  return data.publicUrl;
}

export async function deleteProfileAvatar(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No active session");
  const userId = session.user.id;

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId);

  if (error) throw error;
}


export interface StudentProfile {
  cgpa: number | null;
  skills: string[];
  resume_url: string | null;
  is_on_campus: boolean | null;
  name: string;
  roll_no: string | null;
}

export async function fetchStudentProfile(): Promise<StudentProfile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data, error } = await supabase
    .from('students')
    .select('cgpa, skills, resume_url, is_on_campus, name, roll_no')
    .eq('profile_id', session.user.id)
    .single();

  if (error) {
    console.error("Error fetching student profile:", error);
    return null;
  }

  return {
    cgpa: data.cgpa,
    skills: data.skills || [],
    resume_url: data.resume_url,
    is_on_campus: data.is_on_campus,
    name: data.name || '',
    roll_no: data.roll_no,
  };
}

export async function updateStudentProfile(updates: {
  cgpa?: number | null;
  skills?: string[];
  resume_url?: string | null;
  is_on_campus?: boolean | null;
}): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No active session");

  const { error } = await supabase
    .from('students')
    .update(updates)
    .eq('profile_id', session.user.id);

  if (error) throw error;
}

export async function clearStudentProfile(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No active session");

  const { error } = await supabase
    .from('students')
    .update({
      cgpa: null,
      skills: null,
      resume_url: null,
      is_on_campus: null,
    })
    .eq('profile_id', session.user.id);

  if (error) throw error;
}

export interface ReviewData {
  id: string;
  author: string;
  profile_id?: string;
  role: string;
  avatar_url?: string;
  content: string;
  rating: number;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  admin_reply?: string;
  admin_replied_at?: string;
  is_author_banned?: boolean;
}

export async function submitReview(content: string, rating: number): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No active session");

  const { error } = await supabase.from('reviews').insert({
    profile_id: session.user.id,
    review_text: content,
    rating,
    is_approved: false,
  });
  if (error) throw error;
}

export async function fetchMyReviews(): Promise<ReviewData[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      review_text,
      is_approved,
      created_at,
      profile_id,
      profiles (
        name,
        role,
        avatar_url
      )
    `)
    .eq('profile_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    profile_id: r.profile_id,
    author: r.profiles?.name || "You",
    role: r.profiles?.role || "user",
    avatar_url: r.profiles?.avatar_url,
    content: r.review_text,
    rating: r.rating,
    status: r.is_approved ? 'approved' : 'pending',
    date: new Date(r.created_at).toLocaleDateString(),
  }));
}

export async function fetchAdminReviews(): Promise<ReviewData[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      review_text,
      is_approved,
      created_at,
      profile_id,
      admin_reply,
      admin_replied_at,
      profiles (
        name,
        email,
        role,
        avatar_url,
        is_review_banned
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    profile_id: r.profile_id,
    author: r.profiles?.name || r.profiles?.email?.split('@')[0] || "Anonymous",
    role: r.profiles?.role || "user",
    avatar_url: r.profiles?.avatar_url,
    content: r.review_text,
    rating: r.rating,
    status: r.is_approved ? 'approved' : 'pending',
    date: new Date(r.created_at).toLocaleDateString(),
    admin_reply: r.admin_reply || undefined,
    admin_replied_at: r.admin_replied_at ? new Date(r.admin_replied_at).toLocaleDateString() : undefined,
    is_author_banned: r.profiles?.is_review_banned || false,
  }));
}

export async function updateReviewStatus(id: string, status: 'approved' | 'rejected'): Promise<void> {
  const { error } = await supabase.rpc('rpc_admin_update_review', {
    target_id: id,
    target_status: status === 'approved'
  });
  if (error) throw error;
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from('reviews').delete().eq('id', id);
  if (error) throw error;
}

export async function adminDeleteReview(reviewId: string, authorId: string): Promise<void> {
  const { error } = await supabase.rpc('rpc_admin_delete_review', {
    target_id: reviewId
  });
  if (error) throw error;


  if (authorId) {
    await supabase.from('notifications').insert({
      profile_id: authorId,
      title: "Review Removed",
      message: "Admin has reviewed your comment and removed it due to a violation of our code of ethics.",
      is_read: false
    });
  }
}

export async function banReviewUser(profileId: string): Promise<void> {
  if (!profileId) throw new Error("Missing profile ID");


  const bannedUntil = new Date(Date.now() + 42 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.rpc('rpc_ban_user', {
    target_profile_id: profileId,
    ban_until: bannedUntil
  });

  if (error) throw error;


  await supabase.from('notifications').insert({
    profile_id: profileId,
    title: "Account Restricted",
    message: "You have been temporarily banned from writing reviews for 42 hours due to multiple community violations.",
    is_read: false
  });
}

export async function unbanReviewUser(profileId: string): Promise<void> {
  if (!profileId) throw new Error("Missing profile ID");

  const { error } = await supabase.rpc('rpc_unban_user', {
    target_profile_id: profileId
  });

  if (error) throw error;

  await supabase.from('notifications').insert({
    profile_id: profileId,
    title: "Account Unrestricted",
    message: "Your review ban has been lifted. You can now post reviews again. Please adhere to the community guidelines.",
    is_read: false
  });
}

export async function fetchBannedUsers(): Promise<any[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, avatar_url, is_review_banned, banned_until')
    .eq('is_review_banned', true);

  if (error) throw error;
  return data || [];
}


export async function fetchMyNotifications() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
  return data || [];
}

export async function markNotificationsRead() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('profile_id', session.user.id)
    .eq('is_read', false);

  if (error) console.error("Error marking notifications as read:", error);
}

export async function dismissNotification(id: string) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);

  if (error) console.error("Error dismissing notification:", error);
}

export async function fetchApprovedReviews(): Promise<ReviewData[]> {
  // Uses the public_reviews VIEW — no profile UUIDs exposed
  const { data, error } = await supabase
    .from('public_reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching approved reviews:", error);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.review_id,
    author: r.author_name || "Anonymous",
    role: r.author_role || "user",
    avatar_url: r.author_avatar_url,
    content: r.review_text,
    rating: r.rating,
    status: 'approved' as const,
    date: new Date(r.created_at).toLocaleDateString(),
    admin_reply: r.admin_reply || undefined,
    admin_replied_at: r.admin_replied_at ? new Date(r.admin_replied_at).toLocaleDateString() : undefined,
  }));
}

export async function fetchReviews(): Promise<ReviewData[]> {
  return fetchApprovedReviews();
}

// Paginated public reviews with optional category filter
export type ReviewCategory = 'all' | 'critical' | 'good' | 'better' | 'best';

export async function fetchPublicReviewsPaginated(
  category: ReviewCategory = 'all',
  page: number = 0,
  pageSize: number = 12
): Promise<{ reviews: ReviewData[]; total: number }> {
  let query = supabase
    .from('public_reviews')
    .select('*', { count: 'exact' });

  // Apply category filter
  switch (category) {
    case 'critical': query = query.lte('rating', 1); break;
    case 'good': query = query.gte('rating', 2).lte('rating', 3); break;
    case 'better': query = query.eq('rating', 4); break;
    case 'best': query = query.eq('rating', 5); break;
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching paginated reviews:", error);
    return { reviews: [], total: 0 };
  }

  const reviews = (data || []).map((r: any) => ({
    id: r.review_id,
    author: r.author_name || "Anonymous",
    role: r.author_role || "user",
    avatar_url: r.author_avatar_url,
    content: r.review_text,
    rating: r.rating,
    status: 'approved' as const,
    date: new Date(r.created_at).toLocaleDateString(),
    admin_reply: r.admin_reply || undefined,
    admin_replied_at: r.admin_replied_at ? new Date(r.admin_replied_at).toLocaleDateString() : undefined,
  }));

  return { reviews, total: count || 0 };
}

// Admin reply to a review + send notification to the author
export async function replyToReview(reviewId: string, replyText: string): Promise<void> {
  const { data: reviewData } = await supabase
    .from('reviews')
    .select('profile_id')
    .eq('id', reviewId)
    .single();

  const { error } = await supabase.rpc('rpc_reply_to_review', {
    target_id: reviewId,
    reply_text: replyText,
    replied_at: new Date().toISOString()
  });

  if (error) throw error;

  // Send notification to the review author
  if (reviewData?.profile_id) {
    await supabase.from('notifications').insert({
      profile_id: reviewData.profile_id,
      title: 'Admin Replied to Your Review 💬',
      message: `An admin has reviewed your feedback and replied: "${replyText.substring(0, 100)}${replyText.length > 100 ? '...' : ''}"`,
      is_read: false,
    });
  }
}

// === MFA (Multi-Factor Authentication) === //

// Roles that require MFA to access the dashboard
const MFA_REQUIRED_ROLES: string[] = ['super_admin', 'university_admin', 'company'];

export function roleRequiresMFA(role: string): boolean {
  return MFA_REQUIRED_ROLES.includes(role);
}

// Check the current session's Authenticator Assurance Level
export async function getMFAStatus(): Promise<{
  currentLevel: string;
  nextLevel: string;
  isEnrolled: boolean;
  isVerified: boolean;
}> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;

  return {
    currentLevel: data.currentLevel || 'aal1',
    nextLevel: data.nextLevel || 'aal1',
    isEnrolled: data.nextLevel === 'aal2',      // factor exists
    isVerified: data.currentLevel === 'aal2',    // factor verified this session
  };
}

// Step 1 of enrollment: Create a new TOTP factor and get the QR URI
export async function mfaEnroll(role?: string): Promise<{
  factorId: string;
  qrCodeUri: string;
  qrCodeSvg: string;
  secret: string;
}> {
  let appName = 'JobHub Authenticator';
  let issuerLabel = 'JobHub';

  if (role === 'super_admin') {
    appName = 'JobHub Super Admin Auth';
    issuerLabel = 'JobHub+Super+Admin';
  } else if (role === 'company') {
    appName = 'JobHub Company Auth';
    issuerLabel = 'JobHub+Company';
  } else if (role === 'university_admin') {
    appName = 'JobHub University Auth';
    issuerLabel = 'JobHub+University';
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: appName,
  });
  if (error) throw error;

  // Post-process the TOTP URI to replace the default issuer with our role-specific one
  // URI format: otpauth://totp/ISSUER:EMAIL?secret=...&issuer=ISSUER
  let uri = data.totp.uri || "";
  if (uri && issuerLabel !== 'JobHub') {
    uri = uri
      .replace(/otpauth:\/\/totp\/[^:]*:/, `otpauth://totp/${issuerLabel}:`)
      .replace(/issuer=[^&]*/, `issuer=${issuerLabel}`);
  }

  return {
    factorId: data.id,
    qrCodeUri: uri,
    qrCodeSvg: "", // Force client-side QR rendering from the corrected URI
    secret: data.totp.secret,
  };
}

// Step 2 of enrollment / login: Create a challenge for verification
export async function mfaChallenge(factorId: string): Promise<string> {
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error) throw error;
  return data.id; // challengeId
}

// Step 3: Verify the TOTP code against the challenge
export async function mfaVerify(
  factorId: string,
  challengeId: string,
  code: string
): Promise<void> {
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });
  if (error) throw error;

  // Force refresh the session so JWT gets the aal2 claim
  await supabase.auth.refreshSession();
}

// Get the user's enrolled TOTP factors
export async function getMFAFactors(): Promise<Array<{ id: string; name: string; status: string }>> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;

  return (data?.totp || []).map((f: any) => ({
    id: f.id,
    name: f.friendly_name || 'Authenticator',
    status: f.status,
  }));
}

// Remove a TOTP factor (admin self-reset or super_admin managing others)
export async function mfaUnenroll(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}


// === OAUTH === //
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  });
  if (error) throw error;
  return data;
}

export async function signInWithGitHub() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  });
  if (error) throw error;
  return data;
}

export async function signInWithLinkedIn() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  });
  if (error) throw error;
  return data;
}

export async function completeOAuthProfile(role: string, linkedinUrl?: string, orgName?: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No active session");
  const userId = session.user.id;
  const email = session.user.email || "";
  const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || email.split('@')[0];
  const avatarUrl = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null;
  const githubUsername = session.user.user_metadata?.user_name || session.user.user_metadata?.preferred_username || null;

  // For company/university roles, use the orgName as the profile name
  const profileName = (role === 'company' || role === 'university_admin') ? (orgName || name) : name;

  // Check if profile exists already (trigger may have auto-created it)
  const { data: existing } = await supabase.from('profiles').select('id, role').eq('id', userId).maybeSingle();

  if (!existing) {
    // Create new profile — orgName goes straight into profiles.name
    const { error: insertError } = await supabase.from('profiles').insert({
      id: userId,
      email,
      role,
      avatar_url: avatarUrl,
      github_username: githubUsername,
      linkedin_url: linkedinUrl || null,
      name: profileName,
    });
    if (insertError) throw new Error("Profile Insert Failed: " + insertError.message);
  } else {
    // Profile exists — update role + name + OAuth metadata
    const updates: any = { role, name: profileName };
    if (avatarUrl) updates.avatar_url = avatarUrl;
    if (githubUsername) updates.github_username = githubUsername;
    if (linkedinUrl) updates.linkedin_url = linkedinUrl;

    const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (updateError) throw updateError;
  }

  // Only create role-specific records for students and universities
  // Companies table gets populated later via OrgProfile page (avoids MFA/RLS issues)
  if (role === 'student') {
    const { data: stuExists } = await supabase.from('students').select('id').eq('profile_id', userId).maybeSingle();
    if (!stuExists) {
      await supabase.from('students').insert({ profile_id: userId, name });
    }
  } else if (role === 'university_admin') {
    const domainStr = email.split('@')[1] || "unknown.edu";
    const { data: uni } = await supabase.from('universities').select('id').eq('domain_name', domainStr).maybeSingle();
    if (!uni) {
      await supabase.from('universities').insert({ profile_id: userId, university_name: orgName || name, domain_name: domainStr });
    }
  }
  // company role: orgName is already saved in profiles.name — companies row created on first OrgProfile save
}

// === GITHUB REPOS === //
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
}

export async function fetchGitHubRepos(username: string): Promise<GitHubRepo[]> {
  if (!username) return [];
  try {
    const res = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function updateGitHubUsername(username: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No active session");
  const { error } = await supabase.from('profiles').update({ github_username: username }).eq('id', session.user.id);
  if (error) throw error;
}

export async function updateLinkedInUrl(url: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No active session");
  const { error } = await supabase.from('profiles').update({ linkedin_url: url }).eq('id', session.user.id);
  if (error) throw error;
}

// === RESUME SCORING === //
export interface ScoringResult {
  match_percentage: number;
  matched: string[];
  missing: string[];
}

export async function scoreResumeAgainstJob(jobId: string): Promise<ScoringResult> {
  const res = await fetch(`${BASE_URL}/score/${jobId}`, {
    method: "POST",
    headers: await getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Scoring failed" }));
    throw new Error(err.error || "Scoring failed");
  }
  return res.json();
}

// === ORGANIZATION PROFILES === //
export interface CompanyProfile {
  id: number;
  name: string;
  description: string | null;
  website: string | null;
  location: string | null;
  team_size: string | null;
  specializations: string[] | null;
  founded_year: number | null;
  is_verified_by_admin: boolean;
  github_username?: string | null;
}

export interface UniversityProfile {
  id: number;
  university_name: string;
  description: string | null;
  location: string | null;
  website: string | null;
  accreditation: string | null;
  student_count: number | null;
  specializations: string[] | null;
  github_username: string | null;
  is_verified: boolean;
}

export async function fetchMyCompanyProfile(): Promise<CompanyProfile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data } = await supabase.from('companies').select('*').eq('profile_id', session.user.id).single();
  return data;
}

export async function updateCompanyProfile(updates: Partial<CompanyProfile>): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No active session");

  // Try update first — may fail due to RLS if not verified yet, that's OK
  const { data, error } = await supabase.from('companies').update(updates).eq('profile_id', session.user.id).select();

  if (!error && data && data.length > 0) {
    // Update succeeded — we're done
    return;
  }

  // If update returned 0 rows (no existing row) or RLS blocked it, try creating the row
  if (!updates.name) throw new Error("Organization Name is required to initialize profile.");

  // Attempt 1: Use the SECURITY DEFINER RPC to bypass RLS
  try {
    const { error: rpcErr } = await supabase.rpc('secure_create_company', {
      p_profile_id: session.user.id,
      p_name: updates.name
    });
    if (!rpcErr) {
      // RPC succeeded — now update with the remaining fields
      const { name, ...rest } = updates;
      if (Object.keys(rest).length > 0) {
        // Use RPC or direct update; if RLS blocks update, that's fine — base row exists now
        await supabase.from('companies').update(rest).eq('profile_id', session.user.id);
      }
      return;
    }
    console.warn("secure_create_company RPC failed:", rpcErr.message);
  } catch (e) {
    console.warn("secure_create_company RPC not available:", e);
  }

  // Attempt 2: Direct INSERT (works if RLS allows insert for authenticated users)
  const insertPayload: any = {
    profile_id: session.user.id,
    name: updates.name,
    is_verified_by_admin: false,
  };
  if (updates.description) insertPayload.description = updates.description;
  if (updates.website) insertPayload.website = updates.website;
  if (updates.location) insertPayload.location = updates.location;
  if (updates.team_size) insertPayload.team_size = updates.team_size;
  if (updates.specializations) insertPayload.specializations = updates.specializations;
  if (updates.founded_year) insertPayload.founded_year = updates.founded_year;

  const { error: insertErr } = await supabase.from('companies').insert(insertPayload);
  if (insertErr) throw new Error("Failed to create company profile: " + insertErr.message);
}

export async function fetchMyUniversityProfile(): Promise<UniversityProfile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data } = await supabase.from('universities').select('*').eq('profile_id', session.user.id).single();
  return data;
}

export async function updateUniversityProfile(updates: Partial<UniversityProfile>): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No active session");
  const { data: existing } = await supabase.from('universities').select('id').eq('profile_id', session.user.id).single();
  if (existing) {
    const { error } = await supabase.from('universities').update(updates).eq('profile_id', session.user.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('universities').insert({ ...updates, profile_id: session.user.id });
    if (error) throw error;
  }
}

export async function fetchAllCompanies(): Promise<CompanyProfile[]> {
  const { data, error } = await supabase.from('companies').select('*').eq('is_verified_by_admin', true).order('name');
  if (error) throw error;
  return data || [];
}

export async function fetchAllUniversities(): Promise<UniversityProfile[]> {
  const { data, error } = await supabase.from('universities').select('*, name:university_name').eq('is_verified', true).order('university_name');
  if (error) throw error;
  return data || [];
}

// === PLACEMENT REQUESTS === //
export interface PlacementRequest {
  id: number;
  from_university_id: number;
  to_company_id: number;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  university_name?: string;
  company_name?: string;
}

export async function sendPlacementRequest(toCompanyId: number, message: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No active session");

  const { data: uni } = await supabase.from('universities').select('id').eq('profile_id', session.user.id).single();
  if (!uni) throw new Error("University profile not found");

  const { error } = await supabase.from('placement_requests').insert({
    from_university_id: uni.id,
    to_company_id: toCompanyId,
    message,
  });
  if (error) throw error;

  // Notify company
  const { data: comp } = await supabase.from('companies').select('profile_id').eq('id', toCompanyId).single();
  if (comp) {
    await supabase.from('notifications').insert({
      profile_id: comp.profile_id,
      title: "Placement Camp Request",
      message: `A university has requested you to start a placement camp. Check your Browse Organizations page.`,
      is_read: false,
    });
  }
}

export async function fetchPlacementRequests(): Promise<PlacementRequest[]> {
  const { data, error } = await supabase.from('placement_requests')
    .select('*, universities(name), companies(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    ...r,
    university_name: r.universities?.name,
    company_name: r.companies?.name,
  }));
}

export async function respondToPlacementRequest(id: number, status: 'accepted' | 'declined'): Promise<void> {
  const { data: req } = await supabase.from('placement_requests').select('from_university_id').eq('id', id).single();

  const { error } = await supabase.from('placement_requests').update({ status }).eq('id', id);
  if (error) throw error;

  // Notify university
  if (req) {
    const { data: uni } = await supabase.from('universities').select('profile_id').eq('id', req.from_university_id).single();
    if (uni) {
      await supabase.from('notifications').insert({
        profile_id: uni.profile_id,
        title: `Placement Request ${status === 'accepted' ? 'Accepted' : 'Declined'}`,
        message: `Your placement camp request has been ${status}.`,
        is_read: false,
      });
    }
  }
}
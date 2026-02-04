/**
 * PowerSchool Integration Service
 * Handles OAuth authentication and grade publishing to PowerSchool via custom API
 */

import { prisma } from './db';
import { env } from '$env/dynamic/private';

// Configuration from environment
const POWERSCHOOL_API_URL = env.POWERSCHOOL_API_URL || '';
const POWERSCHOOL_CLIENT_ID = env.POWERSCHOOL_CLIENT_ID || '';
const POWERSCHOOL_CLIENT_SECRET = env.POWERSCHOOL_CLIENT_SECRET || '';
const POWERSCHOOL_DISABLED = env.POWERSCHOOL_DISABLED === 'true';

export interface PowerSchoolConfig {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  isConfigured: boolean;
  isDisabled: boolean;
}

export function getConfig(): PowerSchoolConfig {
  return {
    apiUrl: POWERSCHOOL_API_URL,
    clientId: POWERSCHOOL_CLIENT_ID,
    clientSecret: POWERSCHOOL_CLIENT_SECRET,
    isConfigured: !!(POWERSCHOOL_API_URL && POWERSCHOOL_CLIENT_ID && POWERSCHOOL_CLIENT_SECRET) && !POWERSCHOOL_DISABLED,
    isDisabled: POWERSCHOOL_DISABLED
  };
}

/**
 * Build redirect URI from request origin
 */
export function getRedirectUri(origin: string): string {
  return `${origin}/api/powerschool/callback`;
}

export interface TeacherInfo {
  name: string;
  id: string;
  email?: string;
}

export interface PowerSchoolSection {
  id: number;
  name: string;
  course_name?: string;
  course_number?: string;
  period?: string;
  room?: string;
  term?: string;
}

export interface PowerSchoolCategory {
  id: number;
  name: string;
  color?: string;
  default_points?: number;
}

export interface PowerSchoolStudent {
  id: number;
  dcid?: number;
  student_number?: string;
  first_name: string;
  last_name: string;
  name: string;
  email?: string;
  grade_level?: number;
}

/**
 * Generate OAuth authorization URL
 */
export function getAuthorizationUrl(state: string, origin: string): string {
  const config = getConfig();
  if (!config.isConfigured) {
    throw new Error('PowerSchool integration not configured');
  }

  const scopes = [
    'teacher.profile',
    'teacher.classes',
    'teacher.students',
    'teacher.assignments',
    'teacher.assignments.write',
    'teacher.grades'
  ].join(' ');

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: getRedirectUri(origin),
    response_type: 'code',
    scope: scopes,
    state: state
  });

  return `${config.apiUrl}/oauth/teacher/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string, origin: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}> {
  const config = getConfig();
  const redirectUri = getRedirectUri(origin);
  
  console.log('Exchanging code for tokens with redirect_uri:', redirectUri);
  
  const response = await fetch(`${config.apiUrl}/oauth/teacher/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token exchange failed:', response.status, errorText);
    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      error = { error: errorText };
    }
    throw new Error(error.message || error.error || 'Failed to exchange code for tokens');
  }

  return response.json();
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const config = getConfig();
  
  const response = await fetch(`${config.apiUrl}/oauth/teacher/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret
    })
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return response.json();
}

/**
 * Make authenticated API request to PowerSchool
 */
async function apiRequest<T>(
  userId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getConfig();
  
  // Get user's token
  let token = await prisma.powerSchoolToken.findUnique({
    where: { userId }
  });

  if (!token) {
    throw new Error('PowerSchool not connected. Please connect your account first.');
  }

  // Check if token needs refresh
  if (new Date() >= token.expiresAt) {
    try {
      const refreshed = await refreshAccessToken(token.refreshToken);
      
      token = await prisma.powerSchoolToken.update({
        where: { userId },
        data: {
          accessToken: refreshed.access_token,
          expiresAt: new Date(Date.now() + refreshed.expires_in * 1000)
        }
      });
    } catch (error) {
      // Token refresh failed, delete the token and require re-auth
      await prisma.powerSchoolToken.delete({ where: { userId } });
      throw new Error('PowerSchool session expired. Please reconnect your account.');
    }
  }

  const response = await fetch(`${config.apiUrl}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'API request failed' }));
    throw new Error(error.message || error.error || `API request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get teacher profile
 */
export async function getTeacherProfile(userId: string): Promise<TeacherInfo> {
  const data = await apiRequest<{ name: string; first_name: string; last_name: string; username: string }>(userId, '/api/v1/teacher/me');
  return {
    name: data.name || `${data.first_name} ${data.last_name}`,
    id: data.username,
    email: undefined
  };
}

/**
 * Get teacher's classes/sections
 */
export async function getSections(userId: string): Promise<PowerSchoolSection[]> {
  const data = await apiRequest<{ classes: any[]; count: number }>(
    userId,
    '/api/v1/teacher/classes'
  );
  // Map API response to our interface
  return data.classes.map(cls => ({
    id: cls.id,
    name: cls.name || cls.course_name,
    course_name: cls.course_name,
    course_number: cls.section_number,
    period: cls.period,
    room: undefined,
    term: cls.term
  }));
}

/**
 * Get assignment categories
 */
export async function getCategories(userId: string): Promise<PowerSchoolCategory[]> {
  const data = await apiRequest<{ categories: PowerSchoolCategory[]; count: number }>(
    userId,
    '/api/v1/teacher/categories'
  );
  return data.categories;
}

export interface PowerSchoolTerm {
  name: string;
  is_current: boolean;
}

export interface PowerSchoolTermsResponse {
  count: number;
  current_term: string;
  store_codes: string[];
  terms: PowerSchoolTerm[];
}

/**
 * Get available terms from PowerSchool
 */
export async function getTerms(userId: string): Promise<PowerSchoolTermsResponse> {
  return apiRequest<PowerSchoolTermsResponse>(
    userId,
    '/api/v1/teacher/terms'
  );
}

/**
 * Get students in a section
 */
export async function getSectionStudents(
  userId: string,
  sectionId: number
): Promise<PowerSchoolStudent[]> {
  const data = await apiRequest<{ students: any[]; count: number }>(
    userId,
    `/api/v1/teacher/classes/${sectionId}/students`
  );
  // Map API response to our interface
  return data.students.map(s => ({
    id: s.id,
    dcid: s.id,
    student_number: s.student_number,
    first_name: s.first_name,
    last_name: s.last_name,
    name: s.name || `${s.last_name}, ${s.first_name}`,
    email: undefined, // API doesn't return email directly
    grade_level: s.grade_level
  }));
}

/**
 * Create an assignment in PowerSchool
 */
export async function createAssignment(
  userId: string,
  sectionId: number,
  assignment: {
    name: string;
    description?: string;
    due_date: string;
    points: number;
    category_id: number;
    term?: string;
  }
): Promise<{ success: boolean; assignment: any; assignment_id?: number }> {
  return apiRequest(userId, `/api/v1/teacher/classes/${sectionId}/assignments`, {
    method: 'POST',
    body: JSON.stringify(assignment)
  });
}

/**
 * Get assignments for a section
 */
export async function getAssignments(
  userId: string,
  sectionId: number,
  term?: string
): Promise<any[]> {
  const url = term 
    ? `/api/v1/teacher/classes/${sectionId}/assignments?term=${term}`
    : `/api/v1/teacher/classes/${sectionId}/assignments`;
  const data = await apiRequest<{ assignments: any[]; count: number }>(userId, url);
  return data.assignments;
}

/**
 * Get assignments trying multiple terms
 */
export async function getAssignmentsAllTerms(
  userId: string,
  sectionId: number
): Promise<any[]> {
  // Try all common terms - include all store_codes from PowerSchool API
  const terms = ['Q3', 'Q2', 'Q1', 'Q4', 'S1', 'S2', 'E1', 'E2'];
  
  // Collect all assignments from all terms
  const allAssignments: any[] = [];
  const seenIds = new Set<number>();
  
  for (const term of terms) {
    try {
      const assignments = await getAssignments(userId, sectionId, term);
      for (const a of assignments) {
        if (!seenIds.has(a.id)) {
          seenIds.add(a.id);
          allAssignments.push(a);
        }
      }
    } catch (e) {
      // Continue to next term
    }
  }
  
  return allAssignments;
}

/**
 * Update a single score
 */
export async function updateScore(
  userId: string,
  params: {
    student_id: number;
    assignment_id: number;
    section_id: number;
    score: number | null;
    comment?: string;
    is_late?: boolean;
    is_missing?: boolean;
    is_exempt?: boolean;
  }
): Promise<{ success: boolean; score: any }> {
  return apiRequest(userId, '/api/v1/teacher/scores', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

/**
 * Update multiple scores at once
 */
export async function updateScoresBatch(
  userId: string,
  params: {
    section_id: number;
    assignment_id: number;
    scores: Array<{
      student_id: number;
      score: number | null;
      comment?: string;
    }>;
  }
): Promise<{ success: boolean; results: any[] }> {
  return apiRequest(userId, '/api/v1/teacher/scores/batch', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

/**
 * Release grades to PowerSchool for a test
 * Creates assignment if not exists and posts all graded scores
 */
export async function releaseGradesToPowerSchool(
  userId: string,
  testId: string,
  classId: string,
  options: {
    assignmentName?: string;
    categoryId?: number;
    dueDate?: string;
    term?: string; // Term/grading period for the assignment (e.g., "Q1", "Q2", "S1")
    submissionIds?: string[]; // Optional: specific submissions to release
    forceRerelease?: boolean; // If true, re-release even if already released
    markMissing?: boolean; // If true, mark non-submitted students as missing with 0
  } = {}
): Promise<{
  success: boolean;
  released: number;
  failed: number;
  markedMissing?: number;
  errors: string[];
  assignmentId?: number;
  totalAttempted: number;
  unmatchedStudents?: Array<{
    studentId: string;
    studentName: string;
    studentEmail: string;
  }>;
  psStudents?: Array<{
    id: number;
    name: string;
    first_name: string;
    last_name: string;
  }>;
}> {
  const errors: string[] = [];
  let released = 0;
  let failed = 0;

  // Get class mapping
  const mapping = await prisma.powerSchoolClassMapping.findUnique({
    where: { classId },
    include: { class: true }
  });

  if (!mapping) {
    throw new Error('Class is not linked to PowerSchool. Please set up the connection first.');
  }

  // Get test info
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { id: true, title: true, totalPoints: true }
  });

  if (!test) {
    throw new Error('Test not found');
  }

  // Get submissions to release
  // Include submissions that failed before (success=false) or haven't been released
  // Or include all if forceRerelease is true
  const whereClause: any = {
    testId,
    status: 'GRADED'
  };

  if (!options.forceRerelease) {
    whereClause.OR = [
      { powerSchoolRelease: null },
      { powerSchoolRelease: { success: false } }
    ];
  }

  if (options.submissionIds?.length) {
    whereClause.id = { in: options.submissionIds };
  }

  const submissions = await prisma.testSubmission.findMany({
    where: whereClause,
    include: {
      student: { select: { id: true, email: true, name: true } },
      powerSchoolRelease: true
    }
  });

  if (submissions.length === 0) {
    return { success: true, released: 0, failed: 0, errors: ['No graded submissions to release.'], totalAttempted: 0 };
  }

  // Delete any existing release records for submissions we're about to re-release
  const existingReleaseIds = submissions
    .filter(s => s.powerSchoolRelease)
    .map(s => s.powerSchoolRelease!.id);
  
  if (existingReleaseIds.length > 0) {
    await prisma.powerSchoolGradeRelease.deleteMany({
      where: { id: { in: existingReleaseIds } }
    });
  }

  // Get saved student mappings for this class
  const savedMappings = await prisma.powerSchoolStudentMapping.findMany({
    where: { classId }
  });
  const studentIdToPsId = new Map<string, number>();
  for (const m of savedMappings) {
    studentIdToPsId.set(m.studentId, m.psStudentId);
  }

  // Get students from PowerSchool section
  const psStudents = await getSectionStudents(userId, mapping.sectionId);
  const psStudentById = new Map<number, PowerSchoolStudent>();
  for (const s of psStudents) {
    psStudentById.set(s.id, s);
    if (s.dcid) psStudentById.set(s.dcid, s);
  }

  // Create name-based mappings for matching students
  // PowerSchool returns names as "LastName, FirstName"
  const nameToStudent = new Map<string, PowerSchoolStudent>();
  const normalizedNameToStudent = new Map<string, PowerSchoolStudent>();
  
  for (const student of psStudents) {
    // Store by exact name
    if (student.name) {
      nameToStudent.set(student.name.toLowerCase(), student);
    }
    
    // Also store by normalized "first last" format for flexible matching
    const normalizedName = `${student.first_name} ${student.last_name}`.toLowerCase().trim();
    normalizedNameToStudent.set(normalizedName, student);;
    
    // Also store by "last, first" format
    const lastFirstName = `${student.last_name}, ${student.first_name}`.toLowerCase().trim();
    normalizedNameToStudent.set(lastFirstName, student);
  }

  // Common nickname mappings
  const nicknameMap: Record<string, string[]> = {
    'nick': ['nicolas', 'nicholas', 'nico'],
    'nicolas': ['nick', 'nico'],
    'nicholas': ['nick', 'nico'],
    'mike': ['michael', 'mikey'],
    'michael': ['mike', 'mikey'],
    'will': ['william', 'bill', 'billy'],
    'william': ['will', 'bill', 'billy'],
    'bill': ['william', 'will', 'billy'],
    'bob': ['robert', 'rob', 'bobby'],
    'robert': ['bob', 'rob', 'bobby'],
    'jim': ['james', 'jimmy'],
    'james': ['jim', 'jimmy'],
    'tom': ['thomas', 'tommy'],
    'thomas': ['tom', 'tommy'],
    'dan': ['daniel', 'danny'],
    'daniel': ['dan', 'danny'],
    'matt': ['matthew', 'matty'],
    'matthew': ['matt', 'matty'],
    'chris': ['christopher', 'kristopher'],
    'christopher': ['chris'],
    'alex': ['alexander', 'alexandra', 'alexis'],
    'alexander': ['alex'],
    'sam': ['samuel', 'samantha'],
    'samuel': ['sam'],
    'samantha': ['sam'],
    'tony': ['anthony'],
    'anthony': ['tony'],
    'joe': ['joseph', 'joey'],
    'joseph': ['joe', 'joey'],
    'kate': ['katherine', 'kathryn', 'katie'],
    'katherine': ['kate', 'katie', 'kathy'],
    'liz': ['elizabeth', 'lizzy', 'beth'],
    'elizabeth': ['liz', 'lizzy', 'beth'],
    'jen': ['jennifer', 'jenny'],
    'jennifer': ['jen', 'jenny'],
    'tim': ['timothy', 'timmy'],
    'timothy': ['tim', 'timmy'],
    'steve': ['steven', 'stephen'],
    'steven': ['steve'],
    'stephen': ['steve'],
    'dave': ['david'],
    'david': ['dave'],
    'jack': ['jackson', 'john'],
    'jackson': ['jack'],
    'ryan': ['ry'],
    'kyle': ['ky'],
    'kevin': ['kev'],
    'marcus': ['marc', 'mark'],
    'veronica': ['ronnie', 'vee'],
    'mikayla': ['mika', 'kayla'],
    'aubrey': ['aub'],
    'kieran': ['kier'],
    'rocco': ['rock'],
    'callum': ['cal'],
    'lucas': ['luke', 'luca'],
    'liam': ['lee'],
    'dylan': ['dyl'],
  };

  // Helper: calculate similarity between two strings (0-1)
  function stringSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;
    
    // Check if one contains the other
    if (a.includes(b) || b.includes(a)) {
      return 0.8;
    }
    
    // Calculate Levenshtein distance ratio
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b[i - 1] === a[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    const distance = matrix[b.length][a.length];
    return 1 - distance / Math.max(a.length, b.length);
  }

  // Helper: check if names match (including nicknames)
  function namesMatch(name1: string, name2: string): boolean {
    const n1 = name1.toLowerCase().trim();
    const n2 = name2.toLowerCase().trim();
    
    // Exact match
    if (n1 === n2) return true;
    
    // One contains the other
    if (n1.includes(n2) || n2.includes(n1)) return true;
    
    // Check nickname mappings
    const n1Nicknames = nicknameMap[n1] || [];
    const n2Nicknames = nicknameMap[n2] || [];
    
    if (n1Nicknames.includes(n2) || n2Nicknames.includes(n1)) return true;
    
    // High similarity (handles typos)
    if (stringSimilarity(n1, n2) > 0.8) return true;
    
    return false;
  }

  // Helper function to find a PS student by Checkmate student
  function findPsStudent(checkmateStudent: { id: string; name: string | null; email: string }): PowerSchoolStudent | null {
    // First check saved mappings
    const savedPsId = studentIdToPsId.get(checkmateStudent.id);
    if (savedPsId && psStudentById.has(savedPsId)) {
      return psStudentById.get(savedPsId)!;
    }
    
    // Try to match by email prefix (part before @)
    const emailPrefix = checkmateStudent.email.split('@')[0].toLowerCase();
    
    // Check if email prefix matches "firstname.lastname" or "firstnamelastname" pattern
    for (const student of psStudents) {
      const firstName = student.first_name?.toLowerCase() || '';
      const lastName = student.last_name?.toLowerCase() || '';
      
      // Common email patterns
      const patterns = [
        `${firstName}.${lastName}`,
        `${firstName}${lastName}`,
        `${firstName[0]}${lastName}`,
        `${lastName}.${firstName}`,
        `${lastName}${firstName}`,
      ].filter(p => p.length > 2);
      
      if (patterns.some(p => emailPrefix === p || emailPrefix.startsWith(p))) {
        return student;
      }
    }
    
    if (!checkmateStudent.name) return null;
    
    const name = checkmateStudent.name.toLowerCase().trim();
    
    // Try exact match first
    if (nameToStudent.has(name)) {
      return nameToStudent.get(name)!;
    }
    
    // Try normalized match
    if (normalizedNameToStudent.has(name)) {
      return normalizedNameToStudent.get(name)!;
    }
    
    // Parse name parts from Checkmate student
    const nameParts = name.split(/[\s,]+/).filter(p => p.length > 1);
    
    // Score each PS student and find best match
    let bestMatch: PowerSchoolStudent | null = null;
    let bestScore = 0;
    
    for (const student of psStudents) {
      const firstName = student.first_name?.toLowerCase() || '';
      const lastName = student.last_name?.toLowerCase() || '';
      const fullName = `${firstName} ${lastName}`;
      
      let score = 0;
      
      // Check each name part against PS student
      for (const part of nameParts) {
        if (namesMatch(part, firstName)) {
          score += 2; // First name match is important
        } else if (namesMatch(part, lastName)) {
          score += 2; // Last name match is important
        } else if (fullName.includes(part)) {
          score += 1; // Partial match in full name
        }
      }
      
      // Also check if PS name parts match Checkmate name
      if (firstName && name.includes(firstName)) score += 1;
      if (lastName && name.includes(lastName)) score += 1;
      
      // Also try matching email prefix to name
      if (emailPrefix.includes(firstName) || emailPrefix.includes(lastName)) {
        score += 1;
      }
      
      // Require minimum score (at least one strong match)
      if (score > bestScore && score >= 2) {
        bestScore = score;
        bestMatch = student;
      }
    }
    
    return bestMatch;
  }

  // Check if we have any students in the PowerSchool section
  if (psStudents.length === 0) {
    throw new Error(`No students found in the selected PowerSchool section. Please verify you selected the correct class.`);
  }

  // Create or find assignment in PowerSchool
  const assignmentName = options.assignmentName || test.title;
  const dueDate = options.dueDate || new Date().toISOString().split('T')[0];
  const categoryId = options.categoryId;

  if (!categoryId) {
    throw new Error('Category is required when releasing grades to PowerSchool');
  }

  // Check if assignment already exists - try multiple terms
  let existingAssignments: any[] = [];
  try {
    existingAssignments = await getAssignmentsAllTerms(userId, mapping.sectionId);
  } catch (e) {
    throw new Error(`Failed to fetch assignments from PowerSchool. The selected class may not be accessible.`);
  }
  
  let psAssignment = existingAssignments.find(a => 
    a.name === assignmentName || a.description?.includes(`Checkmate Test: ${testId}`)
  );

  let psAssignmentId: number;

  if (psAssignment) {
    psAssignmentId = psAssignment.id;
  } else {
    // Create new assignment
    const totalPoints = test.totalPoints || submissions[0].totalPoints || 100;
    
    const createResult = await createAssignment(userId, mapping.sectionId, {
      name: assignmentName,
      description: `Checkmate Test: ${testId}`,
      due_date: dueDate,
      points: totalPoints,
      category_id: categoryId,
      term: options.term
    });

    if (!createResult.success) {
      throw new Error('Failed to create assignment in PowerSchool');
    }

    // API now returns assignment_id directly - check multiple possible locations
    if (createResult.assignment_id) {
      psAssignmentId = createResult.assignment_id;
    } else if (createResult.assignment?.id) {
      psAssignmentId = createResult.assignment.id;
    } else if (typeof createResult.assignment === 'number') {
      psAssignmentId = createResult.assignment;
    } else {
      // Fallback: fetch assignments to find the new one
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit longer for PowerSchool to sync
      
      // First try the specific term if provided
      let updatedAssignments: any[] = [];
      if (options.term) {
        try {
          updatedAssignments = await getAssignments(userId, mapping.sectionId, options.term);
        } catch (e) {
          console.warn('Failed to get assignments for specific term:', options.term);
        }
      }
      
      // Fall back to searching all terms if not found
      if (updatedAssignments.length === 0) {
        updatedAssignments = await getAssignmentsAllTerms(userId, mapping.sectionId);
      }
      
      psAssignment = updatedAssignments.find(a => 
        a.name === assignmentName || a.description?.includes(`Checkmate Test: ${testId}`)
      );
      
      if (!psAssignment) {
        // Log what we got for debugging
        console.error('Could not find assignment. Create result:', JSON.stringify(createResult));
        console.error('Assignments found:', updatedAssignments.map(a => ({ id: a.id, name: a.name })));
        throw new Error('Assignment was created but could not be found. Please try again.');
      }
      
      psAssignmentId = psAssignment.id;
    }
  }

  // Post scores for each submission
  const scoreUpdates: Array<{
    student_id: number;
    score: number | null;
    comment?: string;
  }> = [];

  const studentSubmissions = new Map<number, typeof submissions[0]>();
  const unmatchedStudentsList: Array<{
    studentId: string;
    studentName: string;
    studentEmail: string;
  }> = [];

  for (const submission of submissions) {
    const psStudent = findPsStudent(submission.student);

    if (!psStudent) {
      const studentName = submission.student.name || submission.student.email;
      unmatchedStudentsList.push({
        studentId: submission.student.id,
        studentName: studentName,
        studentEmail: submission.student.email
      });
      errors.push(`"${studentName}" not found in PowerSchool class`);
      failed++;
      continue;
    }

    const studentId = psStudent.dcid || psStudent.id;
    studentSubmissions.set(studentId, submission);

    // Calculate percentage score including bonus points
    // PowerSchool expects percentage (0-100) for PERCENT score type
    // Round to whole number and cap at 100%
    let scorePercent: number | null = null;
    if (submission.score !== null && submission.totalPoints) {
      const totalScore = submission.score + (submission.bonusPoints || 0);
      scorePercent = Math.round((totalScore / submission.totalPoints) * 100); // Round to whole number
      // Cap at 100% for PowerSchool
      scorePercent = Math.min(scorePercent, 100);
    } else if (submission.percentage !== null && submission.percentage !== undefined) {
      // Add bonus points to percentage if available
      const bonusPercent = submission.totalPoints 
        ? ((submission.bonusPoints || 0) / submission.totalPoints) * 100 
        : 0;
      scorePercent = Math.round(submission.percentage + bonusPercent); // Round to whole number
      // Cap at 100% for PowerSchool
      scorePercent = Math.min(scorePercent, 100);
    }

    scoreUpdates.push({
      student_id: studentId,
      score: scorePercent,
      comment: submission.feedback ? `Checkmate: ${submission.feedback.substring(0, 200)}` : undefined
    });
  }

  // Batch update scores
  if (scoreUpdates.length > 0) {
    try {
      const batchResult = await updateScoresBatch(userId, {
        section_id: mapping.sectionId,
        assignment_id: psAssignmentId,
        scores: scoreUpdates
      });

      if (batchResult.success) {
        // Record successful releases
        for (const scoreUpdate of scoreUpdates) {
          const submission = studentSubmissions.get(scoreUpdate.student_id);
          if (submission) {
            try {
              await prisma.powerSchoolGradeRelease.create({
                data: {
                  submissionId: submission.id,
                  testId: testId,
                  studentEmail: submission.student.email,
                  psStudentId: scoreUpdate.student_id,
                  psAssignmentId: psAssignmentId,
                  sectionId: mapping.sectionId,
                  categoryId: categoryId,
                  score: submission.score || 0,
                  totalPoints: submission.totalPoints || 100,
                  releasedBy: userId,
                  success: true
                }
              });
              released++;
            } catch (e) {
              // Might already exist
              released++;
            }
          }
        }
      }
    } catch (error) {
      // Try individual updates as fallback
      for (const scoreUpdate of scoreUpdates) {
        const submission = studentSubmissions.get(scoreUpdate.student_id);
        if (!submission) continue;

        try {
          await updateScore(userId, {
            student_id: scoreUpdate.student_id,
            assignment_id: psAssignmentId,
            section_id: mapping.sectionId,
            score: scoreUpdate.score,
            comment: scoreUpdate.comment
          });

          await prisma.powerSchoolGradeRelease.create({
            data: {
              submissionId: submission.id,
              testId: testId,
              studentEmail: submission.student.email,
              psStudentId: scoreUpdate.student_id,
              psAssignmentId: psAssignmentId,
              sectionId: mapping.sectionId,
              categoryId: categoryId,
              score: submission.score || 0,
              totalPoints: submission.totalPoints || 100,
              releasedBy: userId,
              success: true
            }
          });
          released++;
        } catch (e) {
          errors.push(`Failed to update score for ${submission.student.email}: ${e instanceof Error ? e.message : 'Unknown error'}`);
          
          // Record failed release
          await prisma.powerSchoolGradeRelease.create({
            data: {
              submissionId: submission.id,
              testId: testId,
              studentEmail: submission.student.email,
              sectionId: mapping.sectionId,
              score: submission.score || 0,
              totalPoints: submission.totalPoints || 100,
              releasedBy: userId,
              success: false,
              error: e instanceof Error ? e.message : 'Unknown error'
            }
          }).catch(() => {});
          
          failed++;
        }
      }
    }
  }

  // Add helpful summary error if many students weren't matched
  if (unmatchedStudentsList.length > 0 && unmatchedStudentsList.length === submissions.length) {
    errors.unshift(`⚠️ None of the ${submissions.length} students could be matched. Please map students manually.`);
  } else if (unmatchedStudentsList.length > submissions.length / 2) {
    errors.unshift(`⚠️ ${unmatchedStudentsList.length} of ${submissions.length} students couldn't be matched. Please map students manually.`);
  }

  // Mark missing students if option is enabled
  // This looks at PowerSchool roster and marks anyone we didn't just send a grade for
  let markedMissing = 0;
  if (options.markMissing && psAssignmentId) {
    // Get all students from PowerSchool section (already fetched as psStudents)
    // Find which PS students we DIDN'T send grades for
    const gradedPsStudentIds = new Set(scoreUpdates.map(s => s.student_id));
    
    // Find PS students who weren't graded
    const missingScores: Array<{ student_id: number; score: number; is_missing: boolean }> = [];
    
    for (const psStudent of psStudents) {
      const psStudentId = psStudent.dcid || psStudent.id;
      
      // Skip if we already sent a grade for this student
      if (gradedPsStudentIds.has(psStudentId)) continue;
      
      missingScores.push({
        student_id: psStudentId,
        score: 0,
        is_missing: true
      });
    }

    // Submit missing scores
    if (missingScores.length > 0) {
      try {
        await updateScoresBatch(userId, {
          section_id: mapping.sectionId,
          assignment_id: psAssignmentId,
          scores: missingScores
        });
        markedMissing = missingScores.length;
      } catch (e) {
        // Try individual updates
        for (const ms of missingScores) {
          try {
            await updateScore(userId, {
              student_id: ms.student_id,
              assignment_id: psAssignmentId,
              section_id: mapping.sectionId,
              score: 0,
              is_missing: true
            });
            markedMissing++;
          } catch {
            // Ignore individual failures for missing
          }
        }
      }
    }
  }

  return {
    success: failed === 0 && released > 0,
    released,
    failed,
    markedMissing,
    errors,
    assignmentId: psAssignmentId,
    totalAttempted: submissions.length,
    unmatchedStudents: unmatchedStudentsList.length > 0 ? unmatchedStudentsList : undefined,
    psStudents: unmatchedStudentsList.length > 0 ? psStudents.map(s => ({
      id: s.dcid || s.id,
      name: s.name || `${s.last_name}, ${s.first_name}`,
      first_name: s.first_name,
      last_name: s.last_name
    })) : undefined
  };
}

/**
 * Check if user has PowerSchool connected
 */
export async function isConnected(userId: string): Promise<boolean> {
  const token = await prisma.powerSchoolToken.findUnique({
    where: { userId }
  });
  return !!token;
}

/**
 * Disconnect PowerSchool
 */
export async function disconnect(userId: string): Promise<void> {
  await prisma.powerSchoolToken.delete({
    where: { userId }
  }).catch(() => {});
}

/**
 * Get connection status and info
 */
export async function getConnectionStatus(userId: string): Promise<{
  connected: boolean;
  teacherName?: string;
  teacherId?: string;
  districtUrl?: string;
  expiresAt?: Date;
}> {
  const token = await prisma.powerSchoolToken.findUnique({
    where: { userId }
  });

  if (!token) {
    return { connected: false };
  }

  return {
    connected: true,
    teacherName: token.teacherName || undefined,
    teacherId: token.teacherId || undefined,
    districtUrl: token.districtUrl || undefined,
    expiresAt: token.expiresAt
  };
}

/**
 * Get PowerSchool students for a class (for manual mapping)
 */
export async function getPowerSchoolStudentsForMapping(
  userId: string,
  classId: string
): Promise<{
  psStudents: Array<{
    id: number;
    name: string;
    first_name: string;
    last_name: string;
  }>;
  checkmateStudents: Array<{
    id: string;
    name: string | null;
    email: string;
    mappedPsId?: number;
    mappedPsName?: string;
  }>;
}> {
  // Get class mapping
  const mapping = await prisma.powerSchoolClassMapping.findUnique({
    where: { classId }
  });

  if (!mapping) {
    throw new Error('Class is not linked to PowerSchool');
  }

  // Get PowerSchool students
  const psStudents = await getSectionStudents(userId, mapping.sectionId);

  // Get Checkmate students in this class
  const classMembers = await prisma.classMember.findMany({
    where: { classId, role: 'STUDENT' },
    include: { user: { select: { id: true, name: true, email: true } } }
  });

  // Get existing mappings
  const existingMappings = await prisma.powerSchoolStudentMapping.findMany({
    where: { classId }
  });
  const mappingsByStudentId = new Map<string, typeof existingMappings[0]>();
  for (const m of existingMappings) {
    mappingsByStudentId.set(m.studentId, m);
  }

  // Build PS student lookup
  const psStudentById = new Map<number, typeof psStudents[0]>();
  for (const s of psStudents) {
    psStudentById.set(s.id, s);
    if (s.dcid) psStudentById.set(s.dcid, s);
  }

  return {
    psStudents: psStudents.map(s => ({
      id: s.dcid || s.id,
      name: s.name || `${s.last_name}, ${s.first_name}`,
      first_name: s.first_name,
      last_name: s.last_name
    })),
    checkmateStudents: classMembers.map(m => {
      const existingMapping = mappingsByStudentId.get(m.user.id);
      const psStudent = existingMapping ? psStudentById.get(existingMapping.psStudentId) : null;
      return {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        mappedPsId: existingMapping?.psStudentId,
        mappedPsName: psStudent ? (psStudent.name || `${psStudent.last_name}, ${psStudent.first_name}`) : existingMapping?.psStudentName || undefined
      };
    })
  };
}

/**
 * Save student mappings
 */
export async function saveStudentMappings(
  userId: string,
  classId: string,
  mappings: Array<{ studentId: string; psStudentId: number; psStudentName?: string }>
): Promise<{ saved: number }> {
  let saved = 0;
  
  for (const mapping of mappings) {
    await prisma.powerSchoolStudentMapping.upsert({
      where: {
        classId_studentId: {
          classId,
          studentId: mapping.studentId
        }
      },
      create: {
        classId,
        studentId: mapping.studentId,
        psStudentId: mapping.psStudentId,
        psStudentName: mapping.psStudentName,
        createdBy: userId
      },
      update: {
        psStudentId: mapping.psStudentId,
        psStudentName: mapping.psStudentName
      }
    });
    saved++;
  }

  return { saved };
}

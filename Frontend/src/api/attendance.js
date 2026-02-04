/**
 * Attendance API: video upload (face detection + clustering) and student registration (name, roll no).
 */
const API_BASE = import.meta.env.VITE_ATTENDANCE_API || '';

export async function uploadVideoForAttendance(file, classId) {
  const formData = new FormData();
  formData.append('video', file);
  formData.append('classId', classId || '');

  const response = await fetch(`${API_BASE}/api/upload-video`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || 'Upload failed');
  }

  return response.json();
}

export async function registerStudents(classId, videoId, students) {
  const response = await fetch(`${API_BASE}/api/register-students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      classId,
      video_id: videoId,
      students: students.map((s) => ({
        cluster_id: s.cluster_id,
        name: s.name,
        roll_no: s.roll_no,
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || 'Save failed');
  }

  return response.json();
}

export async function getRegistrations(classId, videoId) {
  const res = await fetch(
    `${API_BASE}/api/registrations/${encodeURIComponent(classId)}/${encodeURIComponent(videoId)}`
  );
  if (!res.ok) return { students: [] };
  return res.json();
}

export function getVideoUrl(videoId) {
  if (!videoId) return null;
  return `${API_BASE}/api/video/${encodeURIComponent(videoId)}`;
}

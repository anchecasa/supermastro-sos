export type AppointmentColor = "orange" | "green" | "blue" | "purple";
export type AppointmentSource = "manual" | "voice" | "google";
export type AppointmentStatus = "scheduled" | "completed" | "cancelled";
export type VoiceRole = "user" | "assistant";
export type ActionType = "appointment" | "contact" | "task" | "query";

export type AssistantAppointment = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  location: string | null;
  contact_name: string | null;
  starts_at: string;
  ends_at: string;
  color: AppointmentColor;
  source: AppointmentSource;
  status: AppointmentStatus;
  created_at: string;
};

export type AssistantContact = {
  id: string;
  full_name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
};

export type AssistantVoiceLog = {
  id: string;
  role: VoiceRole;
  content: string;
  action_type: ActionType | null;
  created_at: string;
};

export type CreateAppointmentInput = {
  title: string;
  description?: string;
  location?: string;
  contact_name?: string;
  starts_at: string;
  ends_at: string;
  color?: AppointmentColor;
  source?: AppointmentSource;
};

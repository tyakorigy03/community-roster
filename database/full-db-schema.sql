-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  profile_photo_url text,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  date_of_birth date NOT NULL,
  phone_number character varying NOT NULL,
  email character varying,
  address_line text NOT NULL,
  city character varying,
  state character varying,
  postcode character varying,
  ndis_number character varying NOT NULL UNIQUE,
  diagnosis text,
  ndis_plan_document_id uuid,
  goals_summary text,
  doctor_name character varying,
  doctor_phone character varying,
  doctor_email character varying,
  next_of_kin_name character varying,
  next_of_kin_phone character varying,
  next_of_kin_relationship character varying,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clients_pkey PRIMARY KEY (id),
  CONSTRAINT fk_ndis_plan_document FOREIGN KEY (ndis_plan_document_id) REFERENCES public.documents(id)
);
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  owner_type text DEFAULT 'client'::text,
  owner_id uuid,
  document_type text NOT NULL,
  file_url text NOT NULL,
  expiry_date date,
  is_expired boolean NOT NULL DEFAULT false,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  document_name text,
  CONSTRAINT documents_pkey PRIMARY KEY (id)
);
CREATE TABLE public.emergency_assistance_types (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  CONSTRAINT emergency_assistance_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.government_report_emails (
  id integer NOT NULL DEFAULT nextval('government_report_emails_id_seq'::regclass),
  department_name character varying NOT NULL,
  email_address character varying NOT NULL,
  report_type character varying,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT government_report_emails_pkey PRIMARY KEY (id)
);
CREATE TABLE public.hierarchy (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  code character varying,
  description text,
  parent_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT hierarchy_pkey PRIMARY KEY (id),
  CONSTRAINT fk_hierarchy_parent FOREIGN KEY (parent_id) REFERENCES public.hierarchy(id)
);
CREATE TABLE public.incident_attachments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  incident_id uuid NOT NULL,
  file_name character varying NOT NULL,
  file_url text NOT NULL,
  file_type character varying,
  file_size integer,
  uploaded_by integer,
  uploaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT incident_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT fk_incident_attachment_incident FOREIGN KEY (incident_id) REFERENCES public.incidents(id),
  CONSTRAINT fk_incident_attachment_uploader FOREIGN KEY (uploaded_by) REFERENCES public.staff(id)
);
CREATE TABLE public.incident_emergency_assistance (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  incident_id uuid NOT NULL,
  assistance_type_id uuid NOT NULL,
  details text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT incident_emergency_assistance_pkey PRIMARY KEY (id),
  CONSTRAINT fk_incident_assistance_incident FOREIGN KEY (incident_id) REFERENCES public.incidents(id),
  CONSTRAINT fk_incident_assistance_type FOREIGN KEY (assistance_type_id) REFERENCES public.emergency_assistance_types(id)
);
CREATE TABLE public.incident_type_relations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  incident_id uuid NOT NULL,
  incident_type_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT incident_type_relations_pkey PRIMARY KEY (id),
  CONSTRAINT fk_incident_type_relation_incident FOREIGN KEY (incident_id) REFERENCES public.incidents(id),
  CONSTRAINT fk_incident_type_relation_type FOREIGN KEY (incident_type_id) REFERENCES public.incident_types(id)
);
CREATE TABLE public.incident_types (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT incident_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.incidents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  event_date date NOT NULL,
  hierarchy_id uuid,
  subject character varying,
  incident_date date NOT NULL,
  incident_time time without time zone,
  location text,
  witnesses text,
  police_event_number character varying,
  incident_summary text,
  antecedent text,
  incident_description text,
  deescalation_outcome text,
  created_by integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  incident_rating text,
  prn_approved text,
  prn_provided text,
  prn_notes text,
  physical_intervention text,
  physical_intervention_type text,
  physical_intervention_duration text,
  client_injured text,
  staff_injured text,
  follow_up_required text,
  management_contacted text,
  updated_by integer,
  CONSTRAINT incidents_pkey PRIMARY KEY (id),
  CONSTRAINT fk_incident_creator FOREIGN KEY (created_by) REFERENCES public.staff(id),
  CONSTRAINT fk_incident_client FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT fk_incident_hierarchy FOREIGN KEY (hierarchy_id) REFERENCES public.hierarchy(id),
  CONSTRAINT incidents_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id)
);
CREATE TABLE public.pay_rates (
  id integer NOT NULL DEFAULT nextval('pay_rates_id_seq'::regclass),
  name character varying NOT NULL,
  description text,
  hourly_rate numeric NOT NULL,
  day_type character varying NOT NULL DEFAULT 'weekday'::character varying,
  custom_date date,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_by integer,
  CONSTRAINT pay_rates_pkey PRIMARY KEY (id),
  CONSTRAINT pay_rates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id)
);
CREATE TABLE public.progress_note_attachments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  progress_note_id uuid NOT NULL,
  file_name character varying NOT NULL,
  file_url text NOT NULL,
  file_type character varying,
  file_size integer,
  uploaded_by integer,
  uploaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT progress_note_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT fk_progress_note_attachment_note FOREIGN KEY (progress_note_id) REFERENCES public.progress_notes(id),
  CONSTRAINT fk_progress_note_attachment_uploader FOREIGN KEY (uploaded_by) REFERENCES public.staff(id)
);
CREATE TABLE public.progress_notes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  shift_id uuid,
  client_id uuid NOT NULL,
  event_date date NOT NULL,
  hierarchy_id uuid,
  subject character varying,
  shift_date date,
  shift_start_time time without time zone,
  shift_end_time time without time zone,
  shift_type_id uuid,
  other_shift_type_specification text,
  shift_notes text NOT NULL,
  key_areas jsonb,
  created_by integer,
  is_draft boolean DEFAULT false,
  is_submitted boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by integer,
  CONSTRAINT progress_notes_pkey PRIMARY KEY (id),
  CONSTRAINT fk_progress_note_client FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT fk_progress_note_hierarchy FOREIGN KEY (hierarchy_id) REFERENCES public.hierarchy(id),
  CONSTRAINT fk_progress_note_shift_type FOREIGN KEY (shift_type_id) REFERENCES public.shift_types(id),
  CONSTRAINT fk_progress_note_creator FOREIGN KEY (created_by) REFERENCES public.staff(id),
  CONSTRAINT progress_notes_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id),
  CONSTRAINT progress_notes_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.staff(id)
);
CREATE TABLE public.roster_publications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  start_date date NOT NULL,
  end_date date NOT NULL,
  published_at timestamp with time zone DEFAULT now(),
  published_by uuid,
  emails_sent integer NOT NULL DEFAULT 0,
  total_staff integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roster_publications_pkey PRIMARY KEY (id),
  CONSTRAINT roster_publications_published_by_fkey FOREIGN KEY (published_by) REFERENCES auth.users(id)
);
CREATE TABLE public.settings (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  enabled boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.shift_types (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  requires_specification boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shift_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.shifts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  staff_id integer,
  shift_date date NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  break_minutes integer DEFAULT 0,
  shift_type_id uuid,
  status character varying DEFAULT 'scheduled'::character varying,
  is_active boolean DEFAULT true,
  created_by integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  progress_note_id uuid,
  CONSTRAINT shifts_pkey PRIMARY KEY (id),
  CONSTRAINT fk_shift_client FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT fk_shift_staff FOREIGN KEY (staff_id) REFERENCES public.staff(id),
  CONSTRAINT fk_shift_type FOREIGN KEY (shift_type_id) REFERENCES public.shift_types(id),
  CONSTRAINT fk_shift_creator FOREIGN KEY (created_by) REFERENCES public.staff(id),
  CONSTRAINT fk_shift_progress_note FOREIGN KEY (progress_note_id) REFERENCES public.progress_notes(id)
);
CREATE TABLE public.staff (
  id integer NOT NULL DEFAULT nextval('staff_id_seq'::regclass),
  name character varying NOT NULL,
  dob date NOT NULL,
  phone character varying,
  email character varying UNIQUE,
  address text,
  profile_picture character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  next_of_kin jsonb,
  user_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  role text DEFAULT 'staff'::text,
  CONSTRAINT staff_pkey PRIMARY KEY (id),
  CONSTRAINT staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.staff_documents (
  id integer NOT NULL DEFAULT nextval('staff_documents_id_seq'::regclass),
  staff_id integer NOT NULL,
  document_name character varying NOT NULL,
  file_url character varying NOT NULL,
  expiry_date date,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT staff_documents_pkey PRIMARY KEY (id),
  CONSTRAINT staff_documents_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id)
);
CREATE TABLE public.staff_pay_rates (
  id integer NOT NULL DEFAULT nextval('staff_pay_rates_id_seq'::regclass),
  staff_id integer NOT NULL,
  pay_rate_id integer NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  is_default boolean DEFAULT false,
  priority integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  created_by integer,
  CONSTRAINT staff_pay_rates_pkey PRIMARY KEY (id),
  CONSTRAINT staff_pay_rates_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id),
  CONSTRAINT staff_pay_rates_pay_rate_id_fkey FOREIGN KEY (pay_rate_id) REFERENCES public.pay_rates(id),
  CONSTRAINT staff_pay_rates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff(id)
);
CREATE TABLE public.staff_shifts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  shift_id uuid,
  staff_id integer,
  clock_in_time timestamp with time zone,
  clock_out_time timestamp with time zone,
  clock_in_photo_url text,
  clock_out_photo_url text,
  clock_in_location text,
  clock_out_location text,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  approved boolean DEFAULT false,
  CONSTRAINT staff_shifts_pkey PRIMARY KEY (id),
  CONSTRAINT staff_shifts_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id),
  CONSTRAINT staff_shifts_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id)
);
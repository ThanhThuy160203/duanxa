CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
    CREATE TYPE role_enum AS ENUM ('ADMIN', 'CHU_TICH', 'PCT', 'TRUONG_PHONG', 'NHAN_VIEN', 'TONG_HOP');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status_enum') THEN
    CREATE TYPE user_status_enum AS ENUM ('ACTIVE', 'PENDING', 'DISABLED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status_enum') THEN
    CREATE TYPE task_status_enum AS ENUM ('MOI_NHAN', 'DANG_XU_LY', 'CHO_DUYET', 'HOAN_THANH', 'DA_HUY');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_source_enum') THEN
    CREATE TYPE task_source_enum AS ENUM ('SO_BAN_NGANH', 'UBND_TINH', 'CHU_TICH', 'PHO_CHU_TICH', 'TRUONG_PHONG');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS departments (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT departments_code_format CHECK (code ~ '^[A-Z0-9_]{2,30}$'),
  CONSTRAINT departments_name_length CHECK (char_length(name) BETWEEN 2 AND 150)
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role role_enum NOT NULL,
  status user_status_enum NOT NULL DEFAULT 'ACTIVE',
  department_code TEXT REFERENCES departments(code),
  parent_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_lower CHECK (email = lower(email)),
  CONSTRAINT users_email_format CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT users_name_length CHECK (char_length(full_name) BETWEEN 2 AND 150),
  CONSTRAINT users_department_required_for_staff CHECK (
    role NOT IN ('NHAN_VIEN', 'TRUONG_PHONG') OR department_code IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  assignee_user_id UUID NOT NULL REFERENCES users(id),
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  department_code TEXT NOT NULL REFERENCES departments(code),
  source task_source_enum NOT NULL,
  due_date DATE NOT NULL,
  status task_status_enum NOT NULL DEFAULT 'MOI_NHAN',
  completion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  feedback TEXT,
  evaluation_score NUMERIC(5,2),
  evaluation_comment TEXT,
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tasks_id_format CHECK (id ~ '^[A-Z]{2,4}-[0-9]{3,6}$'),
  CONSTRAINT tasks_title_length CHECK (char_length(title) BETWEEN 3 AND 400),
  CONSTRAINT tasks_completion_rate_range CHECK (completion_rate BETWEEN 0 AND 100),
  CONSTRAINT tasks_eval_score_range CHECK (evaluation_score IS NULL OR evaluation_score BETWEEN 0 AND 100),
  CONSTRAINT tasks_cancelled_reason_required CHECK (
    (status = 'DA_HUY' AND cancelled_reason IS NOT NULL)
    OR (status <> 'DA_HUY' AND cancelled_reason IS NULL)
  ),
  CONSTRAINT tasks_completion_with_status CHECK (
    (status = 'HOAN_THANH' AND completion_rate = 100)
    OR (status <> 'HOAN_THANH')
  )
);

CREATE TABLE IF NOT EXISTS task_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT task_events_action_length CHECK (char_length(action) BETWEEN 3 AND 50)
);

CREATE INDEX IF NOT EXISTS idx_users_department_code ON users(department_code);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_department_code ON tasks(department_code);
CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON task_events(task_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_departments_updated_at ON departments;
CREATE TRIGGER trg_departments_updated_at
BEFORE UPDATE ON departments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

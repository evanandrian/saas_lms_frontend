Create the backend API in `saas_lms_backend` for the Platform Navigation Menu Configuration.
The user wants to store global navigation menus and activity logs. Since it's global, tables must be in the `core` database and end in `_g`.

1. Create a migration in `db/migrations/core/` (e.g. `20231003000000_navigation_menu_g.sql`):
```sql
-- +goose Up
CREATE TABLE navigation_menu_g (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    parent_id UUID REFERENCES navigation_menu_g(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    url VARCHAR(255),
    icon VARCHAR(50),
    menu_type VARCHAR(20) NOT NULL, -- 'group' or 'item'
    position INT NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    target_blank BOOLEAN NOT NULL DEFAULT FALSE,
    allowed_roles JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE activity_log_g (
    id UUID PRIMARY KEY,
    actor_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Seed data for basic menus
INSERT INTO navigation_menu_g (id, code, name, menu_type, icon, position, allowed_roles) VALUES 
('00000000-0000-0000-0000-000000000001', 'main', 'Utama', 'group', 'home', 1, '["Admin Sekolah", "Guru", "Siswa", "Orang tua"]');

-- +goose Down
DROP TABLE activity_log_g;
DROP TABLE navigation_menu_g;
```

2. Create SQLC queries in `db/queries/core/navigation.sql`. We need:
- GetMenus (order by position)
- CreateMenu
- UpdateMenu
- DeleteMenu
- UpdateMenuPosition (to update position)
- InsertActivityLog

3. Run `make sqlc` or `sqlc generate`.

4. Create a basic Go REST API handler in `api/platform/navigation.go` (or similar depending on routing). Make sure it handles CRUD and logs every Create/Update/Delete action to `activity_log_g`. 
NOTE: If it's too complex to wire up the HTTP routes due to missing context on how the router works, just implementing the SQLC queries and a Service struct `NavigationService` that exposes the methods is enough. I will mock the API in the frontend for now if the backend API isn't fully wired, but at least the DB layer and business logic (Service) must be ready.

Please do this in `saas_lms_backend` directory.
